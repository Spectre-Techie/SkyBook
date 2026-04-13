import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/db';
import { BookingStatus, Prisma } from '@prisma/client';
import Stripe from 'stripe';

async function resolveCheckoutMetadata(session: Stripe.Checkout.Session): Promise<{
  bookingId?: string;
  flightId?: string;
  seatNumber?: string;
}> {
  const metadataBookingId = session.metadata?.bookingId;
  const metadataFlightId = session.metadata?.flightId;
  const metadataSeatNumber = session.metadata?.seatNumber;

  if (metadataBookingId && metadataFlightId) {
    return {
      bookingId: metadataBookingId,
      flightId: metadataFlightId,
      seatNumber: metadataSeatNumber,
    };
  }

  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id;

  if (!paymentIntentId) {
    return {
      bookingId: metadataBookingId,
      flightId: metadataFlightId,
      seatNumber: metadataSeatNumber,
    };
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  return {
    bookingId: paymentIntent.metadata?.bookingId ?? metadataBookingId,
    flightId: paymentIntent.metadata?.flightId ?? metadataFlightId,
    seatNumber: paymentIntent.metadata?.seatNumber ?? metadataSeatNumber,
  };
}

async function registerWebhookEvent(
  tx: Prisma.TransactionClient,
  eventId: string,
  type: string,
  bookingId?: string,
): Promise<boolean> {
  try {
    await tx.stripeWebhookEvent.create({
      data: {
        eventId,
        type,
        bookingId,
      },
    });
    return true;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return false;
    }

    throw error;
  }
}

export async function POST(request: NextRequest) {
  const sig = request.headers.get('stripe-signature');
  const body = await request.text();

  if (!sig) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'No signature provided' },
      { status: 401 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('[STRIPE_WEBHOOK_ERROR]', err);
    return NextResponse.json(
      { error: 'BadRequest', message: 'Invalid signature' },
      { status: 400 }
    );
  }

  try {
    // Handle successful payment
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const { bookingId, flightId } = await resolveCheckoutMetadata(session);

      if (!bookingId || !flightId) {
        console.error('[STRIPE_WEBHOOK] Missing metadata', { bookingId, flightId });
        return NextResponse.json(
          { error: 'BadRequest', message: 'Invalid session metadata' },
          { status: 400 }
        );
      }

      const outcome = await prisma.$transaction(async (tx) => {
        const isNewEvent = await registerWebhookEvent(
          tx,
          event.id,
          event.type,
          bookingId,
        );

        if (!isNewEvent) {
          return { kind: 'duplicate' as const };
        }

        const booking = await tx.booking.findUnique({
          where: { id: bookingId },
          select: {
            id: true,
            flightId: true,
            status: true,
            bookingReference: true,
          },
        });

        if (!booking || booking.flightId !== flightId) {
          return { kind: 'invalid-metadata' as const };
        }

        if (booking.status !== BookingStatus.PENDING) {
          return {
            kind: 'already-finalized' as const,
            bookingReference: booking.bookingReference,
          };
        }

        await tx.booking.update({
          where: { id: bookingId },
          data: {
            status: BookingStatus.CONFIRMED,
            paymentCompletedAt: new Date(),
            webhookProcessedAt: new Date(),
            paymentSessionId: session.id ?? undefined,
          },
        });

        await tx.flight.update({
          where: { id: flightId },
          data: {
            bookedSeats: {
              increment: 1,
            },
          },
        });

        return {
          kind: 'confirmed' as const,
          bookingReference: booking.bookingReference,
        };
      });

      if (outcome.kind === 'invalid-metadata') {
        console.error('[STRIPE_WEBHOOK] Booking and flight mismatch', { bookingId, flightId });
        return NextResponse.json(
          { error: 'BadRequest', message: 'Booking metadata mismatch' },
          { status: 400 }
        );
      }

      if (outcome.kind === 'confirmed') {
        console.log(`[STRIPE_WEBHOOK] Booking ${outcome.bookingReference} confirmed`);
      }
    }

    // Handle payment failure
    if (event.type === 'checkout.session.expired') {
      const session = event.data.object as Stripe.Checkout.Session;
      const { bookingId } = await resolveCheckoutMetadata(session);

      if (bookingId) {
        const outcome = await prisma.$transaction(async (tx) => {
          const isNewEvent = await registerWebhookEvent(
            tx,
            event.id,
            event.type,
            bookingId,
          );

          if (!isNewEvent) {
            return { kind: 'duplicate' as const };
          }

          const updated = await tx.booking.updateMany({
            where: {
              id: bookingId,
              status: BookingStatus.PENDING,
            },
            data: {
              status: BookingStatus.CANCELLED,
              cancelReason: 'Payment expired',
              cancelledDate: new Date(),
              webhookProcessedAt: new Date(),
            },
          });

          return {
            kind: updated.count > 0 ? ('cancelled' as const) : ('already-finalized' as const),
          };
        });

        if (outcome.kind === 'cancelled') {
          console.log(`[STRIPE_WEBHOOK] Booking ${bookingId} cancelled (payment expired)`);
        }
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('[STRIPE_WEBHOOK_PROCESSING]', error);
    return NextResponse.json(
      { error: 'ServerError', message: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { BookingStatus, Prisma } from '@prisma/client';
import { stripe } from '@/lib/stripe';
import { readValidatedJson } from '@/lib/http/request';
import { requireAuth } from '@/lib/auth/guards';
import Stripe from 'stripe';
import {
  BOOKING_FLOW_ERROR,
  BookingFlowError,
  assertFlightCanBeBooked,
  assertSeatWithinFlightCapacity,
  assertNoActiveBookingConflicts,
  createBookingWithReferenceRetry,
} from '@/lib/bookings/reservation';
import { prisma } from '@/lib/db';
import { createBookingSchema } from '@/lib/validation/schemas';

const checkoutSchema = createBookingSchema;
const MAX_TRANSACTION_RETRIES = 2;
const TRANSACTION_MAX_WAIT_MS = 5000;
const TRANSACTION_TIMEOUT_MS = 10000;
const RETRY_AFTER_SECONDS = 10;

function isPrismaKnownRequestError(
  error: unknown,
  code?: string,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (code ? error.code === code : true)
  );
}

function isRetryableTransactionError(error: unknown): boolean {
  return (
    isPrismaKnownRequestError(error, 'P2034') ||
    isPrismaKnownRequestError(error, 'P2028')
  );
}

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function cancelPendingBooking(bookingId: string | null) {
  if (!bookingId) {
    return;
  }

  try {
    await prisma.booking.updateMany({
      where: {
        id: bookingId,
        status: BookingStatus.PENDING,
      },
      data: {
        status: BookingStatus.CANCELLED,
        cancelReason: 'Payment initialization failed',
        cancelledDate: new Date(),
      },
    });
  } catch (cancelError) {
    console.error('[CHECKOUT_CANCEL_PENDING_FAILED]', cancelError);
  }
}

function stripeErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return 'Unknown Stripe error';
}

export async function POST(request: NextRequest) {
  // Auth check
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  // Parse request
  const parsed = await readValidatedJson(request, checkoutSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  const { flightId, seatNumber } = parsed.data;
  const normalizedSeatNumber = seatNumber;
  let createdBookingId: string | null = null;

  try {
    let reservation: {
      booking: { id: string };
      flight: {
        id: string;
        flightNumber: string;
        origin: string;
        destination: string;
        pricePerSeat: Prisma.Decimal;
      };
    } | null = null;

    for (let attempt = 0; attempt <= MAX_TRANSACTION_RETRIES; attempt += 1) {
      try {
        reservation = await prisma.$transaction(async (tx) => {
          const flightRecord = await tx.flight.findUnique({
            where: { id: flightId },
            select: {
              id: true,
              flightNumber: true,
              origin: true,
              destination: true,
              departureDateTime: true,
              bookedSeats: true,
              totalSeats: true,
              status: true,
              pricePerSeat: true,
            },
          });

          assertFlightCanBeBooked(flightRecord);
          assertSeatWithinFlightCapacity(flightRecord, normalizedSeatNumber);

          await assertNoActiveBookingConflicts(tx, {
            flightId,
            passengerId: auth.user.id,
            seatNumber: normalizedSeatNumber,
          });

          const pendingBooking = await createBookingWithReferenceRetry(
            tx,
            {
              flightId,
              passengerId: auth.user.id,
              seatNumber: normalizedSeatNumber,
              totalPrice: new Prisma.Decimal(flightRecord.pricePerSeat),
            },
            BookingStatus.PENDING,
          );

          return {
            booking: pendingBooking,
            flight: flightRecord,
          };
        }, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: TRANSACTION_MAX_WAIT_MS,
          timeout: TRANSACTION_TIMEOUT_MS,
        });

        break;
      } catch (txError) {
        if (isRetryableTransactionError(txError) && attempt < MAX_TRANSACTION_RETRIES) {
          const backoffMs = 100 * Math.pow(3, attempt);
          await wait(backoffMs);
          continue;
        }

        throw txError;
      }
    }

    if (!reservation) {
      throw new Error('Unable to reserve seat at this time.');
    }

    const { booking, flight } = reservation;

    createdBookingId = booking.id;

    // Create Stripe payment link. This avoids direct dependency on checkout.stripe.com
    // where some networks may reset TLS connections.
    let paymentLink: Stripe.PaymentLink;
    try {
      paymentLink = await stripe.paymentLinks.create({
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Flight ${flight.flightNumber} - Seat ${normalizedSeatNumber}`,
                description: `${flight.origin} → ${flight.destination}`,
              },
              unit_amount: Math.round(Number(flight.pricePerSeat) * 100),
            },
            quantity: 1,
          },
        ],
        after_completion: {
          type: 'redirect',
          redirect: {
            url: `${process.env.FRONTEND_URL}/booking/${booking.id}`,
          },
        },
        restrictions: {
          completed_sessions: {
            limit: 1,
          },
        },
        payment_intent_data: {
          metadata: {
            bookingId: booking.id,
            flightId,
            seatNumber: normalizedSeatNumber,
          },
        },
      });
    } catch (stripeError) {
      await cancelPendingBooking(createdBookingId);

      console.error('[STRIPE_CHECKOUT_SESSION]', stripeErrorMessage(stripeError));
      return NextResponse.json(
        { error: 'ServerError', message: 'Unable to initialize payment link' },
        { status: 502 }
      );
    }

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        paymentSessionId: paymentLink.id,
      },
    });

    return NextResponse.json(
      {
        sessionId: paymentLink.id,
        sessionUrl: paymentLink.url,
        bookingId: booking.id,
      },
      { status: 200 }
    );
  } catch (error) {
    await cancelPendingBooking(createdBookingId);

    if (error instanceof BookingFlowError) {
      const knownErrors: Record<
        keyof typeof BOOKING_FLOW_ERROR,
        { status: number; message: string }
      > = {
        FLIGHT_NOT_FOUND: { status: 404, message: 'Flight not found.' },
        FLIGHT_NOT_ACTIVE: { status: 409, message: 'Flight is not active.' },
        FLIGHT_ALREADY_DEPARTED: {
          status: 409,
          message: 'Cannot book a departed flight.',
        },
        FLIGHT_FULL: { status: 409, message: 'No seats available for this flight.' },
        SEAT_OUT_OF_RANGE: {
          status: 400,
          message: 'Selected seat does not exist on this aircraft.',
        },
        SEAT_ALREADY_BOOKED: {
          status: 409,
          message: 'This seat is no longer available.',
        },
        PASSENGER_ALREADY_BOOKED: {
          status: 409,
          message: 'You already have an active booking for this flight.',
        },
      };

      const known = knownErrors[error.code];
      if (known) {
        return NextResponse.json(
          { error: 'Conflict', message: known.message },
          { status: known.status }
        );
      }
    }

    if (isPrismaKnownRequestError(error, 'P2002')) {
      return NextResponse.json(
        { error: 'Conflict', message: 'This booking conflicts with an existing reservation.' },
        { status: 409 }
      );
    }

    if (isPrismaKnownRequestError(error, 'P2034')) {
      return NextResponse.json(
        {
          error: 'Conflict',
          message: 'Another booking attempt is in progress. Please retry checkout.',
        },
        { status: 409 }
      );
    }

    if (isPrismaKnownRequestError(error, 'P2028')) {
      return NextResponse.json(
        {
          error: 'ServiceUnavailable',
          message: 'Checkout is temporarily busy. Please retry in a few seconds.',
        },
        {
          status: 503,
          headers: {
            'Retry-After': String(RETRY_AFTER_SECONDS),
          },
        }
      );
    }

    console.error('[STRIPE_CHECKOUT]', error);
    return NextResponse.json(
      { error: 'ServerError', message: 'Payment processing failed' },
      { status: 500 }
    );
  }
}

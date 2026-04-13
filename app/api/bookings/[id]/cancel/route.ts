import { BookingStatus } from "@prisma/client";
import { ZodError } from "zod";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { requireAuth } from "@/lib/auth/guards";
import { serializeBooking } from "@/lib/bookings/serialize";
import { prisma } from "@/lib/db";
import { jsonError, serverError, validationError } from "@/lib/http/responses";
import { cancelBookingSchema } from "@/lib/validation/schemas";

const PASSENGER_CANCEL_WINDOW_HOURS = 24;

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) {
      return auth.response;
    }

    const { id } = await context.params;
    const payload = cancelBookingSchema.parse(
      await request.json().catch(() => ({})),
    );

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        flight: true,
        passenger: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!booking) {
      return jsonError(404, {
        error: "NotFound",
        message: "Booking not found.",
      });
    }

    const isOwner = booking.passengerId === auth.user.id;
    const isAdmin = auth.user.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return jsonError(403, {
        error: "Forbidden",
        message: "You are not allowed to cancel this booking.",
      });
    }

    if (booking.status !== BookingStatus.CONFIRMED) {
      return jsonError(409, {
        error: "Conflict",
        message: "Only confirmed bookings can be cancelled.",
      });
    }

    if (!isAdmin) {
      const cutoff = new Date(
        booking.flight.departureDateTime.getTime() -
          PASSENGER_CANCEL_WINDOW_HOURS * 60 * 60 * 1000,
      );

      if (new Date() > cutoff) {
        return jsonError(409, {
          error: "Conflict",
          message: "Booking cancellation is only allowed up to 24 hours before departure.",
        });
      }
    }

    const cancelReason =
      payload.reason || (isAdmin ? "ADMIN_REQUEST" : "PASSENGER_REQUEST");

    const [updatedBooking] = await prisma.$transaction([
      prisma.booking.update({
        where: { id },
        data: {
          status: BookingStatus.CANCELLED,
          cancelledDate: new Date(),
          cancelReason,
        },
        include: {
          flight: true,
          passenger: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      prisma.flight.update({
        where: { id: booking.flightId },
        data: {
          bookedSeats: {
            decrement: 1,
          },
        },
      }),
    ]);

    return NextResponse.json({
      data: serializeBooking(updatedBooking),
      message: "Booking cancelled successfully.",
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(error);
    }

    return serverError("Failed to cancel booking.");
  }
}

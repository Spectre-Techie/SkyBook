import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { prisma } from "@/lib/db";
import { jsonError, serverError } from "@/lib/http/responses";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ bookingReference: string }> },
): Promise<NextResponse> {
  try {
    const { bookingReference } = await context.params;

    const booking = await prisma.booking.findUnique({
      where: { bookingReference: bookingReference.toUpperCase() },
      include: {
        flight: true,
        passenger: {
          select: {
            fullName: true,
          },
        },
      },
    });

    if (!booking) {
      return jsonError(404, {
        error: "NotFound",
        message: "Ticket not found for this booking reference.",
      });
    }

    return NextResponse.json({
      data: {
        bookingReference: booking.bookingReference,
        passengerName: booking.passenger.fullName,
        seatNumber: booking.seatNumber,
        status: booking.status,
        flight: {
          flightNumber: booking.flight.flightNumber,
          origin: booking.flight.origin,
          destination: booking.flight.destination,
          departureDateTime: booking.flight.departureDateTime,
          arrivalDateTime: booking.flight.arrivalDateTime,
        },
      },
    });
  } catch {
    return serverError("Failed to load ticket.");
  }
}

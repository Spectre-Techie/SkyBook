import { BookingStatus, Prisma } from "@prisma/client";
import { ZodError } from "zod";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { requireAuth, requireRole } from "@/lib/auth/guards";
import { serializeBooking } from "@/lib/bookings/serialize";
import {
  BOOKING_FLOW_ERROR,
  BookingFlowError,
  assertFlightCanBeBooked,
  assertSeatWithinFlightCapacity,
  assertNoActiveBookingConflicts,
  createBookingWithReferenceRetry,
} from "@/lib/bookings/reservation";
import { prisma } from "@/lib/db";
import { jsonError, serverError, validationError } from "@/lib/http/responses";
import { createBookingSchema } from "@/lib/validation/schemas";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) {
      return auth.response;
    }

    const status = request.nextUrl.searchParams.get("status")?.trim().toUpperCase();
    const includeAll = request.nextUrl.searchParams.get("includeAll") === "true";

    const where: Prisma.BookingWhereInput = {};

    if (auth.user.role !== "ADMIN" || !includeAll) {
      where.passengerId = auth.user.id;
    }

    if (status) {
      if (!Object.values(BookingStatus).includes(status as BookingStatus)) {
        return jsonError(400, {
          error: "ValidationError",
          message: "Invalid booking status filter.",
        });
      }
      where.status = status as BookingStatus;
    }

    const bookings = await prisma.booking.findMany({
      where,
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
      orderBy: [{ bookingDate: "desc" }],
    });

    return NextResponse.json({
      data: bookings.map((booking) => serializeBooking(booking)),
      meta: {
        count: bookings.length,
      },
    });
  } catch {
    return serverError("Failed to load bookings.");
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireRole(request, "PASSENGER");
    if (!auth.ok) {
      return auth.response;
    }

    const payload = createBookingSchema.parse(await request.json());

    const bookingId = await prisma.$transaction(async (tx) => {
      const flight = await tx.flight.findUnique({
        where: { id: payload.flightId },
      });

      assertFlightCanBeBooked(flight);
      assertSeatWithinFlightCapacity(flight, payload.seatNumber);

      await assertNoActiveBookingConflicts(tx, {
        flightId: payload.flightId,
        passengerId: auth.user.id,
        seatNumber: payload.seatNumber,
      });

      const created = await createBookingWithReferenceRetry(
        tx,
        {
          flightId: payload.flightId,
          passengerId: auth.user.id,
          seatNumber: payload.seatNumber,
          totalPrice: new Prisma.Decimal(flight.pricePerSeat),
        },
        BookingStatus.CONFIRMED,
      );

      await tx.flight.update({
        where: { id: payload.flightId },
        data: {
          bookedSeats: {
            increment: 1,
          },
        },
      });

      return created.id;
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
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
      return serverError("Failed to load the newly created booking.");
    }

    return NextResponse.json(
      {
        data: serializeBooking(booking),
        message: "Booking created successfully.",
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(error);
    }

    if (error instanceof BookingFlowError) {
      const knownErrors: Record<
        keyof typeof BOOKING_FLOW_ERROR,
        { status: number; message: string }
      > = {
        FLIGHT_NOT_FOUND: { status: 404, message: "Flight not found." },
        FLIGHT_NOT_ACTIVE: { status: 409, message: "Flight is not active." },
        FLIGHT_ALREADY_DEPARTED: {
          status: 409,
          message: "Cannot book a departed flight.",
        },
        FLIGHT_FULL: { status: 409, message: "No seats available for this flight." },
        SEAT_OUT_OF_RANGE: {
          status: 400,
          message: "Selected seat does not exist on this aircraft.",
        },
        SEAT_ALREADY_BOOKED: {
          status: 409,
          message: "Selected seat is already booked.",
        },
        PASSENGER_ALREADY_BOOKED: {
          status: 409,
          message: "You already have an active booking for this flight.",
        },
      };

      const known = knownErrors[error.code];
      if (known) {
        return jsonError(known.status, {
          error: "Conflict",
          message: known.message,
        });
      }
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return jsonError(409, {
        error: "Conflict",
        message: "This booking conflicts with an existing reservation.",
      });
    }

    return serverError("Failed to create booking.");
  }
}

import { BookingStatus, FlightStatus, Prisma } from "@prisma/client";
import { ZodError, z } from "zod";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { serializeFlight } from "@/lib/flights/serialize";
import { jsonError, serverError, validationError } from "@/lib/http/responses";
import { updateFlightSchema } from "@/lib/validation/schemas";

function canUpdateCoreFlightFields(input: z.infer<typeof updateFlightSchema>): boolean {
  return (
    input.flightNumber !== undefined ||
    input.origin !== undefined ||
    input.destination !== undefined ||
    input.departureDateTime !== undefined ||
    input.arrivalDateTime !== undefined
  );
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    const flight = await prisma.flight.findUnique({
      where: { id },
    });

    if (!flight) {
      return jsonError(404, {
        error: "NotFound",
        message: "Flight not found.",
      });
    }

    return NextResponse.json({ data: serializeFlight(flight) });
  } catch {
    return serverError("Failed to load flight.");
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const auth = await requireRole(request, "ADMIN");
    if (!auth.ok) {
      return auth.response;
    }

    const { id } = await context.params;
    const payload = updateFlightSchema.parse(await request.json());

    const flight = await prisma.flight.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            bookings: true,
          },
        },
      },
    });

    if (!flight) {
      return jsonError(404, {
        error: "NotFound",
        message: "Flight not found.",
      });
    }

    if (flight.status !== FlightStatus.ACTIVE) {
      return jsonError(409, {
        error: "Conflict",
        message: "Only active flights can be updated.",
      });
    }

    if (flight._count.bookings > 0 && canUpdateCoreFlightFields(payload)) {
      return jsonError(409, {
        error: "Conflict",
        message:
          "Cannot edit core flight details after bookings exist. Only seat expansion and price updates are allowed.",
      });
    }

    if (
      payload.totalSeats !== undefined &&
      payload.totalSeats < flight.bookedSeats
    ) {
      return jsonError(400, {
        error: "ValidationError",
        message: `totalSeats cannot be lower than currently booked seats (${flight.bookedSeats}).`,
      });
    }

    const mergedDeparture = payload.departureDateTime ?? flight.departureDateTime;
    const mergedArrival = payload.arrivalDateTime ?? flight.arrivalDateTime;

    if (mergedDeparture <= new Date()) {
      return jsonError(400, {
        error: "ValidationError",
        message: "Departure time must be in the future.",
      });
    }

    if (mergedArrival <= mergedDeparture) {
      return jsonError(400, {
        error: "ValidationError",
        message: "Arrival time must be later than departure time.",
      });
    }

    if (
      (payload.origin ?? flight.origin) === (payload.destination ?? flight.destination)
    ) {
      return jsonError(400, {
        error: "ValidationError",
        message: "Origin and destination must be different.",
      });
    }

    const updated = await prisma.flight.update({
      where: { id },
      data: {
        flightNumber: payload.flightNumber,
        origin: payload.origin,
        destination: payload.destination,
        departureDateTime: payload.departureDateTime,
        arrivalDateTime: payload.arrivalDateTime,
        totalSeats: payload.totalSeats,
        pricePerSeat:
          payload.pricePerSeat !== undefined
            ? payload.pricePerSeat.toFixed(2)
            : undefined,
        cancelReason: payload.cancelReason,
      },
    });

    return NextResponse.json({
      data: serializeFlight(updated),
      message: "Flight updated successfully.",
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(error);
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return jsonError(409, {
        error: "Conflict",
        message: "Flight number already exists.",
      });
    }

    return serverError("Failed to update flight.");
  }
}

const cancelFlightSchema = z.object({
  reason: z.string().trim().min(3).max(150).optional(),
});

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const auth = await requireRole(request, "ADMIN");
    if (!auth.ok) {
      return auth.response;
    }

    const { id } = await context.params;

    let reason = "ADMIN_CANCELLED_FLIGHT";
    if (request.headers.get("content-length") !== "0") {
      const parse = cancelFlightSchema.safeParse(await request.json().catch(() => ({})));
      if (!parse.success) {
        return validationError(parse.error);
      }
      reason = parse.data.reason || reason;
    }

    const existing = await prisma.flight.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!existing) {
      return jsonError(404, {
        error: "NotFound",
        message: "Flight not found.",
      });
    }

    if (existing.status === FlightStatus.CANCELLED) {
      return jsonError(409, {
        error: "Conflict",
        message: "Flight is already cancelled.",
      });
    }

    const [flight] = await prisma.$transaction([
      prisma.flight.update({
        where: { id },
        data: {
          status: FlightStatus.CANCELLED,
          cancelReason: reason,
        },
      }),
      prisma.booking.updateMany({
        where: {
          flightId: id,
          status: BookingStatus.CONFIRMED,
        },
        data: {
          status: BookingStatus.CANCELLED,
          cancelledDate: new Date(),
          cancelReason: "FLIGHT_CANCELLED",
        },
      }),
    ]);

    return NextResponse.json({
      data: serializeFlight(flight),
      message: "Flight cancelled successfully.",
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(error);
    }

    return serverError("Failed to cancel flight.");
  }
}

import { FlightStatus, Prisma } from "@prisma/client";
import { ZodError } from "zod";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { serializeFlight } from "@/lib/flights/serialize";
import { jsonError, serverError, validationError } from "@/lib/http/responses";
import { createFlightSchema } from "@/lib/validation/schemas";

function buildDateRange(dateValue: string): { gte: Date; lt: Date } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return null;
  }

  const start = new Date(`${dateValue}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) {
    return null;
  }

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return { gte: start, lt: end };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const includeAll = request.nextUrl.searchParams.get("includeAll") === "true";
    const origin = request.nextUrl.searchParams.get("origin")?.trim().toUpperCase();
    const destination = request.nextUrl.searchParams
      .get("destination")
      ?.trim()
      .toUpperCase();
    const date = request.nextUrl.searchParams.get("date")?.trim();
    const now = new Date();

    if (includeAll) {
      const auth = await requireRole(request, "ADMIN");
      if (!auth.ok) {
        return auth.response;
      }
    }

    const where: Prisma.FlightWhereInput = includeAll
      ? {}
      : {
          status: FlightStatus.ACTIVE,
          departureDateTime: { gte: now },
        };

    if (origin) {
      if (!/^[A-Z]{3}$/.test(origin)) {
        return jsonError(400, {
          error: "ValidationError",
          message: "origin must be a 3-letter IATA code.",
        });
      }
      where.origin = origin;
    }

    if (destination) {
      if (!/^[A-Z]{3}$/.test(destination)) {
        return jsonError(400, {
          error: "ValidationError",
          message: "destination must be a 3-letter IATA code.",
        });
      }
      where.destination = destination;
    }

    if (date) {
      const range = buildDateRange(date);
      if (!range) {
        return jsonError(400, {
          error: "ValidationError",
          message: "date must be in YYYY-MM-DD format.",
        });
      }
      where.departureDateTime = range;
    }

    const flights = await prisma.flight.findMany({
      where,
      orderBy: [{ departureDateTime: "asc" }, { flightNumber: "asc" }],
    });

    return NextResponse.json({
      data: flights.map((flight) => serializeFlight(flight)),
    });
  } catch {
    return serverError("Failed to load flights.");
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireRole(request, "ADMIN");
    if (!auth.ok) {
      return auth.response;
    }

    const payload = createFlightSchema.parse(await request.json());
    if (payload.departureDateTime <= new Date()) {
      return jsonError(400, {
        error: "ValidationError",
        message: "Departure time must be in the future.",
      });
    }

    const created = await prisma.flight.create({
      data: {
        flightNumber: payload.flightNumber,
        origin: payload.origin,
        destination: payload.destination,
        departureDateTime: payload.departureDateTime,
        arrivalDateTime: payload.arrivalDateTime,
        totalSeats: payload.totalSeats,
        pricePerSeat: payload.pricePerSeat.toFixed(2),
        status: FlightStatus.ACTIVE,
      },
    });

    return NextResponse.json(
      {
        data: serializeFlight(created),
        message: "Flight created successfully.",
      },
      { status: 201 },
    );
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

    return serverError("Failed to create flight.");
  }
}

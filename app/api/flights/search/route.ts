import { FlightStatus } from "@prisma/client";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { serializeFlight } from "@/lib/flights/serialize";
import { jsonError, serverError } from "@/lib/http/responses";

function getDateRange(dateValue: string): { gte: Date; lt: Date } | null {
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
    const origin = request.nextUrl.searchParams.get("origin")?.trim().toUpperCase() ?? "";
    const destination =
      request.nextUrl.searchParams.get("destination")?.trim().toUpperCase() ?? "";
    const date = request.nextUrl.searchParams.get("date")?.trim() ?? "";

    if (!origin || !destination || !date) {
      return jsonError(400, {
        error: "ValidationError",
        message: "origin, destination, and date query parameters are required.",
      });
    }

    if (!/^[A-Z]{3}$/.test(origin) || !/^[A-Z]{3}$/.test(destination)) {
      return jsonError(400, {
        error: "ValidationError",
        message: "origin and destination must be valid 3-letter IATA codes.",
      });
    }

    const dateRange = getDateRange(date);
    if (!dateRange) {
      return jsonError(400, {
        error: "ValidationError",
        message: "date must be in YYYY-MM-DD format.",
      });
    }

    const flights = await prisma.flight.findMany({
      where: {
        origin,
        destination,
        status: FlightStatus.ACTIVE,
        departureDateTime: dateRange,
      },
      orderBy: [{ departureDateTime: "asc" }, { pricePerSeat: "asc" }],
    });

    return NextResponse.json({
      data: flights.map((flight) => serializeFlight(flight)),
      meta: {
        count: flights.length,
      },
    });
  } catch {
    return serverError("Failed to search flights.");
  }
}

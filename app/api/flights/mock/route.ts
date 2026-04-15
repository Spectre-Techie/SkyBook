import { FlightStatus } from "@prisma/client";
import { ZodError, z } from "zod";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { serializeFlight } from "@/lib/flights/serialize";
import { ensureMockFlights, seedMockFlights } from "@/lib/flights/mock";
import { serverError, validationError } from "@/lib/http/responses";

const mockSeedSchema = z.object({
  force: z.coerce.boolean().optional(),
  daysAhead: z.coerce.number().int().min(1).max(30).optional(),
  minimumUpcomingActive: z.coerce.number().int().min(1).max(400).optional(),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireRole(request, "ADMIN");
    if (!auth.ok) {
      return auth.response;
    }

    const upcoming = await prisma.flight.findMany({
      where: {
        status: FlightStatus.ACTIVE,
        departureDateTime: {
          gte: new Date(),
        },
      },
      orderBy: [{ departureDateTime: "asc" }, { flightNumber: "asc" }],
      take: 20,
    });

    return NextResponse.json({
      data: upcoming.map((flight) => serializeFlight(flight)),
      meta: {
        count: upcoming.length,
        note: "POST to this endpoint to seed mock future flights into the database.",
      },
    });
  } catch {
    return serverError("Failed to load mock flight inventory.");
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireRole(request, "ADMIN");
    if (!auth.ok) {
      return auth.response;
    }

    let rawBody: unknown = {};
    if (request.headers.get("content-length") !== "0") {
      rawBody = await request.json().catch(() => ({}));
    }

    const payload = mockSeedSchema.parse(rawBody);

    if (payload.force) {
      const seeded = await seedMockFlights(prisma, payload.daysAhead);
      return NextResponse.json({
        data: seeded,
        message: `Mock flight seed completed. Created ${seeded.created} flight(s).`,
      });
    }

    const ensured = await ensureMockFlights(prisma, {
      minimumUpcomingActive: payload.minimumUpcomingActive,
      daysAhead: payload.daysAhead,
    });

    return NextResponse.json({
      data: ensured,
      message: ensured.seeded
        ? `Mock inventory topped up with ${ensured.created} new flight(s).`
        : "Upcoming flight inventory is already sufficient.",
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(error);
    }

    return serverError("Failed to seed mock flights.");
  }
}

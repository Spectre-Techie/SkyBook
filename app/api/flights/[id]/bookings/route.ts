import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/guards";
import { serializeBooking } from "@/lib/bookings/serialize";
import { prisma } from "@/lib/db";
import { jsonError, serverError } from "@/lib/http/responses";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const auth = await requireRole(request, "ADMIN");
    if (!auth.ok) {
      return auth.response;
    }

    const { id } = await context.params;

    const flight = await prisma.flight.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!flight) {
      return jsonError(404, {
        error: "NotFound",
        message: "Flight not found.",
      });
    }

    const bookings = await prisma.booking.findMany({
      where: { flightId: id },
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
    return serverError("Failed to load flight bookings.");
  }
}

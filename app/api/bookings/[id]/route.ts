import { BookingStatus, Prisma } from "@prisma/client";
import { ZodError, z } from "zod";

import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";

import { requireAuth, requireRole } from "@/lib/auth/guards";
import { serializeBooking } from "@/lib/bookings/serialize";
import { prisma } from "@/lib/db";
import { jsonError, serverError, validationError } from "@/lib/http/responses";

const reviewBookingSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  reason: z.string().trim().max(120).optional(),
});

const MAX_REVIEW_RETRIES = 2;
const REVIEW_TX_MAX_WAIT_MS = 5000;
const REVIEW_TX_TIMEOUT_MS = 10000;

function isPrismaKnownRequestError(
  error: unknown,
  code?: string,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (code ? error.code === code : true)
  );
}

function isRetryableReviewError(error: unknown): boolean {
  return (
    isPrismaKnownRequestError(error, "P2034") ||
    isPrismaKnownRequestError(error, "P2028")
  );
}

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) {
      return auth.response;
    }

    const { id } = await context.params;

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

    const canView = auth.user.role === "ADMIN" || booking.passengerId === auth.user.id;
    if (!canView) {
      return jsonError(403, {
        error: "Forbidden",
        message: "You are not allowed to view this booking.",
      });
    }

    return NextResponse.json({
      data: serializeBooking(booking),
    });
  } catch {
    return serverError("Failed to load booking.");
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const auth = await requireRole(request, "ADMIN");
    if (!auth.ok) {
      return auth.response;
    }

    const { id } = await context.params;
    const payload = reviewBookingSchema.parse(await request.json().catch(() => ({})));

    let updatedBooking:
      | { kind: "not-found" }
      | { kind: "conflict"; status: BookingStatus }
      | {
          kind: "updated";
          booking: Prisma.BookingGetPayload<{
            include: {
              flight: true;
              passenger: {
                select: {
                  id: true;
                  fullName: true;
                  email: true;
                  role: true;
                };
              };
            };
          }>;
        }
      | null = null;

    for (let attempt = 0; attempt <= MAX_REVIEW_RETRIES; attempt += 1) {
      try {
        updatedBooking = await prisma.$transaction(async (tx) => {
          const existing = await tx.booking.findUnique({
            where: { id },
            select: {
              id: true,
              flightId: true,
              status: true,
            },
          });

          if (!existing) {
            return { kind: "not-found" as const };
          }

          if (existing.status !== BookingStatus.PENDING) {
            return {
              kind: "conflict" as const,
              status: existing.status,
            };
          }

          if (payload.decision === "APPROVE") {
            await tx.booking.update({
              where: { id },
              data: {
                status: BookingStatus.CONFIRMED,
                paymentCompletedAt: new Date(),
                webhookProcessedAt: new Date(),
              },
            });

            await tx.flight.update({
              where: { id: existing.flightId },
              data: {
                bookedSeats: {
                  increment: 1,
                },
              },
            });
          } else {
            await tx.booking.update({
              where: { id },
              data: {
                status: BookingStatus.CANCELLED,
                cancelledDate: new Date(),
                cancelReason: payload.reason || "ADMIN_REJECTED",
                webhookProcessedAt: new Date(),
              },
            });
          }

          const booking = await tx.booking.findUnique({
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
            return { kind: "not-found" as const };
          }

          return {
            kind: "updated" as const,
            booking,
          };
        }, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: REVIEW_TX_MAX_WAIT_MS,
          timeout: REVIEW_TX_TIMEOUT_MS,
        });

        break;
      } catch (txError) {
        if (isRetryableReviewError(txError) && attempt < MAX_REVIEW_RETRIES) {
          const backoffMs = 100 * Math.pow(3, attempt);
          await wait(backoffMs);
          continue;
        }

        throw txError;
      }
    }

    if (!updatedBooking) {
      throw new Error("Unable to review booking at this time.");
    }

    if (updatedBooking.kind === "not-found") {
      return jsonError(404, {
        error: "NotFound",
        message: "Booking not found.",
      });
    }

    if (updatedBooking.kind === "conflict") {
      return jsonError(409, {
        error: "Conflict",
        message: `Only pending bookings can be reviewed. Current status is ${updatedBooking.status}.`,
      });
    }

    return NextResponse.json({
      data: serializeBooking(updatedBooking.booking),
      message:
        payload.decision === "APPROVE"
          ? "Booking approved successfully."
          : "Booking rejected successfully.",
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(error);
    }

    if (isPrismaKnownRequestError(error, "P2034")) {
      return jsonError(409, {
        error: "Conflict",
        message: "Another process is currently updating this booking. Please retry.",
      });
    }

    if (isPrismaKnownRequestError(error, "P2028")) {
      return jsonError(503, {
        error: "ServiceUnavailable",
        message: "Booking review is temporarily busy. Please retry in a few seconds.",
      });
    }

    console.error("[ADMIN_BOOKING_REVIEW]", error);
    return serverError("Failed to review booking.");
  }
}

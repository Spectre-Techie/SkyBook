import { BookingStatus, FlightStatus, Prisma } from "@prisma/client";

import { generateBookingReference } from "@/lib/booking/reference";
import { isSeatWithinCapacity } from "@/lib/bookings/seat";

export const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
];

export const BOOKING_FLOW_ERROR = {
  FLIGHT_NOT_FOUND: "FLIGHT_NOT_FOUND",
  FLIGHT_NOT_ACTIVE: "FLIGHT_NOT_ACTIVE",
  FLIGHT_ALREADY_DEPARTED: "FLIGHT_ALREADY_DEPARTED",
  FLIGHT_FULL: "FLIGHT_FULL",
  SEAT_OUT_OF_RANGE: "SEAT_OUT_OF_RANGE",
  SEAT_ALREADY_BOOKED: "SEAT_ALREADY_BOOKED",
  PASSENGER_ALREADY_BOOKED: "PASSENGER_ALREADY_BOOKED",
} as const;

export type BookingFlowErrorCode =
  (typeof BOOKING_FLOW_ERROR)[keyof typeof BOOKING_FLOW_ERROR];

export class BookingFlowError extends Error {
  constructor(public readonly code: BookingFlowErrorCode) {
    super(code);
    this.name = "BookingFlowError";
  }
}

type ReservableFlight = {
  id: string;
  status: FlightStatus;
  departureDateTime: Date;
  bookedSeats: number;
  totalSeats: number;
};

type ReservationContext = {
  flightId: string;
  passengerId: string;
  seatNumber: string;
  totalPrice: Prisma.Decimal;
};

export function assertFlightCanBeBooked(flight: ReservableFlight | null): asserts flight is ReservableFlight {
  if (!flight) {
    throw new BookingFlowError(BOOKING_FLOW_ERROR.FLIGHT_NOT_FOUND);
  }

  if (flight.status !== FlightStatus.ACTIVE) {
    throw new BookingFlowError(BOOKING_FLOW_ERROR.FLIGHT_NOT_ACTIVE);
  }

  if (flight.departureDateTime <= new Date()) {
    throw new BookingFlowError(BOOKING_FLOW_ERROR.FLIGHT_ALREADY_DEPARTED);
  }

  if (flight.bookedSeats >= flight.totalSeats) {
    throw new BookingFlowError(BOOKING_FLOW_ERROR.FLIGHT_FULL);
  }
}

export function assertSeatWithinFlightCapacity(
  flight: ReservableFlight,
  seatNumber: string,
): void {
  if (!isSeatWithinCapacity(seatNumber, flight.totalSeats)) {
    throw new BookingFlowError(BOOKING_FLOW_ERROR.SEAT_OUT_OF_RANGE);
  }
}

export async function assertNoActiveBookingConflicts(
  tx: Prisma.TransactionClient,
  context: {
    flightId: string;
    passengerId: string;
    seatNumber: string;
  },
): Promise<void> {
  const [seatConflict, passengerConflict] = await Promise.all([
    tx.booking.findFirst({
      where: {
        flightId: context.flightId,
        seatNumber: context.seatNumber,
        status: { in: ACTIVE_BOOKING_STATUSES },
      },
      select: { id: true },
    }),
    tx.booking.findFirst({
      where: {
        flightId: context.flightId,
        passengerId: context.passengerId,
        status: { in: ACTIVE_BOOKING_STATUSES },
      },
      select: { id: true },
    }),
  ]);

  if (seatConflict) {
    throw new BookingFlowError(BOOKING_FLOW_ERROR.SEAT_ALREADY_BOOKED);
  }

  if (passengerConflict) {
    throw new BookingFlowError(BOOKING_FLOW_ERROR.PASSENGER_ALREADY_BOOKED);
  }
}

export async function createBookingWithReferenceRetry(
  tx: Prisma.TransactionClient,
  context: ReservationContext,
  status: BookingStatus,
): Promise<{ id: string }> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const reference = generateBookingReference();

    try {
      return await tx.booking.create({
        data: {
          bookingReference: reference,
          flightId: context.flightId,
          passengerId: context.passengerId,
          seatNumber: context.seatNumber,
          totalPrice: context.totalPrice,
          status,
        },
        select: {
          id: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const target = String(error.meta?.target ?? "");
        if (target.includes("bookingReference")) {
          continue;
        }
      }

      throw error;
    }
  }

  throw new Error("Unable to generate unique booking reference.");
}

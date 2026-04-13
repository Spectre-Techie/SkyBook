import { BookingStatus, FlightStatus, Prisma } from "@prisma/client";

type RelatedFlight = {
  id: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureDateTime: Date;
  arrivalDateTime: Date;
  totalSeats: number;
  bookedSeats: number;
  pricePerSeat: Prisma.Decimal;
  status: FlightStatus;
  cancelReason: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type RelatedPassenger = {
  id: string;
  fullName: string;
  email: string;
  role: "PASSENGER" | "ADMIN";
};

export type BookingRecord = {
  id: string;
  bookingReference: string;
  flightId: string;
  passengerId: string;
  seatNumber: string;
  totalPrice: Prisma.Decimal;
  status: BookingStatus;
  bookingDate: Date;
  cancelledDate: Date | null;
  cancelReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  flight?: RelatedFlight;
  passenger?: RelatedPassenger;
};

function serializeFlightForBooking(flight: RelatedFlight) {
  return {
    ...flight,
    pricePerSeat: Number(flight.pricePerSeat),
    availableSeats: Math.max(flight.totalSeats - flight.bookedSeats, 0),
  };
}

export function serializeBooking(booking: BookingRecord) {
  return {
    ...booking,
    totalPrice: Number(booking.totalPrice),
    flight: booking.flight
      ? serializeFlightForBooking(booking.flight)
      : undefined,
    passenger: booking.passenger,
  };
}

import { FlightStatus, Prisma } from "@prisma/client";

export type FlightRecord = {
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

export function serializeFlight(flight: FlightRecord) {
  return {
    ...flight,
    pricePerSeat: Number(flight.pricePerSeat),
    availableSeats: Math.max(flight.totalSeats - flight.bookedSeats, 0),
  };
}

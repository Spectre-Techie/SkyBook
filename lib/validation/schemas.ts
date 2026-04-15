import { z } from "zod";

import { normalizeSeatInput } from "@/lib/bookings/seat";

function extractIataCode(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (/^[A-Z]{3}$/.test(normalized)) {
    return normalized;
  }

  const parenthesizedMatch = normalized.match(/\(([A-Z]{3})\)/);
  if (parenthesizedMatch) {
    return parenthesizedMatch[1];
  }

  const standaloneCodes = normalized.match(/\b[A-Z]{3}\b/g);
  if (standaloneCodes && standaloneCodes.length > 0) {
    return standaloneCodes[standaloneCodes.length - 1];
  }

  return normalized;
}

function normalizeFlightNumber(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "");
}

const iataCode = z
  .string()
  .transform(extractIataCode)
  .refine(
    (value) => /^[A-Z]{3}$/.test(value),
    "IATA code must be 3 uppercase letters (for example: LOS or Lagos (LOS)).",
  );

const flightNumber = z
  .string()
  .transform(normalizeFlightNumber)
  .refine(
    (value) => /^[A-Z0-9]{3,8}$/.test(value),
    "Flight number must be 3-8 alphanumeric characters.",
  );

const password = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .regex(/[A-Z]/, "Password must include at least one uppercase letter.")
  .regex(/[a-z]/, "Password must include at least one lowercase letter.")
  .regex(/[0-9]/, "Password must include at least one number.")
  .regex(/[^A-Za-z0-9]/, "Password must include at least one special character.");

export const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  email: z.email().trim().toLowerCase(),
  password,
});

export const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1),
});

export const createFlightSchema = z
  .object({
    flightNumber,
    origin: iataCode,
    destination: iataCode,
    departureDateTime: z.coerce.date(),
    arrivalDateTime: z.coerce.date(),
    totalSeats: z.coerce.number().int().min(1).max(800),
    pricePerSeat: z.coerce.number().positive(),
  })
  .superRefine((value, context) => {
    if (value.origin === value.destination) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["destination"],
        message: "Destination must differ from origin.",
      });
    }

    if (value.arrivalDateTime <= value.departureDateTime) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["arrivalDateTime"],
        message: "Arrival time must be later than departure time.",
      });
    }
  });

export const updateFlightSchema = z
  .object({
    flightNumber: flightNumber.optional(),
    origin: iataCode.optional(),
    destination: iataCode.optional(),
    departureDateTime: z.coerce.date().optional(),
    arrivalDateTime: z.coerce.date().optional(),
    totalSeats: z.coerce.number().int().min(1).max(800).optional(),
    pricePerSeat: z.coerce.number().positive().optional(),
    cancelReason: z.string().trim().max(150).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required for update.",
  });

export const createBookingSchema = z.object({
  flightId: z.string().min(1),
  seatNumber: z.string().transform((value, context) => {
    const normalized = normalizeSeatInput(value);
    if (!normalized) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Seat must be like 12A or a seat number like 2.",
      });
      return z.NEVER;
    }

    return normalized;
  }),
});

export const cancelBookingSchema = z.object({
  reason: z.string().trim().max(120).optional(),
});

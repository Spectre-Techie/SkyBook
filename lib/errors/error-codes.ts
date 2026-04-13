// Sanitized error mapping — frontend shows friendly messages only
export const ERROR_CODES = {
  // Auth
  EMAIL_NOT_FOUND: { code: "email_not_found", message: "Email not found", status: 404 },
  INVALID_PASSWORD: { code: "invalid_password", message: "Invalid email or password", status: 401 },
  EMAIL_ALREADY_EXISTS: { code: "email_taken", message: "Email already registered", status: 409 },
  WEAK_PASSWORD: {
    code: "weak_password",
    message: "Password must include uppercase, lowercase, number, and special character",
    status: 400,
  },

  // Flights
  FLIGHT_NOT_FOUND: { code: "flight_not_found", message: "Flight not available", status: 404 },
  FLIGHT_FULL: { code: "flight_full", message: "No seats available on this flight", status: 409 },
  SEAT_TAKEN: { code: "seat_taken", message: "This seat is no longer available", status: 409 },
  INVALID_SEAT_FORMAT: { code: "invalid_seat", message: "Invalid seat format (e.g., 12A)", status: 400 },

  // Bookings
  BOOKING_NOT_FOUND: { code: "booking_not_found", message: "Booking not found", status: 404 },
  CANNOT_CANCEL: {
    code: "cannot_cancel",
    message: "Cancellations allowed up to 24 hours before departure",
    status: 409,
  },
  DUPLICATE_BOOKING: {
    code: "duplicate_booking",
    message: "You already have a booking on this flight",
    status: 409,
  },
  BOOKING_ALREADY_CANCELLED: { code: "already_cancelled", message: "This booking is already cancelled", status: 409 },

  // Payment
  PAYMENT_FAILED: { code: "payment_failed", message: "Payment processing failed. Please try again", status: 402 },
  STRIPE_ERROR: {
    code: "stripe_error",
    message: "Payment service unavailable. Please try again later",
    status: 500,
  },

  // General
  UNAUTHORIZED: { code: "unauthorized", message: "You must log in", status: 401 },
  FORBIDDEN: { code: "forbidden", message: "You don't have permission", status: 403 },
  VALIDATION_ERROR: { code: "validation_error", message: "Please check your input", status: 400 },
  SERVER_ERROR: { code: "server_error", message: "Something went wrong; please try again", status: 500 },
  NETWORK_ERROR: { code: "network_error", message: "Check your internet connection", status: 0 },
  REQUEST_TIMEOUT: { code: "timeout", message: "Request timed out; please try again", status: 408 },
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

export function getError(code: ErrorCode) {
  return ERROR_CODES[code] || ERROR_CODES.SERVER_ERROR;
}

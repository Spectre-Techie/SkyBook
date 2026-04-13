import { ZodError } from "zod";

import { NextResponse } from "next/server";

type ErrorBody = {
  error: string;
  message?: string;
  details?: unknown;
};

function normalizeValidationDetails(error: ZodError): unknown {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
    code: issue.code,
  }));
}

export function jsonError(
  status: number,
  body: ErrorBody,
): NextResponse<ErrorBody> {
  return NextResponse.json(body, { status });
}

export function validationError(error: ZodError): NextResponse<ErrorBody> {
  return jsonError(400, {
    error: "ValidationError",
    message: "Request payload validation failed.",
    details: normalizeValidationDetails(error),
  });
}

export function serverError(message = "Unexpected server error."): NextResponse<ErrorBody> {
  return jsonError(500, {
    error: "ServerError",
    message,
  });
}

import { ZodError } from "zod";

import { jsonError, validationError } from "@/lib/http/responses";

import { NextResponse } from "next/server";

export type JsonReadResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

export async function readValidatedJson<T>(
  request: Request,
  parser: { parse: (input: unknown) => T },
): Promise<JsonReadResult<T>> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return {
      ok: false,
      response: jsonError(400, {
        error: "ValidationError",
        message: "Request body must be valid JSON.",
      }),
    };
  }

  try {
    const data = parser.parse(body);
    return { ok: true, data };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        ok: false,
        response: validationError(error),
      };
    }

    throw error;
  }
}

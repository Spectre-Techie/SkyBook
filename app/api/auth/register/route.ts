import { UserRole } from "@prisma/client";

import { createSessionToken, getSessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { readValidatedJson } from "@/lib/http/request";
import { jsonError, serverError } from "@/lib/http/responses";
import { prisma } from "@/lib/db";
import { registerSchema } from "@/lib/validation/schemas";

import { NextResponse } from "next/server";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const parsed = await readValidatedJson(request, registerSchema);
    if (!parsed.ok) {
      return parsed.response;
    }

    const payload = parsed.data;

    const existingUser = await prisma.user.findUnique({
      where: { email: payload.email },
      select: { id: true },
    });

    if (existingUser) {
      return jsonError(409, {
        error: "Conflict",
        message: "An account with this email already exists.",
      });
    }

    const passwordHash = await hashPassword(payload.password);
    const user = await prisma.user.create({
      data: {
        email: payload.email,
        fullName: payload.fullName,
        passwordHash,
        role: UserRole.PASSENGER,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
      },
    });

    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    });

    const response = NextResponse.json(
      {
        user,
        message: "Account created successfully.",
      },
      { status: 201 },
    );

    response.cookies.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions());
    return response;
  } catch (error) {
    console.error("[auth/register]", error);

    return serverError(
      process.env.NODE_ENV === "development"
        ? `Failed to register user: ${error instanceof Error ? error.message : "Unknown error"}`
        : "Failed to register user.",
    );
  }
}

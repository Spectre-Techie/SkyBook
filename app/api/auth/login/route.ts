import { createSessionToken, getSessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { readValidatedJson } from "@/lib/http/request";
import { jsonError, serverError } from "@/lib/http/responses";
import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/validation/schemas";

import { NextResponse } from "next/server";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const parsed = await readValidatedJson(request, loginSchema);
    if (!parsed.ok) {
      return parsed.response;
    }

    const payload = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email: payload.email },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        passwordHash: true,
      },
    });

    if (!user) {
      return jsonError(401, {
        error: "Unauthorized",
        message: "Invalid email or password.",
      });
    }

    const passwordMatches = await verifyPassword(payload.password, user.passwordHash);
    if (!passwordMatches) {
      return jsonError(401, {
        error: "Unauthorized",
        message: "Invalid email or password.",
      });
    }

    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
      message: "Logged in successfully.",
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions());
    return response;
  } catch (error) {
    console.error("[auth/login]", error);

    return serverError(
      process.env.NODE_ENV === "development"
        ? `Failed to log in: ${error instanceof Error ? error.message : "Unknown error"}`
        : "Failed to log in.",
    );
  }
}

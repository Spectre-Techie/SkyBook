import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

export const SESSION_COOKIE_NAME = "skybook_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24;

export type SessionRole = "PASSENGER" | "ADMIN";

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  role: SessionRole;
};

type SessionTokenPayload = SessionUser & {
  iat?: number;
  exp?: number;
};

function getSecret(): Uint8Array {
  const secret = process.env.BETTER_AUTH_SECRET?.trim();
  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET is required for auth token signing.");
  }

  return new TextEncoder().encode(secret);
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionUser | null> {
  try {
    const verified = await jwtVerify<SessionTokenPayload>(token, getSecret(), {
      algorithms: ["HS256"],
    });

    const payload = verified.payload;
    if (!payload.id || !payload.email || !payload.fullName || !payload.role) {
      return null;
    }

    if (payload.role !== "PASSENGER" && payload.role !== "ADMIN") {
      return null;
    }

    return {
      id: payload.id,
      email: payload.email,
      fullName: payload.fullName,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export async function getSessionFromRequest(
  request: NextRequest,
): Promise<SessionUser | null> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  return verifySessionToken(token);
}

export async function getSessionFromCookieStore(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifySessionToken(token);
}

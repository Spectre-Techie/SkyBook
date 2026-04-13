import type { NextRequest } from "next/server";

import { getSessionFromRequest, type SessionRole, type SessionUser } from "@/lib/auth/session";
import { jsonError } from "@/lib/http/responses";

type GuardSuccess = {
  ok: true;
  user: SessionUser;
};

type GuardFailure = {
  ok: false;
  response: ReturnType<typeof jsonError>;
};

type GuardResult = GuardSuccess | GuardFailure;

export async function requireAuth(request: NextRequest): Promise<GuardResult> {
  const user = await getSessionFromRequest(request);

  if (!user) {
    return {
      ok: false,
      response: jsonError(401, {
        error: "Unauthorized",
        message: "You must be logged in to access this resource.",
      }),
    };
  }

  return { ok: true, user };
}

export async function requireRole(
  request: NextRequest,
  allowedRoles: SessionRole | SessionRole[],
): Promise<GuardResult> {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth;
  }

  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  if (!roles.includes(auth.user.role)) {
    return {
      ok: false,
      response: jsonError(403, {
        error: "Forbidden",
        message: "You do not have permission to perform this action.",
      }),
    };
  }

  return auth;
}

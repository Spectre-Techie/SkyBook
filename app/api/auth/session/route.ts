import type { NextRequest } from "next/server";

import { getSessionFromRequest } from "@/lib/auth/session";

import { NextResponse } from "next/server";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ authenticated: false, user: null });
  }

  return NextResponse.json({ authenticated: true, user: session });
}

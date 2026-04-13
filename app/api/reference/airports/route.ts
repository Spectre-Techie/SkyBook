import { NextRequest, NextResponse } from "next/server";

import { getAirportReferences } from "@/lib/reference/aviationstack";

function toInt(value: string | null, defaultValue: number): number {
  if (!value) {
    return defaultValue;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return defaultValue;
  }

  return parsed;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const limit = toInt(request.nextUrl.searchParams.get("limit"), 10);

  if (q.length < 2) {
    return NextResponse.json(
      {
        error: "Invalid request",
        message: "Query parameter q must be at least 2 characters.",
      },
      { status: 400 },
    );
  }

  const result = await getAirportReferences(q, limit);
  return NextResponse.json(result);
}
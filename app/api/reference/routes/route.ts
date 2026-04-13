import { NextRequest, NextResponse } from "next/server";

import { getRouteReferences } from "@/lib/reference/aviationstack";

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
  const depIata = request.nextUrl.searchParams.get("depIata")?.trim() ?? "";
  const arrIata = request.nextUrl.searchParams.get("arrIata")?.trim();
  const limit = toInt(request.nextUrl.searchParams.get("limit"), 20);

  if (depIata.length !== 3) {
    return NextResponse.json(
      {
        error: "Invalid request",
        message: "Query parameter depIata must be a 3-letter IATA code.",
      },
      { status: 400 },
    );
  }

  if (arrIata && arrIata.length !== 3) {
    return NextResponse.json(
      {
        error: "Invalid request",
        message: "Query parameter arrIata must be a 3-letter IATA code when provided.",
      },
      { status: 400 },
    );
  }

  const result = await getRouteReferences(depIata, arrIata, limit);
  return NextResponse.json(result);
}
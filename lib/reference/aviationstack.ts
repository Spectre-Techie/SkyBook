import { z } from "zod";

import {
  searchFallbackAirports,
  searchFallbackRoutes,
  type ReferenceAirport,
  type ReferenceRoute,
} from "@/lib/reference/fallback";

type ReferenceSource = "aviationstack" | "fallback";

export type AirportReferenceResult = {
  source: ReferenceSource;
  data: ReferenceAirport[];
  warning?: string;
};

export type RouteReferenceResult = {
  source: ReferenceSource;
  data: ReferenceRoute[];
  warning?: string;
};

const airportApiItemSchema = z.object({
  iata_code: z.string().nullable().optional(),
  airport_name: z.string().nullable().optional(),
  city_name: z.string().nullable().optional(),
  country_name: z.string().nullable().optional(),
  timezone: z.string().nullable().optional(),
});

const routeApiItemSchema = z.object({
  airline_name: z.string().nullable().optional(),
  airline_iata: z.string().nullable().optional(),
  flight_number: z.string().nullable().optional(),
  dep_iata: z.string().nullable().optional(),
  arr_iata: z.string().nullable().optional(),
  departure: z
    .object({
      iata: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  arrival: z
    .object({
      iata: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
});

const apiErrorSchema = z.object({
  code: z.union([z.string(), z.number()]).optional(),
  type: z.string().optional(),
  info: z.string().optional(),
});

const airportApiResponseSchema = z.object({
  data: z.array(airportApiItemSchema).optional(),
  error: apiErrorSchema.optional(),
});

const routeApiResponseSchema = z.object({
  data: z.array(routeApiItemSchema).optional(),
  error: apiErrorSchema.optional(),
});

const flightApiItemSchema = z.object({
  departure: z
    .object({
      iata: z.string().nullable().optional(),
      airport: z.string().nullable().optional(),
      timezone: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  arrival: z
    .object({
      iata: z.string().nullable().optional(),
      airport: z.string().nullable().optional(),
      timezone: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  airline: z
    .object({
      name: z.string().nullable().optional(),
      iata: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  flight: z
    .object({
      number: z.string().nullable().optional(),
      codeshared: z
        .object({
          flight_number: z.string().nullable().optional(),
        })
        .nullable()
        .optional(),
    })
    .nullable()
    .optional(),
});

const flightApiResponseSchema = z.object({
  data: z.array(flightApiItemSchema).optional(),
  error: apiErrorSchema.optional(),
});

type FlightApiItem = z.infer<typeof flightApiItemSchema>;

const DEFAULT_BASE_URL = "https://api.aviationstack.com/v1";
const REQUEST_TIMEOUT_MS = 8_000;
const CACHE_REVALIDATE_SECONDS = 60 * 60;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getApiKey(): string | null {
  const key = process.env.AVIATIONSTACK_API_KEY?.trim();
  return key && key.length > 0 ? key : null;
}

function getBaseUrl(): string {
  const baseUrl = process.env.AVIATIONSTACK_BASE_URL?.trim();
  return baseUrl && baseUrl.length > 0 ? baseUrl : DEFAULT_BASE_URL;
}

function buildUrl(path: string, params: Record<string, string>): string {
  const baseUrl = getBaseUrl().endsWith("/")
    ? getBaseUrl()
    : `${getBaseUrl()}/`;
  const normalizedPath = path.replace(/^\/+/, "");
  const url = new URL(normalizedPath, baseUrl);

  Object.entries(params).forEach(([key, value]) => {
    if (value.trim().length > 0) {
      url.searchParams.set(key, value);
    }
  });

  return url.toString();
}

function cleanIata(value: string | null | undefined): string {
  return (value ?? "").trim().toUpperCase();
}

function toErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallbackMessage;
}

function buildApiErrorMessage(error: z.infer<typeof apiErrorSchema>): string {
  if (error.info?.trim()) {
    return error.info;
  }

  if (error.type?.trim()) {
    return error.type;
  }

  if (error.code !== undefined) {
    return String(error.code);
  }

  return "AviationStack returned an error.";
}

async function requestAviationstackJson(
  path: string,
  params: Record<string, string>,
): Promise<unknown> {
  const requestUrl = buildUrl(path, params);
  const response = await fetch(requestUrl, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    next: { revalidate: CACHE_REVALIDATE_SECONDS },
  });

  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    const parsed = z
      .object({ error: apiErrorSchema.optional() })
      .safeParse(payload ?? {});
    if (parsed.success && parsed.data.error) {
      throw new Error(buildApiErrorMessage(parsed.data.error));
    }

    throw new Error(`AviationStack request failed with status ${response.status}.`);
  }

  return payload;
}

function mapRoutesFromFlights(
  flights: FlightApiItem[],
  depIata: string,
  arrIata: string | undefined,
  limit: number,
): ReferenceRoute[] {
  const deduped = new Map<string, ReferenceRoute>();

  for (const item of flights) {
    const mappedDep = cleanIata(item.departure?.iata);
    const mappedArr = cleanIata(item.arrival?.iata);

    if (mappedDep.length !== 3 || mappedArr.length !== 3) {
      continue;
    }

    if (mappedDep !== depIata) {
      continue;
    }

    if (arrIata && mappedArr !== arrIata) {
      continue;
    }

    const airlineIata = cleanIata(item.airline?.iata) || null;
    const flightNumber =
      (item.flight?.number ?? item.flight?.codeshared?.flight_number ?? "").trim() ||
      null;
    const airlineName = (item.airline?.name ?? "").trim() || null;

    const route: ReferenceRoute = {
      airlineName,
      airlineIata,
      flightNumber,
      depIata: mappedDep,
      arrIata: mappedArr,
    };

    const routeKey = [
      route.airlineIata ?? "NA",
      route.flightNumber ?? "NA",
      route.depIata,
      route.arrIata,
    ].join(":");

    if (!deduped.has(routeKey)) {
      deduped.set(routeKey, route);
    }

    if (deduped.size >= limit) {
      break;
    }
  }

  return Array.from(deduped.values());
}

async function getRouteReferencesFromFlightsEndpoint(
  apiKey: string,
  depIata: string,
  arrIata: string | undefined,
  limit: number,
): Promise<ReferenceRoute[]> {
  const payload = flightApiResponseSchema.parse(
    await requestAviationstackJson("/flights", {
      access_key: apiKey,
      dep_iata: depIata,
      arr_iata: arrIata ?? "",
      limit: String(limit),
    }),
  );

  if (payload.error) {
    throw new Error(buildApiErrorMessage(payload.error));
  }

  return mapRoutesFromFlights(payload.data ?? [], depIata, arrIata, limit);
}

function mapAirportsFromFlights(
  flights: FlightApiItem[],
  expectedIata: string,
  limit: number,
): ReferenceAirport[] {
  const deduped = new Map<string, ReferenceAirport>();

  for (const item of flights) {
    const candidates = [item.departure, item.arrival];
    for (const candidate of candidates) {
      const iataCode = cleanIata(candidate?.iata);
      const name = (candidate?.airport ?? "").trim();

      if (iataCode !== expectedIata || name.length === 0) {
        continue;
      }

      const key = `${iataCode}:${name.toLowerCase()}`;
      if (!deduped.has(key)) {
        deduped.set(key, {
          iataCode,
          name,
          city: "Unknown",
          country: "Unknown",
          timezone: candidate?.timezone ?? null,
        });
      }

      if (deduped.size >= limit) {
        break;
      }
    }
  }

  return Array.from(deduped.values()).slice(0, limit);
}

async function getAirportReferencesFromFlightsEndpoint(
  apiKey: string,
  iataCode: string,
  limit: number,
): Promise<ReferenceAirport[]> {
  const depPayload = flightApiResponseSchema.parse(
    await requestAviationstackJson("/flights", {
      access_key: apiKey,
      dep_iata: iataCode,
      limit: String(limit),
    }),
  );

  if (depPayload.error) {
    throw new Error(buildApiErrorMessage(depPayload.error));
  }

  const depMatches = mapAirportsFromFlights(depPayload.data ?? [], iataCode, limit);
  if (depMatches.length > 0) {
    return depMatches;
  }

  const arrPayload = flightApiResponseSchema.parse(
    await requestAviationstackJson("/flights", {
      access_key: apiKey,
      arr_iata: iataCode,
      limit: String(limit),
    }),
  );

  if (arrPayload.error) {
    throw new Error(buildApiErrorMessage(arrPayload.error));
  }

  return mapAirportsFromFlights(arrPayload.data ?? [], iataCode, limit);
}

export async function getAirportReferences(
  query: string,
  limit = 10,
): Promise<AirportReferenceResult> {
  const normalizedQuery = query.trim();
  const normalizedIata = cleanIata(normalizedQuery);
  const clampedLimit = clamp(limit, 1, 25);
  const apiKey = getApiKey();

  if (normalizedQuery.length < 2) {
    return {
      source: "fallback",
      data: [],
      warning: "Query must include at least 2 characters.",
    };
  }

  if (!apiKey) {
    return {
      source: "fallback",
      data: searchFallbackAirports(normalizedQuery, clampedLimit),
      warning: "AVIATIONSTACK_API_KEY is missing; using fallback reference data.",
    };
  }

  try {
    const payload = airportApiResponseSchema.parse(
      await requestAviationstackJson("/airports", {
        access_key: apiKey,
        search: normalizedQuery,
        limit: String(clampedLimit),
      }),
    );

    if (payload.error) {
      throw new Error(buildApiErrorMessage(payload.error));
    }

    const airports = (payload.data ?? [])
      .map((item): ReferenceAirport | null => {
        const iataCode = cleanIata(item.iata_code);
        const name = (item.airport_name ?? "").trim();
        const city = (item.city_name ?? "").trim();
        const country = (item.country_name ?? "").trim();

        if (iataCode.length !== 3 || name.length === 0) {
          return null;
        }

        return {
          iataCode,
          name,
          city: city || "Unknown",
          country: country || "Unknown",
          timezone: item.timezone ?? null,
        };
      })
      .filter((value): value is ReferenceAirport => value !== null)
      .slice(0, clampedLimit);

    if (airports.length === 0) {
      return {
        source: "fallback",
        data: searchFallbackAirports(normalizedQuery, clampedLimit),
        warning:
          "AviationStack returned no matching airports; fallback reference data returned.",
      };
    }

    return {
      source: "aviationstack",
      data: airports,
    };
  } catch (error) {
    const airportError = toErrorMessage(
      error,
      "AviationStack airports request failed.",
    );

    if (normalizedIata.length === 3) {
      try {
        const derivedAirports = await getAirportReferencesFromFlightsEndpoint(
          apiKey,
          normalizedIata,
          clampedLimit,
        );

        if (derivedAirports.length > 0) {
          return {
            source: "aviationstack",
            data: derivedAirports,
            warning:
              `AviationStack /airports unavailable (${airportError}); derived airport data from /flights endpoint.`,
          };
        }
      } catch {
        // Keep fallback behavior below.
      }
    }

    return {
      source: "fallback",
      data: searchFallbackAirports(normalizedQuery, clampedLimit),
      warning: `AviationStack reference request failed (${airportError}); fallback data returned.`,
    };
  }
}

export async function getRouteReferences(
  depIata: string,
  arrIata?: string,
  limit = 20,
): Promise<RouteReferenceResult> {
  const dep = cleanIata(depIata);
  const arr = cleanIata(arrIata) || undefined;
  const clampedLimit = clamp(limit, 1, 50);
  const apiKey = getApiKey();

  if (dep.length !== 3) {
    return {
      source: "fallback",
      data: [],
      warning: "depIata must be a valid 3-letter IATA code.",
    };
  }

  if (!apiKey) {
    return {
      source: "fallback",
      data: searchFallbackRoutes(dep, arr || undefined, clampedLimit),
      warning: "AVIATIONSTACK_API_KEY is missing; using fallback route data.",
    };
  }

  let routesEndpointError = "";

  try {
    const payload = routeApiResponseSchema.parse(
      await requestAviationstackJson("/routes", {
        access_key: apiKey,
        dep_iata: dep,
        arr_iata: arr ?? "",
        limit: String(clampedLimit),
      }),
    );

    if (payload.error) {
      throw new Error(buildApiErrorMessage(payload.error));
    }

    const routes = (payload.data ?? [])
      .map((item): ReferenceRoute | null => {
        const mappedDep = cleanIata(item.dep_iata ?? item.departure?.iata);
        const mappedArr = cleanIata(item.arr_iata ?? item.arrival?.iata);

        if (mappedDep.length !== 3 || mappedArr.length !== 3) {
          return null;
        }

        return {
          airlineName: item.airline_name ?? null,
          airlineIata: cleanIata(item.airline_iata) || null,
          flightNumber: (item.flight_number ?? "").trim() || null,
          depIata: mappedDep,
          arrIata: mappedArr,
        };
      })
      .filter((value): value is ReferenceRoute => value !== null)
      .slice(0, clampedLimit);

    if (routes.length === 0) {
      return {
        source: "fallback",
        data: searchFallbackRoutes(dep, arr || undefined, clampedLimit),
        warning: "AviationStack returned no matching routes; fallback route data returned.",
      };
    }

    return {
      source: "aviationstack",
      data: routes,
    };
  } catch (error) {
    routesEndpointError = toErrorMessage(
      error,
      "AviationStack routes request failed.",
    );
  }

  try {
    const routesFromFlights = await getRouteReferencesFromFlightsEndpoint(
      apiKey,
      dep,
      arr,
      clampedLimit,
    );

    if (routesFromFlights.length > 0) {
      return {
        source: "aviationstack",
        data: routesFromFlights,
        warning:
          routesEndpointError.length > 0
            ? `AviationStack /routes unavailable (${routesEndpointError}); route data derived from /flights endpoint.`
            : "Route data derived from AviationStack /flights endpoint.",
      };
    }
  } catch (error) {
    if (!routesEndpointError) {
      routesEndpointError = toErrorMessage(
        error,
        "AviationStack flights request failed.",
      );
    }
  }

  return {
    source: "fallback",
    data: searchFallbackRoutes(dep, arr, clampedLimit),
    warning:
      routesEndpointError.length > 0
        ? `AviationStack reference requests failed (${routesEndpointError}); fallback route data returned.`
        : "AviationStack returned no matching routes; fallback route data returned.",
  };
}
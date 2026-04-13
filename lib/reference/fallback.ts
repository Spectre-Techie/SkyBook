export type ReferenceAirport = {
  iataCode: string;
  name: string;
  city: string;
  country: string;
  timezone: string | null;
};

export type ReferenceRoute = {
  airlineName: string | null;
  airlineIata: string | null;
  flightNumber: string | null;
  depIata: string;
  arrIata: string;
};

const FALLBACK_AIRPORTS: ReferenceAirport[] = [
  {
    iataCode: "JFK",
    name: "John F. Kennedy International Airport",
    city: "New York",
    country: "United States",
    timezone: "America/New_York",
  },
  {
    iataCode: "LAX",
    name: "Los Angeles International Airport",
    city: "Los Angeles",
    country: "United States",
    timezone: "America/Los_Angeles",
  },
  {
    iataCode: "ORD",
    name: "O'Hare International Airport",
    city: "Chicago",
    country: "United States",
    timezone: "America/Chicago",
  },
  {
    iataCode: "ATL",
    name: "Hartsfield Jackson Atlanta International Airport",
    city: "Atlanta",
    country: "United States",
    timezone: "America/New_York",
  },
  {
    iataCode: "LHR",
    name: "Heathrow Airport",
    city: "London",
    country: "United Kingdom",
    timezone: "Europe/London",
  },
  {
    iataCode: "CDG",
    name: "Charles de Gaulle Airport",
    city: "Paris",
    country: "France",
    timezone: "Europe/Paris",
  },
  {
    iataCode: "DXB",
    name: "Dubai International Airport",
    city: "Dubai",
    country: "United Arab Emirates",
    timezone: "Asia/Dubai",
  },
  {
    iataCode: "SIN",
    name: "Singapore Changi Airport",
    city: "Singapore",
    country: "Singapore",
    timezone: "Asia/Singapore",
  },
  {
    iataCode: "HND",
    name: "Tokyo Haneda Airport",
    city: "Tokyo",
    country: "Japan",
    timezone: "Asia/Tokyo",
  },
  {
    iataCode: "DOH",
    name: "Hamad International Airport",
    city: "Doha",
    country: "Qatar",
    timezone: "Asia/Qatar",
  },
  {
    iataCode: "LOS",
    name: "Murtala Muhammed International Airport",
    city: "Lagos",
    country: "Nigeria",
    timezone: "Africa/Lagos",
  },
  {
    iataCode: "NBO",
    name: "Jomo Kenyatta International Airport",
    city: "Nairobi",
    country: "Kenya",
    timezone: "Africa/Nairobi",
  },
  {
    iataCode: "JNB",
    name: "O.R. Tambo International Airport",
    city: "Johannesburg",
    country: "South Africa",
    timezone: "Africa/Johannesburg",
  },
  {
    iataCode: "ACC",
    name: "Kotoka International Airport",
    city: "Accra",
    country: "Ghana",
    timezone: "Africa/Accra",
  },
  {
    iataCode: "CPT",
    name: "Cape Town International Airport",
    city: "Cape Town",
    country: "South Africa",
    timezone: "Africa/Johannesburg",
  },
];

const FALLBACK_ROUTES: ReferenceRoute[] = [
  {
    airlineName: "SkyBook Demo Air",
    airlineIata: "SB",
    flightNumber: "SB101",
    depIata: "JFK",
    arrIata: "LAX",
  },
  {
    airlineName: "SkyBook Demo Air",
    airlineIata: "SB",
    flightNumber: "SB102",
    depIata: "LAX",
    arrIata: "JFK",
  },
  {
    airlineName: "SkyBook Demo Air",
    airlineIata: "SB",
    flightNumber: "SB201",
    depIata: "LHR",
    arrIata: "CDG",
  },
  {
    airlineName: "SkyBook Demo Air",
    airlineIata: "SB",
    flightNumber: "SB202",
    depIata: "CDG",
    arrIata: "LHR",
  },
  {
    airlineName: "SkyBook Demo Air",
    airlineIata: "SB",
    flightNumber: "SB301",
    depIata: "DXB",
    arrIata: "DOH",
  },
  {
    airlineName: "SkyBook Demo Air",
    airlineIata: "SB",
    flightNumber: "SB401",
    depIata: "LOS",
    arrIata: "NBO",
  },
  {
    airlineName: "SkyBook Demo Air",
    airlineIata: "SB",
    flightNumber: "SB402",
    depIata: "NBO",
    arrIata: "JNB",
  },
  {
    airlineName: "SkyBook Demo Air",
    airlineIata: "SB",
    flightNumber: "SB403",
    depIata: "ACC",
    arrIata: "CPT",
  },
];

export function searchFallbackAirports(
  query: string,
  limit = 10,
): ReferenceAirport[] {
  const normalizedQuery = query.trim().toLowerCase();
  const clampedLimit = Math.min(Math.max(limit, 1), 25);

  if (!normalizedQuery) {
    return [];
  }

  return FALLBACK_AIRPORTS.filter((airport) => {
    return [
      airport.iataCode,
      airport.name,
      airport.city,
      airport.country,
    ].some((value) => value.toLowerCase().includes(normalizedQuery));
  }).slice(0, clampedLimit);
}

export function searchFallbackRoutes(
  depIata: string,
  arrIata?: string,
  limit = 20,
): ReferenceRoute[] {
  const dep = depIata.trim().toUpperCase();
  const arr = arrIata?.trim().toUpperCase();
  const clampedLimit = Math.min(Math.max(limit, 1), 50);

  if (!dep) {
    return [];
  }

  return FALLBACK_ROUTES.filter((route) => {
    if (route.depIata !== dep) {
      return false;
    }

    if (arr && route.arrIata !== arr) {
      return false;
    }

    return true;
  }).slice(0, clampedLimit);
}
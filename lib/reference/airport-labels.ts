export type AirportDirectoryItem = {
  iataCode: string;
  city: string;
  airportName: string;
  country: string;
};

const AIRPORT_DIRECTORY: AirportDirectoryItem[] = [
  {
    iataCode: "ABV",
    city: "Abuja",
    airportName: "Nnamdi Azikiwe International Airport",
    country: "Nigeria",
  },
  {
    iataCode: "ACC",
    city: "Accra",
    airportName: "Kotoka International Airport",
    country: "Ghana",
  },
  {
    iataCode: "ADD",
    city: "Addis Ababa",
    airportName: "Bole International Airport",
    country: "Ethiopia",
  },
  {
    iataCode: "AMS",
    city: "Amsterdam",
    airportName: "Amsterdam Airport Schiphol",
    country: "Netherlands",
  },
  {
    iataCode: "ATL",
    city: "Atlanta",
    airportName: "Hartsfield-Jackson Atlanta International Airport",
    country: "United States",
  },
  {
    iataCode: "CAI",
    city: "Cairo",
    airportName: "Cairo International Airport",
    country: "Egypt",
  },
  {
    iataCode: "CDG",
    city: "Paris",
    airportName: "Charles de Gaulle Airport",
    country: "France",
  },
  {
    iataCode: "CPT",
    city: "Cape Town",
    airportName: "Cape Town International Airport",
    country: "South Africa",
  },
  {
    iataCode: "DOH",
    city: "Doha",
    airportName: "Hamad International Airport",
    country: "Qatar",
  },
  {
    iataCode: "DXB",
    city: "Dubai",
    airportName: "Dubai International Airport",
    country: "United Arab Emirates",
  },
  {
    iataCode: "FRA",
    city: "Frankfurt",
    airportName: "Frankfurt Airport",
    country: "Germany",
  },
  {
    iataCode: "HND",
    city: "Tokyo",
    airportName: "Haneda Airport",
    country: "Japan",
  },
  {
    iataCode: "IST",
    city: "Istanbul",
    airportName: "Istanbul Airport",
    country: "Turkey",
  },
  {
    iataCode: "JFK",
    city: "New York",
    airportName: "John F. Kennedy International Airport",
    country: "United States",
  },
  {
    iataCode: "JNB",
    city: "Johannesburg",
    airportName: "O.R. Tambo International Airport",
    country: "South Africa",
  },
  {
    iataCode: "LAX",
    city: "Los Angeles",
    airportName: "Los Angeles International Airport",
    country: "United States",
  },
  {
    iataCode: "LHR",
    city: "London",
    airportName: "Heathrow Airport",
    country: "United Kingdom",
  },
  {
    iataCode: "LOS",
    city: "Lagos",
    airportName: "Murtala Muhammed International Airport",
    country: "Nigeria",
  },
  {
    iataCode: "NBO",
    city: "Nairobi",
    airportName: "Jomo Kenyatta International Airport",
    country: "Kenya",
  },
  {
    iataCode: "ORD",
    city: "Chicago",
    airportName: "O'Hare International Airport",
    country: "United States",
  },
  {
    iataCode: "SIN",
    city: "Singapore",
    airportName: "Singapore Changi Airport",
    country: "Singapore",
  },
];

const AIRPORT_CITY_BY_IATA: Record<string, string> = AIRPORT_DIRECTORY.reduce(
  (acc, airport) => {
    acc[airport.iataCode] = airport.city;
    return acc;
  },
  {} as Record<string, string>,
);

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function extractIataFromText(value: string): string | null {
  const normalized = value.trim().toUpperCase();

  if (/^[A-Z]{3}$/.test(normalized)) {
    return normalized;
  }

  const parenthesized = normalized.match(/\(([A-Z]{3})\)/);
  if (parenthesized) {
    return parenthesized[1];
  }

  const standaloneCodes = normalized.match(/\b[A-Z]{3}\b/g);
  if (standaloneCodes && standaloneCodes.length > 0) {
    return standaloneCodes[standaloneCodes.length - 1];
  }

  return null;
}

export function getAirportDirectory(): AirportDirectoryItem[] {
  return AIRPORT_DIRECTORY;
}

export function formatAirportLabel(iataCode: string): string {
  const code = iataCode.trim().toUpperCase();
  if (!code) {
    return "";
  }

  const city = AIRPORT_CITY_BY_IATA[code];
  return city ? `${city} (${code})` : code;
}

export function resolveAirportCode(input: string): string | null {
  const directMatch = extractIataFromText(input);
  if (directMatch) {
    return directMatch;
  }

  const normalizedInput = normalizeSearchText(input);
  if (!normalizedInput) {
    return null;
  }

  const exact = AIRPORT_DIRECTORY.find((airport) => {
    return [
      airport.city,
      airport.airportName,
      `${airport.city} ${airport.country}`,
      formatAirportLabel(airport.iataCode),
    ].some((candidate) => normalizeSearchText(candidate) === normalizedInput);
  });

  if (exact) {
    return exact.iataCode;
  }

  const partial = AIRPORT_DIRECTORY.find((airport) => {
    return normalizeSearchText(
      `${airport.city} ${airport.airportName} ${airport.country}`,
    ).includes(normalizedInput);
  });

  return partial?.iataCode ?? null;
}

export function formatRouteLabel(origin: string, destination: string): string {
  return `${formatAirportLabel(origin)} to ${formatAirportLabel(destination)}`;
}

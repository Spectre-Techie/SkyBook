import { FlightStatus, Prisma } from "@prisma/client";

type FlightWriteClient = {
  flight: {
    count(args: Prisma.FlightCountArgs): Promise<number>;
    createMany(
      args: Prisma.FlightCreateManyArgs,
    ): Promise<{ count: number }>;
  };
};

type MockRouteTemplate = {
  code: string;
  origin: string;
  destination: string;
  departureHourUtc: number;
  departureMinuteUtc: number;
  durationMinutes: number;
  totalSeats: number;
  basePrice: number;
};

const MAX_DAYS_AHEAD = 30;
const DEFAULT_DAYS_AHEAD = 30;
const DEFAULT_MIN_UPCOMING_ACTIVE = 240;

const MOCK_ROUTE_TEMPLATES: MockRouteTemplate[] = [
  {
    code: "SB1",
    origin: "LOS",
    destination: "NBO",
    departureHourUtc: 7,
    departureMinuteUtc: 10,
    durationMinutes: 300,
    totalSeats: 164,
    basePrice: 205,
  },
  {
    code: "SB2",
    origin: "NBO",
    destination: "LOS",
    departureHourUtc: 13,
    departureMinuteUtc: 40,
    durationMinutes: 305,
    totalSeats: 164,
    basePrice: 210,
  },
  {
    code: "SB3",
    origin: "LOS",
    destination: "ACC",
    departureHourUtc: 9,
    departureMinuteUtc: 0,
    durationMinutes: 75,
    totalSeats: 122,
    basePrice: 118,
  },
  {
    code: "SB4",
    origin: "ACC",
    destination: "LOS",
    departureHourUtc: 17,
    departureMinuteUtc: 25,
    durationMinutes: 75,
    totalSeats: 122,
    basePrice: 121,
  },
  {
    code: "SB5",
    origin: "JNB",
    destination: "CPT",
    departureHourUtc: 6,
    departureMinuteUtc: 35,
    durationMinutes: 125,
    totalSeats: 148,
    basePrice: 140,
  },
  {
    code: "SB6",
    origin: "CPT",
    destination: "JNB",
    departureHourUtc: 16,
    departureMinuteUtc: 45,
    durationMinutes: 125,
    totalSeats: 148,
    basePrice: 142,
  },
  {
    code: "SB7",
    origin: "LHR",
    destination: "CDG",
    departureHourUtc: 8,
    departureMinuteUtc: 30,
    durationMinutes: 85,
    totalSeats: 128,
    basePrice: 156,
  },
  {
    code: "SB8",
    origin: "CDG",
    destination: "LHR",
    departureHourUtc: 14,
    departureMinuteUtc: 55,
    durationMinutes: 85,
    totalSeats: 128,
    basePrice: 159,
  },
  {
    code: "SB9",
    origin: "DXB",
    destination: "DOH",
    departureHourUtc: 10,
    departureMinuteUtc: 20,
    durationMinutes: 80,
    totalSeats: 146,
    basePrice: 170,
  },
  {
    code: "SBA",
    origin: "DOH",
    destination: "DXB",
    departureHourUtc: 19,
    departureMinuteUtc: 10,
    durationMinutes: 80,
    totalSeats: 146,
    basePrice: 172,
  },
  {
    code: "SBB",
    origin: "JFK",
    destination: "LAX",
    departureHourUtc: 12,
    departureMinuteUtc: 15,
    durationMinutes: 360,
    totalSeats: 186,
    basePrice: 280,
  },
  {
    code: "SBC",
    origin: "LAX",
    destination: "JFK",
    departureHourUtc: 18,
    departureMinuteUtc: 25,
    durationMinutes: 345,
    totalSeats: 186,
    basePrice: 289,
  },
  {
    code: "SBD",
    origin: "LOS",
    destination: "JNB",
    departureHourUtc: 11,
    departureMinuteUtc: 5,
    durationMinutes: 360,
    totalSeats: 172,
    basePrice: 238,
  },
  {
    code: "SBE",
    origin: "JNB",
    destination: "LOS",
    departureHourUtc: 21,
    departureMinuteUtc: 20,
    durationMinutes: 355,
    totalSeats: 172,
    basePrice: 241,
  },
  {
    code: "SBF",
    origin: "NBO",
    destination: "ACC",
    departureHourUtc: 9,
    departureMinuteUtc: 50,
    durationMinutes: 330,
    totalSeats: 154,
    basePrice: 224,
  },
  {
    code: "SBG",
    origin: "ACC",
    destination: "NBO",
    departureHourUtc: 15,
    departureMinuteUtc: 10,
    durationMinutes: 325,
    totalSeats: 154,
    basePrice: 221,
  },
  {
    code: "SBH",
    origin: "NBO",
    destination: "JNB",
    departureHourUtc: 6,
    departureMinuteUtc: 50,
    durationMinutes: 255,
    totalSeats: 150,
    basePrice: 182,
  },
  {
    code: "SBI",
    origin: "JNB",
    destination: "NBO",
    departureHourUtc: 13,
    departureMinuteUtc: 35,
    durationMinutes: 250,
    totalSeats: 150,
    basePrice: 180,
  },
  {
    code: "SBJ",
    origin: "LOS",
    destination: "DXB",
    departureHourUtc: 22,
    departureMinuteUtc: 5,
    durationMinutes: 420,
    totalSeats: 178,
    basePrice: 308,
  },
  {
    code: "SBK",
    origin: "DXB",
    destination: "LOS",
    departureHourUtc: 4,
    departureMinuteUtc: 55,
    durationMinutes: 430,
    totalSeats: 178,
    basePrice: 312,
  },
  {
    code: "SBL",
    origin: "NBO",
    destination: "DOH",
    departureHourUtc: 23,
    departureMinuteUtc: 15,
    durationMinutes: 310,
    totalSeats: 162,
    basePrice: 266,
  },
  {
    code: "SBM",
    origin: "DOH",
    destination: "NBO",
    departureHourUtc: 6,
    departureMinuteUtc: 25,
    durationMinutes: 305,
    totalSeats: 162,
    basePrice: 262,
  },
  {
    code: "SBN",
    origin: "LHR",
    destination: "DXB",
    departureHourUtc: 7,
    departureMinuteUtc: 40,
    durationMinutes: 425,
    totalSeats: 188,
    basePrice: 348,
  },
  {
    code: "SBO",
    origin: "DXB",
    destination: "LHR",
    departureHourUtc: 16,
    departureMinuteUtc: 30,
    durationMinutes: 430,
    totalSeats: 188,
    basePrice: 352,
  },
  {
    code: "SBP",
    origin: "CDG",
    destination: "DOH",
    departureHourUtc: 12,
    departureMinuteUtc: 20,
    durationMinutes: 390,
    totalSeats: 176,
    basePrice: 322,
  },
  {
    code: "SBQ",
    origin: "DOH",
    destination: "CDG",
    departureHourUtc: 3,
    departureMinuteUtc: 45,
    durationMinutes: 395,
    totalSeats: 176,
    basePrice: 326,
  },
  {
    code: "SBR",
    origin: "JFK",
    destination: "LHR",
    departureHourUtc: 20,
    departureMinuteUtc: 10,
    durationMinutes: 415,
    totalSeats: 214,
    basePrice: 399,
  },
  {
    code: "SBS",
    origin: "LHR",
    destination: "JFK",
    departureHourUtc: 14,
    departureMinuteUtc: 10,
    durationMinutes: 430,
    totalSeats: 214,
    basePrice: 406,
  },
  {
    code: "SBT",
    origin: "LAX",
    destination: "DXB",
    departureHourUtc: 5,
    departureMinuteUtc: 40,
    durationMinutes: 960,
    totalSeats: 232,
    basePrice: 552,
  },
  {
    code: "SBU",
    origin: "DXB",
    destination: "LAX",
    departureHourUtc: 1,
    departureMinuteUtc: 15,
    durationMinutes: 980,
    totalSeats: 232,
    basePrice: 560,
  },
  {
    code: "SBV",
    origin: "ORD",
    destination: "JFK",
    departureHourUtc: 9,
    departureMinuteUtc: 5,
    durationMinutes: 130,
    totalSeats: 138,
    basePrice: 148,
  },
  {
    code: "SBW",
    origin: "JFK",
    destination: "ORD",
    departureHourUtc: 18,
    departureMinuteUtc: 35,
    durationMinutes: 140,
    totalSeats: 138,
    basePrice: 150,
  },
  {
    code: "SBX",
    origin: "ATL",
    destination: "LAX",
    departureHourUtc: 15,
    departureMinuteUtc: 0,
    durationMinutes: 295,
    totalSeats: 166,
    basePrice: 236,
  },
  {
    code: "SBY",
    origin: "LAX",
    destination: "ATL",
    departureHourUtc: 8,
    departureMinuteUtc: 45,
    durationMinutes: 285,
    totalSeats: 166,
    basePrice: 239,
  },
  {
    code: "SBZ",
    origin: "SIN",
    destination: "HND",
    departureHourUtc: 2,
    departureMinuteUtc: 10,
    durationMinutes: 420,
    totalSeats: 174,
    basePrice: 332,
  },
  {
    code: "SCA",
    origin: "HND",
    destination: "SIN",
    departureHourUtc: 10,
    departureMinuteUtc: 25,
    durationMinutes: 430,
    totalSeats: 174,
    basePrice: 336,
  },
  {
    code: "SCB",
    origin: "ABV",
    destination: "LOS",
    departureHourUtc: 7,
    departureMinuteUtc: 25,
    durationMinutes: 70,
    totalSeats: 122,
    basePrice: 112,
  },
  {
    code: "SCC",
    origin: "LOS",
    destination: "ABV",
    departureHourUtc: 18,
    departureMinuteUtc: 15,
    durationMinutes: 70,
    totalSeats: 122,
    basePrice: 114,
  },
  {
    code: "SCD",
    origin: "CAI",
    destination: "DXB",
    departureHourUtc: 5,
    departureMinuteUtc: 55,
    durationMinutes: 200,
    totalSeats: 148,
    basePrice: 212,
  },
  {
    code: "SCE",
    origin: "DXB",
    destination: "CAI",
    departureHourUtc: 14,
    departureMinuteUtc: 35,
    durationMinutes: 205,
    totalSeats: 148,
    basePrice: 214,
  },
  {
    code: "SCF",
    origin: "ADD",
    destination: "NBO",
    departureHourUtc: 11,
    departureMinuteUtc: 10,
    durationMinutes: 125,
    totalSeats: 132,
    basePrice: 146,
  },
  {
    code: "SCG",
    origin: "NBO",
    destination: "ADD",
    departureHourUtc: 16,
    departureMinuteUtc: 5,
    durationMinutes: 125,
    totalSeats: 132,
    basePrice: 145,
  },
  {
    code: "SCH",
    origin: "FRA",
    destination: "LHR",
    departureHourUtc: 6,
    departureMinuteUtc: 45,
    durationMinutes: 110,
    totalSeats: 144,
    basePrice: 162,
  },
  {
    code: "SCI",
    origin: "LHR",
    destination: "FRA",
    departureHourUtc: 20,
    departureMinuteUtc: 55,
    durationMinutes: 110,
    totalSeats: 144,
    basePrice: 164,
  },
  {
    code: "SCJ",
    origin: "IST",
    destination: "CDG",
    departureHourUtc: 9,
    departureMinuteUtc: 25,
    durationMinutes: 220,
    totalSeats: 152,
    basePrice: 206,
  },
  {
    code: "SCK",
    origin: "CDG",
    destination: "IST",
    departureHourUtc: 17,
    departureMinuteUtc: 20,
    durationMinutes: 220,
    totalSeats: 152,
    basePrice: 208,
  },
  {
    code: "SCL",
    origin: "AMS",
    destination: "LHR",
    departureHourUtc: 7,
    departureMinuteUtc: 15,
    durationMinutes: 75,
    totalSeats: 126,
    basePrice: 138,
  },
  {
    code: "SCM",
    origin: "LHR",
    destination: "AMS",
    departureHourUtc: 18,
    departureMinuteUtc: 10,
    durationMinutes: 80,
    totalSeats: 126,
    basePrice: 140,
  },
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getDayOfYear(date: Date): number {
  const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 1);
  const currentDay = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );

  return Math.floor((currentDay - startOfYear) / 86_400_000) + 1;
}

function createUtcDeparture(
  now: Date,
  dayOffset: number,
  hourUtc: number,
  minuteUtc: number,
): Date {
  const departure = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      hourUtc,
      minuteUtc,
      0,
      0,
    ),
  );
  departure.setUTCDate(departure.getUTCDate() + dayOffset);
  return departure;
}

function buildFlightNumber(routeCode: string, departureDate: Date): string {
  const year = String(departureDate.getUTCFullYear()).slice(-2);
  const dayOfYear = String(getDayOfYear(departureDate)).padStart(3, "0");
  return `${routeCode}${year}${dayOfYear}`;
}

function computePrice(basePrice: number, dayOffset: number): string {
  const variation = ((dayOffset % 5) - 2) * 0.015;
  const adjusted = Math.max(basePrice * (1 + variation), 50);
  return adjusted.toFixed(2);
}

export type SeedMockFlightsResult = {
  attempted: number;
  created: number;
  daysAhead: number;
  routesPerDay: number;
};

export async function seedMockFlights(
  client: FlightWriteClient,
  daysAhead = DEFAULT_DAYS_AHEAD,
): Promise<SeedMockFlightsResult> {
  const clampedDaysAhead = clamp(Math.floor(daysAhead), 1, MAX_DAYS_AHEAD);
  const now = new Date();
  const earliestAllowedDeparture = new Date(now.getTime() + 30 * 60 * 1000);

  const data: Prisma.FlightCreateManyInput[] = [];

  for (let dayOffset = 0; dayOffset < clampedDaysAhead; dayOffset += 1) {
    for (const template of MOCK_ROUTE_TEMPLATES) {
      const departure = createUtcDeparture(
        now,
        dayOffset,
        template.departureHourUtc,
        template.departureMinuteUtc,
      );

      if (departure <= earliestAllowedDeparture) {
        continue;
      }

      const arrival = new Date(departure.getTime() + template.durationMinutes * 60 * 1000);
      const flightNumber = buildFlightNumber(template.code, departure);

      data.push({
        flightNumber,
        origin: template.origin,
        destination: template.destination,
        departureDateTime: departure,
        arrivalDateTime: arrival,
        totalSeats: template.totalSeats,
        pricePerSeat: computePrice(template.basePrice, dayOffset),
        status: FlightStatus.ACTIVE,
      });
    }
  }

  if (data.length === 0) {
    return {
      attempted: 0,
      created: 0,
      daysAhead: clampedDaysAhead,
      routesPerDay: MOCK_ROUTE_TEMPLATES.length,
    };
  }

  const created = await client.flight.createMany({
    data,
    skipDuplicates: true,
  });

  return {
    attempted: data.length,
    created: created.count,
    daysAhead: clampedDaysAhead,
    routesPerDay: MOCK_ROUTE_TEMPLATES.length,
  };
}

export type EnsureMockFlightsResult = {
  seeded: boolean;
  upcomingActiveFlights: number;
  minimumUpcomingActive: number;
  attempted: number;
  created: number;
  daysAhead: number;
};

export async function ensureMockFlights(
  client: FlightWriteClient,
  options?: {
    minimumUpcomingActive?: number;
    daysAhead?: number;
  },
): Promise<EnsureMockFlightsResult> {
  const minimumUpcomingActive = clamp(
    Math.floor(options?.minimumUpcomingActive ?? DEFAULT_MIN_UPCOMING_ACTIVE),
    1,
    400,
  );
  const daysAhead = clamp(
    Math.floor(options?.daysAhead ?? DEFAULT_DAYS_AHEAD),
    1,
    MAX_DAYS_AHEAD,
  );

  const now = new Date();
  const upcomingActiveFlights = await client.flight.count({
    where: {
      status: FlightStatus.ACTIVE,
      departureDateTime: {
        gte: now,
      },
    },
  });

  if (upcomingActiveFlights >= minimumUpcomingActive) {
    return {
      seeded: false,
      upcomingActiveFlights,
      minimumUpcomingActive,
      attempted: 0,
      created: 0,
      daysAhead,
    };
  }

  const seeded = await seedMockFlights(client, daysAhead);

  return {
    seeded: true,
    upcomingActiveFlights,
    minimumUpcomingActive,
    attempted: seeded.attempted,
    created: seeded.created,
    daysAhead: seeded.daysAhead,
  };
}

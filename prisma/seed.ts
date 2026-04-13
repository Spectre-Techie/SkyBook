import "dotenv/config";

import { UserRole } from "@prisma/client";
import { hash } from "bcryptjs";

import { prisma } from "@/lib/db";

type SeedFlight = {
  flightNumber: string;
  origin: string;
  destination: string;
  departureOffsetDays: number;
  departureHourUtc: number;
  durationHours: number;
  totalSeats: number;
  pricePerSeat: string;
};

const SEED_FLIGHTS: SeedFlight[] = [
  {
    flightNumber: "SB101",
    origin: "JFK",
    destination: "LAX",
    departureOffsetDays: 1,
    departureHourUtc: 13,
    durationHours: 6,
    totalSeats: 180,
    pricePerSeat: "249.00",
  },
  {
    flightNumber: "SB102",
    origin: "LAX",
    destination: "JFK",
    departureOffsetDays: 1,
    departureHourUtc: 17,
    durationHours: 5,
    totalSeats: 180,
    pricePerSeat: "259.00",
  },
  {
    flightNumber: "SB201",
    origin: "LOS",
    destination: "NBO",
    departureOffsetDays: 2,
    departureHourUtc: 10,
    durationHours: 5,
    totalSeats: 140,
    pricePerSeat: "189.00",
  },
  {
    flightNumber: "SB301",
    origin: "LHR",
    destination: "CDG",
    departureOffsetDays: 3,
    departureHourUtc: 8,
    durationHours: 2,
    totalSeats: 110,
    pricePerSeat: "129.00",
  },
  {
    flightNumber: "SB401",
    origin: "DXB",
    destination: "DOH",
    departureOffsetDays: 3,
    departureHourUtc: 14,
    durationHours: 1,
    totalSeats: 100,
    pricePerSeat: "149.00",
  },
];

function getDateAtUtcHour(daysFromNow: number, hourUtc: number): Date {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const day = now.getUTCDate() + daysFromNow;

  return new Date(Date.UTC(year, month, day, hourUtc, 0, 0, 0));
}

async function seedFlights(): Promise<void> {
  for (const flight of SEED_FLIGHTS) {
    const departureDateTime = getDateAtUtcHour(
      flight.departureOffsetDays,
      flight.departureHourUtc,
    );
    const arrivalDateTime = new Date(
      departureDateTime.getTime() + flight.durationHours * 60 * 60 * 1000,
    );

    await prisma.flight.upsert({
      where: { flightNumber: flight.flightNumber },
      update: {
        origin: flight.origin,
        destination: flight.destination,
        departureDateTime,
        arrivalDateTime,
        totalSeats: flight.totalSeats,
        pricePerSeat: flight.pricePerSeat,
      },
      create: {
        flightNumber: flight.flightNumber,
        origin: flight.origin,
        destination: flight.destination,
        departureDateTime,
        arrivalDateTime,
        totalSeats: flight.totalSeats,
        pricePerSeat: flight.pricePerSeat,
      },
    });
  }
}

async function seedAdminFromEnv(): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? "";
  const adminPassword = process.env.ADMIN_PASSWORD?.trim() ?? "";
  const adminFullName =
    process.env.ADMIN_FULL_NAME?.trim() || "SkyBook Administrator";

  if (!adminEmail || !adminPassword) {
    console.info(
      "Skipping admin seed. Set ADMIN_EMAIL and ADMIN_PASSWORD in .env to seed admin user.",
    );
    return;
  }

  const passwordHash = await hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      fullName: adminFullName,
      role: UserRole.ADMIN,
      passwordHash,
    },
    create: {
      email: adminEmail,
      fullName: adminFullName,
      role: UserRole.ADMIN,
      passwordHash,
    },
  });
}

async function main(): Promise<void> {
  await seedFlights();
  await seedAdminFromEnv();
  console.info("Seed complete.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
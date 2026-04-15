import "dotenv/config";

import { UserRole } from "@prisma/client";
import { hash } from "bcryptjs";

import { prisma } from "@/lib/db";
import { seedMockFlights } from "@/lib/flights/mock";

async function seedFlights(): Promise<void> {
  const seeded = await seedMockFlights(prisma, 30);
  console.info(
    `Mock flight inventory seeded: ${seeded.created}/${seeded.attempted} created for ${seeded.daysAhead} day(s).`,
  );
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
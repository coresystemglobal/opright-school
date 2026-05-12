/**
 * Idempotent seed for the platform MASTER user.
 * Run once: npx ts-node src/utils/seedMaster.ts
 * Or: tsx src/utils/seedMaster.ts
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { ServiceDenialQueue } from "../workers/serviceDenialWorker";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.MASTER_EMAIL ?? "master@platform.internal";
  const password = process.env.MASTER_PASSWORD ?? "ChangeMeNow!2025";

  const existing = await prisma.user.findFirst({ where: { email, isMaster: true } });
  if (existing) {
    console.log(`MASTER user already exists: ${email}`);
    return;
  }

  // MASTER lives in a platform tenant (not school-tenant-scoped)
  let platformTenant = await prisma.tenant.findFirst({ where: { subdomain: "platform" } });
  if (!platformTenant) {
    platformTenant = await prisma.tenant.create({
      data: {
        name: "Platform Admin",
        subdomain: "platform",
        schoolCode: "PLT",
      },
    });
    console.log("Created platform tenant:", platformTenant.id);
  }

  const hash = await bcrypt.hash(password, 12);
  const master = await prisma.user.create({
    data: {
      tenantId: platformTenant.id,
      email,
      password: hash,
      firstName: "Platform",
      lastName: "Admin",
      isMaster: true,
    },
  });

  console.log(`MASTER user created: ${master.email} (id: ${master.id})`);
  console.log("IMPORTANT: Change the password after first login.");

  // Register the nightly service-denial cron (idempotent — safe to re-run)
  if (process.env.QSTASH_TOKEN && process.env.APP_URL) {
    const cronResult = await ServiceDenialQueue.scheduleCron();
    if ("skipped" in cronResult) {
      console.log("Service denial cron already registered — skipped.");
    } else {
      console.log("Service denial cron registered (daily midnight UTC).");
    }
  } else {
    console.log("Skipping cron registration: QSTASH_TOKEN or APP_URL not set.");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

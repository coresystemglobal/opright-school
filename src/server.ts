// MUST BE FIRST — registers OTel patches on http/express/pg before they load
import './observability/instrument';
import "dotenv/config";
import app from "./app";
import prisma from "./prisma/client";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  PRISMA_DATABASE_URL: z.string().min(1, "PRISMA_DATABASE_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  ENCRYPTION_KEY: z
    .string()
    .regex(/^[a-fA-F0-9]{64}$/, "ENCRYPTION_KEY must be a 64-character hex string"),
  UPSTASH_REDIS_REST_URL: z.string().url("UPSTASH_REDIS_REST_URL must be a valid URL"),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1, "UPSTASH_REDIS_REST_TOKEN is required"),
  QSTASH_TOKEN: z.string().min(1, "QSTASH_TOKEN is required"),
  QSTASH_CURRENT_SIGNING_KEY: z.string().min(1, "QSTASH_CURRENT_SIGNING_KEY is required"),
  QSTASH_NEXT_SIGNING_KEY: z.string().min(1, "QSTASH_NEXT_SIGNING_KEY is required"),
  APP_URL: z.string().url("APP_URL must be a valid URL"),
  CORS_ORIGIN: z.string().optional(),
  BREVO_API_KEY: z.string().optional(),
  BREVO_FROM_EMAIL: z.string().email().optional(),
  BREVO_FROM_NAME: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ENDPOINT: z.string().url().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_REGION: z.string().optional(),
  PAYSTACK_SECRET_KEY: z.string().optional(),
  CLOUDFLARE_API_TOKEN: z.string().optional(),
  CLOUDFLARE_ZONE_ID: z.string().optional(),
  CLOUDFLARE_CNAME_TARGET: z.string().optional(),
  // Observability (all optional — app runs without them)
  SERVICE_NAME: z.string().optional(),
  SERVICE_VERSION: z.string().optional(),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).optional(),
  LOKI_URL: z.string().url().optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  SLOW_QUERY_THRESHOLD_MS: z.coerce.number().positive().optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("Environment validation failed:");
  for (const issue of parsedEnv.error.issues) {
    console.error(`- ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

const env = parsedEnv.data;
const port = env.PORT;

async function checkDatabase() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✔ Database connected');
  } catch (err: any) {
    console.error('✘ Database connection failed:', err.message);
  }
}

async function startServer() {
  app.listen(port, async () => {
    console.log(`✔ Server running on port ${port} [${env.NODE_ENV}]`);
    await checkDatabase();
  });
}

startServer();

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

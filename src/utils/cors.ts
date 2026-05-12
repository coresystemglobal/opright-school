import type { CorsOptions } from "cors";
import { ForbiddenError } from "./errors";

const DEFAULT_DEV_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
];

function isTenantHostedOrigin(origin: string) {
  return /^https?:\/\/[a-z0-9-]+\.(schoolos\.ng|eduplus\.[a-z]+)(:\d+)?$/i.test(origin);
}

function isDevelopmentLocalhostOrigin(env: NodeJS.ProcessEnv, origin: string) {
  return env.NODE_ENV !== "production" && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}

export function normalizeOrigin(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "");

  if (!trimmed) {
    return trimmed;
  }

  try {
    return new URL(trimmed).origin;
  } catch {
    return trimmed;
  }
}

export function resolveCorsOrigins(env: NodeJS.ProcessEnv = process.env) {
  const configuredOrigins = env.CORS_ORIGIN
    ? env.CORS_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean)
    : [];

  const fallbackOrigins = configuredOrigins.length > 0
    ? []
    : [env.APP_URL, ...DEFAULT_DEV_ORIGINS].filter((origin): origin is string => Boolean(origin));

  return new Set([...configuredOrigins, ...fallbackOrigins].map(normalizeOrigin).filter(Boolean));
}

export function buildCorsOptions(env: NodeJS.ProcessEnv = process.env): CorsOptions {
  const allowedOrigins = resolveCorsOrigins(env);

  return {
    credentials: true,
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.has(normalizeOrigin(origin))) {
        callback(null, true);
        return;
      }

      if (isDevelopmentLocalhostOrigin(env, origin)) {
        callback(null, true);
        return;
      }

      if (isTenantHostedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new ForbiddenError("CORS origin not allowed"));
    },
  };
}

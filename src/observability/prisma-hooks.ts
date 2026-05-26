import type { PrismaClient } from '@prisma/client';
import type pino from 'pino';
import type { Histogram, Counter } from 'prom-client';

const SLOW_QUERY_THRESHOLD_MS = Number(process.env.SLOW_QUERY_THRESHOLD_MS ?? 500);

export function attachPrismaObservability(
  prisma: PrismaClient,
  log: pino.Logger,
  dbQueryDuration: Histogram<string>,
  dbQueryErrors: Counter<string>,
): void {
  prisma.$use(async (params, next) => {
    const start = Date.now();
    const model = params.model ?? 'unknown';
    const operation = params.action;

    try {
      const result = await next(params);
      const durationMs = Date.now() - start;

      dbQueryDuration.observe(
        { operation, model, success: 'true' },
        durationMs / 1000,
      );

      if (durationMs > SLOW_QUERY_THRESHOLD_MS) {
        log.warn({
          msg: 'Slow Prisma query',
          duration_ms: durationMs,
          threshold_ms: SLOW_QUERY_THRESHOLD_MS,
          model,
          operation,
        });
      }

      return result;
    } catch (err: unknown) {
      const durationMs = Date.now() - start;
      const errorType = err instanceof Error ? err.constructor.name : 'UnknownError';

      dbQueryErrors.inc({ operation, model, error_type: errorType });

      dbQueryDuration.observe(
        { operation, model, success: 'false' },
        durationMs / 1000,
      );

      throw err;
    }
  });
}

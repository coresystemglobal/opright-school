import pino from 'pino';
import { trace } from '@opentelemetry/api';

export function createLogger(serviceName: string): pino.Logger {
  const isDev = process.env.NODE_ENV !== 'production';
  const lokiUrl = process.env.LOKI_URL;

  // Build transport targets: always stdout, conditionally Loki
  type TransportTarget = { target: string; options: Record<string, unknown>; level: string };
  const targets: TransportTarget[] = [
    {
      target: isDev ? 'pino-pretty' : 'pino/file',
      options: isDev ? { colorize: true } : { destination: 1 },
      level: process.env.LOG_LEVEL ?? 'info',
    },
  ];

  if (lokiUrl) {
    targets.push({
      target: 'pino-loki',
      options: {
        host: lokiUrl,
        batching: { interval: 5 },
        silenceErrors: false,
        labels: {
          service: serviceName,
          env: process.env.NODE_ENV ?? 'production',
        },
      },
      level: 'info',
    });
  }

  return pino({
    name: serviceName,
    level: process.env.LOG_LEVEL ?? 'info',
    formatters: {
      log(obj: Record<string, unknown>) {
        // Inject active OTel trace context into every log line
        // Enables log-to-trace correlation in Grafana Explore
        const span = trace.getActiveSpan();
        if (span) {
          const ctx = span.spanContext();
          return { ...obj, trace_id: ctx.traceId, span_id: ctx.spanId };
        }
        return obj;
      },
    },
    transport: { targets },
  });
}

// Singleton app logger — import this wherever you need structured logging
export const logger = createLogger(process.env.SERVICE_NAME ?? 'smp-server');

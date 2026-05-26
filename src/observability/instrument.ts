import { NodeSDK, resources } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

const SERVICE_NAME = process.env.SERVICE_NAME ?? 'smp-server';
const SERVICE_VERSION = process.env.SERVICE_VERSION ?? '1.0.0';

const exporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318/v1/traces',
});

export const sdk = new NodeSDK({
  resource: resources.resourceFromAttributes({
    [SEMRESATTRS_SERVICE_NAME]: SERVICE_NAME,
    [SEMRESATTRS_SERVICE_VERSION]: SERVICE_VERSION,
  }),
  traceExporter: exporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-pg': { enhancedDatabaseReporting: false },
      '@opentelemetry/instrumentation-http': { enabled: true },
      '@opentelemetry/instrumentation-express': { enabled: true },
      // Upstash Redis uses HTTP REST calls — not a socket client, skip socket-level instrumentation
      '@opentelemetry/instrumentation-ioredis': { enabled: false },
    } as Parameters<typeof getNodeAutoInstrumentations>[0]),
  ],
});

// Only start OTel when OTEL_EXPORTER_OTLP_ENDPOINT is configured
// This allows the app to run normally without a Tempo instance in dev
if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
  sdk.start();

  process.on('SIGTERM', () => {
    sdk.shutdown().catch(console.error);
  });
}

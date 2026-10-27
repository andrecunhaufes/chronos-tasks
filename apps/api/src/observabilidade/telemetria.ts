import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { Resource } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

// Exportador OTLP na porta 4317 e taxa de amostragem de traces em 10%,
// conforme `exporter.primary` e `sampling_rate_traces` do ASSET 23633.
const TAXA_AMOSTRAGEM_TRACES = 0.1;

let sdk: NodeSDK | undefined;

export function iniciarTelemetria(): void {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4317';

  sdk = new NodeSDK({
    resource: new Resource({
      [ATTR_SERVICE_NAME]: 'chronos-api',
      [ATTR_SERVICE_VERSION]: '0.1.0',
    }),
    traceExporter: new OTLPTraceExporter({ url: endpoint, timeoutMillis: 5000 }),
    sampler: {
      shouldSample: () => ({ decision: Math.random() < TAXA_AMOSTRAGEM_TRACES ? 1 : 0 }),
      toString: () => `TraceIdRatioBased{${TAXA_AMOSTRAGEM_TRACES}}`,
    },
    instrumentations: [
      getNodeAutoInstrumentations({
        // O log de acesso já é emitido pelo Pino; instrumentar fs polui o trace.
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  });

  sdk.start();
}

export async function encerrarTelemetria(): Promise<void> {
  await sdk?.shutdown();
}

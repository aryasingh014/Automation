// OpenTelemetry Configuration
// Note: Run `npm install` to get optional OTel packages

export interface TraceSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind: 'server' | 'client' | 'producer' | 'consumer' | 'internal';
  timestamp: number;
  duration: number;
  attributes: Record<string, string>;
  status: { code: number; message?: string };
  events: { name: string; timestamp: number }[];
  serviceName: string;
}

const serviceName = process.env.OTEL_SERVICE_NAME || 'observability-os';

export async function initOpenTelemetry() {
  try {
    // Dynamic imports - these won't load without optional packages installed
    const { NodeSDK } = await import('@opentelemetry/sdk-node');
    const { Resource } = await import('@opentelemetry/resources');
    const { SemanticResourceAttributes } = await import('@opentelemetry/semantic-conventions');

    const otelEnabled = process.env.OTEL_ENABLED === 'true';

    if (!otelEnabled) {
      console.log('[OTel] Disabled - set OTEL_ENABLED=true to enable');
      return null;
    }

    const sdk = new NodeSDK({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
      }),
    });

    sdk.start();
    console.log('[OTel] OpenTelemetry initialized');
    return sdk;
  } catch (error) {
    console.log('[OTel] Not available - install @opentelemetry packages to enable');
    return null;
  }
}

export function formatSpanForExport(span: any): TraceSpan {
  return {
    traceId: span.spanContext?.().traceId || '',
    spanId: span.spanContext?.().spanId || '',
    parentSpanId: span.parentSpanId,
    name: span.name || '',
    kind: span.kind || 'internal',
    timestamp: span.startTime ? (span.startTime[0] * 1000 + span.startTime[1] / 1000000) : Date.now(),
    duration: span.duration ? (span.duration[0] * 1000 + span.duration[1] / 1000000) : 0,
    attributes: span.attributes || {},
    status: span.status || { code: 0 },
    events: span.events || [],
    serviceName,
  };
}
import { registerOtel } from "@medusajs/medusa"
import { propagation } from "@opentelemetry/api"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc"
import { init } from "@sentry/node"
import { SentryPropagator, SentrySpanProcessor } from "@sentry/opentelemetry"

import { shouldCaptureException } from "./src/utils/errors"

init({
  beforeSend(event, hint) {
    if (!shouldCaptureException(hint.originalException)) {
      return null
    }
    return event
  },
  dsn: process.env["SENTRY_DSN"],
  tracesSampleRate: Number(process.env["SENTRY_TRACES_SAMPLE_RATE"] ?? "1.0"),
})

propagation.setGlobalPropagator(new SentryPropagator())

export const register = () => {
  registerOtel({
    instrument: {
      db: true,
      http: true,
      query: true,
      workflows: true,
    },
    serviceName: process.env["SENTRY_NAME"] ?? "medusa-default",
    spanProcessors: [new SentrySpanProcessor()],
    traceExporter: new OTLPTraceExporter(),
  })
}

import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  otlpExporterMock,
  registerOtel,
  sentryInit,
  sentryPropagatorMock,
  sentrySpanProcessorMock,
  setGlobalPropagator,
} = vi.hoisted(() => ({
  otlpExporterMock: vi.fn(),
  registerOtel: vi.fn(),
  sentryInit: vi.fn(),
  sentryPropagatorMock: vi.fn(),
  sentrySpanProcessorMock: vi.fn(),
  setGlobalPropagator: vi.fn(),
}))

vi.mock(import("@medusajs/medusa"), () => ({
  registerOtel,
}))

vi.mock(import("@opentelemetry/api"), () => ({
  default: {
    propagation: {
      setGlobalPropagator,
    },
  },
  propagation: {
    setGlobalPropagator,
  },
}))

vi.mock(import("@opentelemetry/exporter-trace-otlp-grpc"), () => ({
  OTLPTraceExporter: otlpExporterMock,
}))

vi.mock(import("@sentry/opentelemetry"), () => ({
  SentryPropagator: sentryPropagatorMock,
  SentrySpanProcessor: sentrySpanProcessorMock,
}))

vi.mock(import("@sentry/node"), () => ({
  __esModule: true,
  default: {
    init: sentryInit,
  },
}))

vi.mock(import("../../src/utils/errors"), () => ({
  shouldCaptureException: vi.fn(),
}))

describe("instrumentation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    otlpExporterMock.mockReturnValue({ exporter: true })
    sentryPropagatorMock.mockReturnValue({ propagator: true })
    sentrySpanProcessorMock.mockReturnValue({ processor: true })
  })

  it("initializes Sentry and registers OpenTelemetry", async () => {
    vi.resetModules()
    const { shouldCaptureException } = await import("../../src/utils/errors")
    vi.mocked(shouldCaptureException).mockReturnValue(false)

    const instrumentation = await import("../../instrumentation")

    expect(sentryInit).toHaveBeenCalledWith(
      expect.objectContaining({
        beforeSend: expect.any(Function),
        dsn: process.env["SENTRY_DSN"],
      }),
    )

    const sentryOptions = sentryInit.mock.calls[0]?.[0]
    expect(sentryOptions).toBeDefined()
    if (sentryOptions === undefined) {
      throw new Error("Expected Sentry initialization options")
    }
    const { beforeSend } = sentryOptions
    const event = { event_id: "evt_1" }
    expect(
      beforeSend(event, { originalException: new Error("ignore") }),
    ).toBeNull()

    vi.mocked(shouldCaptureException).mockReturnValue(true)
    expect(beforeSend(event, { originalException: new Error("capture") })).toBe(
      event,
    )

    expect(sentryPropagatorMock).toHaveBeenCalledOnce()
    const propagatorResult = sentryPropagatorMock.mock.results[0]
    expect(propagatorResult).toBeDefined()
    if (propagatorResult === undefined) {
      throw new Error("Expected Sentry propagator result")
    }
    expect(setGlobalPropagator).toHaveBeenCalledWith(propagatorResult.value)

    instrumentation.register()
    expect(otlpExporterMock).toHaveBeenCalledOnce()
    expect(sentrySpanProcessorMock).toHaveBeenCalledOnce()

    const exporterResult = otlpExporterMock.mock.results[0]
    const spanProcessorResult = sentrySpanProcessorMock.mock.results[0]
    expect(exporterResult).toBeDefined()
    expect(spanProcessorResult).toBeDefined()
    if (exporterResult === undefined || spanProcessorResult === undefined) {
      throw new Error("Expected OpenTelemetry constructor results")
    }

    expect(registerOtel).toHaveBeenCalledWith(
      expect.objectContaining({
        instrument: {
          db: true,
          http: true,
          query: true,
          workflows: true,
        },
        serviceName: process.env["SENTRY_NAME"] ?? "medusa-default",
        spanProcessors: [spanProcessorResult.value],
        traceExporter: exporterResult.value,
      }),
    )
  })
})

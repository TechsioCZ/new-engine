import { vi } from "vitest"

const mocks = vi.hoisted(() => ({
  registerOtel: vi.fn(),
  setGlobalPropagator: vi.fn(),
  sentryInit: vi.fn(),
  otlpExporterMock: vi.fn(),
  sentryPropagatorMock: vi.fn(),
  sentrySpanProcessorMock: vi.fn(),
  shouldCaptureException: vi.fn(),
}))

vi.mock("@medusajs/medusa", () => ({
  registerOtel: mocks.registerOtel,
}))

vi.mock("@opentelemetry/api", () => ({
  default: {
    propagation: {
      setGlobalPropagator: mocks.setGlobalPropagator,
    },
  },
  propagation: {
    setGlobalPropagator: mocks.setGlobalPropagator,
  },
}))

vi.mock("@opentelemetry/exporter-trace-otlp-grpc", () => ({
  OTLPTraceExporter: mocks.otlpExporterMock,
}))

vi.mock("@sentry/opentelemetry", () => ({
  SentryPropagator: mocks.sentryPropagatorMock,
  SentrySpanProcessor: mocks.sentrySpanProcessorMock,
}))

vi.mock("@sentry/node", () => ({
  __esModule: true,
  default: {
    init: mocks.sentryInit,
  },
}))

vi.mock("../../src/utils/errors", () => ({
  shouldCaptureException: mocks.shouldCaptureException,
}))

describe("instrumentation", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mocks.otlpExporterMock.mockImplementation(() => ({ exporter: true }))
    mocks.sentryPropagatorMock.mockImplementation(() => ({ propagator: true }))
    mocks.sentrySpanProcessorMock.mockImplementation(() => ({
      processor: true,
    }))
  })

  it("initializes Sentry and registers OpenTelemetry", async () => {
    mocks.shouldCaptureException.mockReturnValue(false)
    const instrumentation = await import("../../instrumentation")

    expect(mocks.sentryInit).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: process.env.SENTRY_DSN,
        instrumenter: "otel",
        beforeSend: expect.any(Function),
      })
    )

    const beforeSend = mocks.sentryInit.mock.calls[0][0].beforeSend
    const event = { event_id: "evt_1" }
    expect(
      beforeSend(event, { originalException: new Error("ignore") })
    ).toBeNull()

    mocks.shouldCaptureException.mockReturnValue(true)
    expect(beforeSend(event, { originalException: new Error("capture") })).toBe(
      event
    )

    expect(mocks.setGlobalPropagator).toHaveBeenCalledWith(
      mocks.sentryPropagatorMock.mock.results[0]?.value
    )

    instrumentation.register()

    expect(mocks.registerOtel).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceName: process.env.SENTRY_NAME || "medusa-default",
        traceExporter: mocks.otlpExporterMock.mock.results[0]?.value,
        spanProcessors: [mocks.sentrySpanProcessorMock.mock.results[0]?.value],
        instrument: {
          http: true,
          workflows: true,
          query: true,
          db: true,
        },
      })
    )
  })
})

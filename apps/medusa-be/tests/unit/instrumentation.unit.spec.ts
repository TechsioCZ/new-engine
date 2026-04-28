const registerOtel = jest.fn()
const setGlobalPropagator = jest.fn()
const sentryInit = jest.fn()
const otlpExporterMock = jest.fn()
const sentryPropagatorMock = jest.fn()
const sentrySpanProcessorMock = jest.fn()

jest.mock("@medusajs/medusa", () => ({
  registerOtel,
}))

jest.mock("@opentelemetry/api", () => ({
  propagation: {
    setGlobalPropagator,
  },
}))

jest.mock("@opentelemetry/exporter-trace-otlp-grpc", () => ({
  OTLPTraceExporter: otlpExporterMock,
}))

jest.mock("@sentry/opentelemetry", () => ({
  SentryPropagator: sentryPropagatorMock,
  SentrySpanProcessor: sentrySpanProcessorMock,
}))

jest.mock("@sentry/node", () => ({
  __esModule: true,
  default: {
    init: sentryInit,
  },
}))

jest.mock("../../src/utils/errors", () => ({
  shouldCaptureException: jest.fn(),
}))

describe("instrumentation", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    otlpExporterMock.mockImplementation(() => ({ exporter: true }))
    sentryPropagatorMock.mockImplementation(() => ({ propagator: true }))
    sentrySpanProcessorMock.mockImplementation(() => ({ processor: true }))
  })

  it("initializes Sentry and registers OpenTelemetry", () => {
    jest.isolateModules(() => {
      const { shouldCaptureException } = require("../../src/utils/errors")
      shouldCaptureException.mockReturnValue(false)

      const instrumentation = require("../../instrumentation")

      expect(sentryInit).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: process.env.SENTRY_DSN,
          instrumenter: "otel",
          beforeSend: expect.any(Function),
        })
      )

      const beforeSend = sentryInit.mock.calls[0][0].beforeSend
      const event = { event_id: "evt_1" }
      expect(
        beforeSend(event, { originalException: new Error("ignore") })
      ).toBeNull()

      shouldCaptureException.mockReturnValue(true)
      expect(
        beforeSend(event, { originalException: new Error("capture") })
      ).toBe(event)

      expect(setGlobalPropagator).toHaveBeenCalledWith(
        sentryPropagatorMock.mock.results[0]?.value
      )

      instrumentation.register()

      expect(registerOtel).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceName: process.env.SENTRY_NAME || "medusa-default",
          traceExporter: otlpExporterMock.mock.results[0]?.value,
          spanProcessors: [sentrySpanProcessorMock.mock.results[0]?.value],
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
})

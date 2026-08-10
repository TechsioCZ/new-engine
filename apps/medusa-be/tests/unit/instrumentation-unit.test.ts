import type { Mock } from "vitest"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { overrideModule } = vi.hoisted(() => ({
  overrideModule: <Module extends object>(
    original: Module,
    replacements: object,
  ): Module =>
    Object.defineProperties(
      { ...original },
      Object.getOwnPropertyDescriptors(replacements),
    ),
}))

interface TestEvent {
  event_id: string
}

interface SentryInitOptions {
  beforeSend: (
    event: TestEvent,
    hint: { originalException: unknown },
  ) => TestEvent | null
  dsn?: string
}

interface OtelRegistration {
  instrument: {
    db: boolean
    http: boolean
    query: boolean
    workflows: boolean
  }
  serviceName: string
  spanProcessors: { processor: boolean }[]
  traceExporter: { exporter: boolean }
}

interface CapturedInstrumentation {
  otelRegistration?: OtelRegistration
  sentryOptions?: SentryInitOptions
}

interface InstrumentationMocks {
  captured: CapturedInstrumentation
  exporterResult: { exporter: boolean }
  propagatorResult: { propagator: boolean }
  spanProcessorResult: { processor: boolean }
  otlpExporterMock: Mock<() => { exporter: boolean }>
  registerOtel: Mock<(options: OtelRegistration) => void>
  sentryInit: Mock<(options: SentryInitOptions) => void>
  sentryPropagatorMock: Mock<() => { propagator: boolean }>
  sentrySpanProcessorMock: Mock<() => { processor: boolean }>
  setGlobalPropagator: Mock<(propagator: { propagator: boolean }) => void>
}

const mocks: InstrumentationMocks = vi.hoisted(() => {
  const captured: CapturedInstrumentation = {}
  const exporterResult = { exporter: true }
  const propagatorResult = { propagator: true }
  const spanProcessorResult = { processor: true }

  return {
    captured,
    exporterResult,
    otlpExporterMock: vi.fn<() => { exporter: boolean }>(),
    propagatorResult,
    registerOtel: vi.fn<(options: OtelRegistration) => void>((options) => {
      captured.otelRegistration = options
    }),
    sentryInit: vi.fn<(options: SentryInitOptions) => void>((options) => {
      captured.sentryOptions = options
    }),
    sentryPropagatorMock: vi.fn<() => { propagator: boolean }>(),
    sentrySpanProcessorMock: vi.fn<() => { processor: boolean }>(),
    setGlobalPropagator: vi.fn<(propagator: { propagator: boolean }) => void>(),
    spanProcessorResult,
  }
})

const {
  captured,
  exporterResult,
  otlpExporterMock,
  propagatorResult,
  registerOtel,
  sentryInit,
  sentryPropagatorMock,
  sentrySpanProcessorMock,
  setGlobalPropagator,
  spanProcessorResult,
} = mocks

vi.mock(import("@medusajs/medusa"), async (importOriginal) =>
  overrideModule(await importOriginal(), {
    registerOtel,
  }),
)

vi.mock(import("@opentelemetry/api"), async (importOriginal) =>
  overrideModule(await importOriginal(), {
    default: {
      propagation: {
        setGlobalPropagator,
      },
    },
    propagation: {
      setGlobalPropagator,
    },
  }),
)

vi.mock(
  import("@opentelemetry/exporter-trace-otlp-grpc"),
  async (importOriginal) =>
    overrideModule(await importOriginal(), {
      OTLPTraceExporter: otlpExporterMock,
    }),
)

vi.mock(import("@sentry/opentelemetry"), async (importOriginal) =>
  overrideModule(await importOriginal(), {
    SentryPropagator: sentryPropagatorMock,
    SentrySpanProcessor: sentrySpanProcessorMock,
  }),
)

vi.mock(import("@sentry/node"), async (importOriginal) =>
  overrideModule(await importOriginal(), {
    __esModule: true,
    default: {
      init: sentryInit,
    },
    init: sentryInit,
  }),
)

vi.mock(import("../../src/utils/errors"), async (importOriginal) =>
  overrideModule(await importOriginal(), {
    shouldCaptureException: vi.fn<(error: unknown) => boolean>(),
  }),
)

const expectSentryInitialization = (
  shouldCaptureException: (error: unknown) => boolean,
) => {
  const { sentryOptions } = captured
  expect(sentryOptions).toBeDefined()
  if (sentryOptions === undefined) {
    throw new Error("Expected Sentry initialization options")
  }
  expect(sentryOptions.dsn).toBe(process.env["SENTRY_DSN"])
  expect(sentryOptions.beforeSend).toBeTypeOf("function")

  const { beforeSend } = sentryOptions
  const event = { event_id: "evt_1" }
  expect(
    beforeSend(event, { originalException: new Error("ignore") }),
  ).toBeNull()

  vi.mocked(shouldCaptureException).mockReturnValue(true)
  expect(beforeSend(event, { originalException: new Error("capture") })).toBe(
    event,
  )
}

const expectOpenTelemetryRegistration = (register: () => void) => {
  expect(sentryPropagatorMock).toHaveBeenCalledOnce()
  expect(setGlobalPropagator).toHaveBeenCalledWith(propagatorResult)

  register()
  expect(otlpExporterMock).toHaveBeenCalledOnce()
  expect(sentrySpanProcessorMock).toHaveBeenCalledOnce()

  expect(captured.otelRegistration).toStrictEqual({
    instrument: {
      db: true,
      http: true,
      query: true,
      workflows: true,
    },
    serviceName: process.env["SENTRY_NAME"] ?? "medusa-default",
    spanProcessors: [spanProcessorResult],
    traceExporter: exporterResult,
  })
}

describe("instrumentation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    otlpExporterMock.mockReturnValue(exporterResult)
    sentryPropagatorMock.mockReturnValue(propagatorResult)
    sentrySpanProcessorMock.mockReturnValue(spanProcessorResult)
  })

  it("initializes Sentry and registers OpenTelemetry", async () => {
    vi.resetModules()
    const { shouldCaptureException } = await import("../../src/utils/errors")
    vi.mocked(shouldCaptureException).mockReturnValue(false)

    const instrumentation = await import("../../instrumentation")

    expect(sentryInit).toHaveBeenCalledWith(captured.sentryOptions)
    expectSentryInitialization(shouldCaptureException)
    expectOpenTelemetryRegistration(instrumentation.register)
  })
})

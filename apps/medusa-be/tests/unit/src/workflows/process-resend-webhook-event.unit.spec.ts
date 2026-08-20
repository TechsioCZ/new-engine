import { beforeEach, describe, expect, it, vi } from "vitest"

const workflowSteps = vi.hoisted(
  () => new Map<string, (...arguments_: unknown[]) => unknown>()
)

vi.mock("@medusajs/framework/workflows-sdk", () => ({
  createStep: vi.fn(
    (name: string, handler: (...arguments_: unknown[]) => unknown) => {
      workflowSteps.set(name, handler)
      return handler
    }
  ),
  StepResponse: class StepResponse<TOutput> {
    output: TOutput

    constructor(output: TOutput) {
      this.output = output
    }
  },
}))

vi.mock("../../../../src/modules/email-log", () => ({
  EMAIL_LOG_MODULE: "email_log",
}))

type ProcessStep = (
  workflowInput: {
    email_id: string
    event: { data: { email_id: string }; type: string }
    event_id: string
  },
  context: { container: { resolve: (key: string) => unknown } }
) => Promise<{ output: { checked_count: number; found_count: number } }>

function createContext({
  emailLogs = [],
}: {
  emailLogs?: Array<{ checked_at: Date | null; id: string }>
} = {}) {
  const listEmailLogs = vi.fn().mockResolvedValue(emailLogs)
  const recordEmailWebhookEventOnce = vi.fn().mockResolvedValue(undefined)
  const updateEmailLogs = vi.fn().mockResolvedValue([])
  const service = {
    listEmailLogs,
    recordEmailWebhookEventOnce,
    updateEmailLogs,
  }

  return {
    container: {
      resolve: vi.fn((key: string) => {
        if (key !== "email_log") {
          throw new Error(`Unexpected dependency: ${key}`)
        }
        return service
      }),
    },
    service,
  }
}

const webhookInput = {
  email_id: "email_123",
  event: {
    data: { email_id: "email_123" },
    type: "email.delivered",
  },
  event_id: "message_123",
}

describe("process Resend webhook event step", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await import(
      "../../../../src/workflows/resend-webhook/steps/process-resend-webhook-event"
    )
  })

  it("persists the signed event identity when its email log is not available yet", async () => {
    const { container, service } = createContext()
    const step = workflowSteps.get(
      "process-resend-webhook-event"
    ) as ProcessStep

    await step(webhookInput, { container })

    expect(service.recordEmailWebhookEventOnce).toHaveBeenCalledWith({
      email_id: "email_123",
      event_id: "message_123",
      payload: webhookInput.event,
      received_at: expect.any(Date),
      type: "email.delivered",
    })
  })

  it("marks an available email log checked without creating a pending event", async () => {
    const { container, service } = createContext({
      emailLogs: [{ checked_at: null, id: "email_log_123" }],
    })
    const step = workflowSteps.get(
      "process-resend-webhook-event"
    ) as ProcessStep

    const result = await step(webhookInput, { container })

    expect(service.updateEmailLogs).toHaveBeenCalledWith([
      { checked_at: expect.any(Date), id: "email_log_123" },
    ])
    expect(service.recordEmailWebhookEventOnce).not.toHaveBeenCalled()
    expect(result.output).toEqual({ checked_count: 1, found_count: 1 })
  })
})

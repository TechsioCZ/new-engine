import { beforeEach, describe, expect, it, vi } from "vitest"

type PreparedResult = {
  notifications: Record<string, unknown>[]
  result: {
    email?: string
    order_id: string
    sent: boolean
  }
}

const workflowSdkMocks = vi.hoisted(() => {
  const state = {
    preparedResult: {
      notifications: [
        {
          channel: "email",
          template: "order-placed",
          to: "customer@example.com",
        },
      ],
      result: {
        email: "customer@example.com",
        order_id: "order_1",
        sent: true,
      },
    } satisfies PreparedResult,
    sendNotificationStep: vi.fn(),
  }

  return {
    createStep: vi.fn((name: string) => {
      if (name === "prepare-order-receipt-notification") {
        return vi.fn(() => state.preparedResult)
      }

      return vi.fn()
    }),
    createWorkflow: vi.fn(
      (_name: string, factory: (input: unknown) => unknown) => factory
    ),
    state,
    StepResponse: class StepResponse {
      payload: unknown

      constructor(value: unknown) {
        this.payload = value
      }
    },
    transform: vi.fn((data: unknown, mapper: (input: unknown) => unknown) =>
      mapper(data)
    ),
    when: vi.fn(
      (data: unknown, predicate: (input: unknown) => boolean) =>
        new Proxy(
          {},
          {
            get(_target, property) {
              if (property !== "then") {
                return
              }

              return (callback: () => unknown) =>
                predicate(data) ? callback() : undefined
            },
          }
        )
    ),
    WorkflowResponse: class WorkflowResponse {
      payload: unknown

      constructor(payload: unknown) {
        this.payload = payload
      }
    },
  }
})

vi.mock("@medusajs/framework/workflows-sdk", () => ({
  createStep: workflowSdkMocks.createStep,
  createWorkflow: workflowSdkMocks.createWorkflow,
  StepResponse: workflowSdkMocks.StepResponse,
  transform: workflowSdkMocks.transform,
  when: workflowSdkMocks.when,
  WorkflowResponse: workflowSdkMocks.WorkflowResponse,
}))

vi.mock("../../../../src/workflows/steps/send-notification", () => ({
  sendNotificationStep: workflowSdkMocks.state.sendNotificationStep,
}))

describe("sendOrderReceiptWorkflow", () => {
  beforeEach(() => {
    workflowSdkMocks.state.sendNotificationStep.mockReset()
    workflowSdkMocks.state.preparedResult = {
      notifications: [
        {
          channel: "email",
          template: "order-placed",
          to: "customer@example.com",
        },
      ],
      result: {
        email: "customer@example.com",
        order_id: "order_1",
        sent: true,
      },
    }
  })

  it("routes prepared order receipt notifications through the shared notification step", async () => {
    const { sendOrderReceiptWorkflow } = await import(
      "../../../../src/workflows/send-order-receipt"
    )

    const result = sendOrderReceiptWorkflow({ order_id: "order_1" })

    expect(workflowSdkMocks.state.sendNotificationStep).toHaveBeenCalledWith(
      workflowSdkMocks.state.preparedResult.notifications
    )
    expect(result.payload).toEqual(workflowSdkMocks.state.preparedResult.result)
  })

  it("skips the shared notification step when the receipt has no recipient", async () => {
    workflowSdkMocks.state.preparedResult = {
      notifications: [],
      result: {
        order_id: "order_1",
        sent: false,
      },
    }
    const { sendOrderReceiptWorkflow } = await import(
      "../../../../src/workflows/send-order-receipt"
    )

    const result = sendOrderReceiptWorkflow({ order_id: "order_1" })

    expect(workflowSdkMocks.state.sendNotificationStep).not.toHaveBeenCalled()
    expect(result.payload).toEqual(workflowSdkMocks.state.preparedResult.result)
  })
})

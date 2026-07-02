import { describe, expect, it, vi } from "vitest"

const workflowSdkMock = vi.hoisted(() => {
  class StepResponse<TOutput> {
    output: TOutput

    constructor(output: TOutput) {
      this.output = output
    }
  }

  class WorkflowResponse<TOutput> {
    output: TOutput

    constructor(output: TOutput) {
      this.output = output
    }
  }

  return {
    StepResponse,
    WorkflowResponse,
    steps: new Map<string, (...args: unknown[]) => unknown>(),
  }
})

vi.mock("@medusajs/framework/utils", () => {
  class MedusaError extends Error {
    static Types = {
      NOT_FOUND: "not_found",
    }

    type: string

    constructor(type: string, message: string) {
      super(message)
      this.type = type
    }
  }

  return {
    ContainerRegistrationKeys: {
      LOGGER: "logger",
      QUERY: "query",
    },
    MedusaError,
  }
})

vi.mock("@medusajs/framework/workflows-sdk", () => ({
  StepResponse: workflowSdkMock.StepResponse,
  WorkflowResponse: workflowSdkMock.WorkflowResponse,
  createStep: vi.fn(
    (name: string, handler: (...args: unknown[]) => unknown) => {
      workflowSdkMock.steps.set(name, handler)
      return handler
    }
  ),
  createWorkflow: vi.fn((_name: string, handler: unknown) => handler),
}))

vi.mock("../../modules/order-receipt", () => ({
  ORDER_RECEIPT_MODULE: "order_receipt",
}))

vi.mock("../steps/send-notification", () => ({
  sendNotificationStep: vi.fn(),
}))

type Notification = {
  data?: Record<string, unknown>
}

describe("send order payment reminder workflow", () => {
  it("uses the fetched order summary total for notification data", async () => {
    await import("../send-order-payment-reminder")

    const step = workflowSdkMock.steps.get(
      "build-order-payment-reminder-notification"
    )

    expect(step).toBeDefined()

    const graph = vi.fn().mockResolvedValue({
      data: [
        {
          currency_code: "czk",
          customer_id: "cus_123",
          display_id: 1001,
          id: "order_123",
          summary: {
            current_order_total: 1234.56,
            original_order_total: 1999,
          },
          total: 1999,
        },
      ],
    })
    const generateOrderReceiptAttachment = vi.fn().mockResolvedValue({
      content: Buffer.from("pdf"),
      content_type: "application/pdf",
      filename: "receipt.pdf",
    })
    const container = {
      resolve: vi.fn((key: string) => {
        if (key === "query") {
          return { graph }
        }

        if (key === "logger") {
          return { warn: vi.fn() }
        }

        if (key === "order_receipt") {
          return { generateOrderReceiptAttachment }
        }

        throw new Error(`Unexpected dependency ${key}`)
      }),
    }

    const result = (await step?.(
      {
        customer_id: "cus_123",
        email: "customer@example.com",
        order_display_id: "#1001",
        order_id: "order_123",
        payment_url: "https://shop.example/orders/order_123",
        store_name: "Store",
        total: "stale input total",
      },
      { container }
    )) as { output: Notification[] }

    expect(result.output[0]?.data?.total).toBe(
      new Intl.NumberFormat("cs-CZ", {
        currency: "CZK",
        style: "currency",
      }).format(1234.56)
    )
    expect(result.output[0]?.data?.total).not.toBe("stale input total")
    expect(result.output[0]?.data?.total).not.toBe(1999)
    expect(graph).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "order",
        fields: expect.arrayContaining(["summary.*", "total", "currency_code"]),
        filters: { id: "order_123" },
      })
    )
  })

  it.each([
    {
      expectedTotal: new Intl.NumberFormat("cs-CZ", {
        currency: "CZK",
        style: "currency",
      }).format(1500),
      inputTotal: "stale input total",
      order: {
        summary: {
          current_order_total: null,
          original_order_total: 1500,
        },
        total: 1999,
      },
    },
    {
      expectedTotal: new Intl.NumberFormat("cs-CZ", {
        currency: "CZK",
        style: "currency",
      }).format(1600.5),
      inputTotal: "stale input total",
      order: {
        summary: {
          current_order_total: null,
          original_order_total: null,
        },
        total: "1600.5",
      },
    },
    {
      expectedTotal: "1 234,56 Kč",
      inputTotal: "1 234,56 Kč",
      order: {
        summary: null,
        total: null,
      },
    },
  ])("uses fetched order total precedence before input fallback %#", async ({
    expectedTotal,
    inputTotal,
    order,
  }) => {
    await import("../send-order-payment-reminder")

    const step = workflowSdkMock.steps.get(
      "build-order-payment-reminder-notification"
    )
    expect(step).toBeDefined()

    const graph = vi.fn().mockResolvedValue({
      data: [
        {
          currency_code: "czk",
          customer_id: "cus_123",
          display_id: 1001,
          id: "order_123",
          ...order,
        },
      ],
    })
    const generateOrderReceiptAttachment = vi.fn().mockResolvedValue({
      content: Buffer.from("pdf"),
      content_type: "application/pdf",
      filename: "receipt.pdf",
    })
    const container = {
      resolve: vi.fn((key: string) => {
        if (key === "query") {
          return { graph }
        }

        if (key === "logger") {
          return { warn: vi.fn() }
        }

        if (key === "order_receipt") {
          return { generateOrderReceiptAttachment }
        }

        throw new Error(`Unexpected dependency ${key}`)
      }),
    }

    const result = (await step?.(
      {
        customer_id: "cus_123",
        email: "customer@example.com",
        order_display_id: "#1001",
        order_id: "order_123",
        payment_url: "https://shop.example/orders/order_123",
        store_name: "Store",
        total: inputTotal,
      },
      { container }
    )) as { output: Notification[] }

    expect(result.output[0]?.data?.total).toBe(expectedTotal)
  })
})

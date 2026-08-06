import { createStep } from "@medusajs/framework/workflows-sdk"
import { isRecord } from "@techsio/std/object"
import { describe, expect, it, vi } from "vitest"

vi.mock(import("@medusajs/framework/workflows-sdk"), async (importOriginal) => {
  const workflowsSdk = await importOriginal()

  return {
    ...workflowsSdk,
    createStep: vi.fn<typeof workflowsSdk.createStep>(workflowsSdk.createStep),
  }
})

const orderReceiptMock = vi.hoisted(() =>
  Object.freeze({ ORDER_RECEIPT_MODULE: "order_receipt" }),
)

vi.mock(import("../../modules/order-receipt"), () => orderReceiptMock)

type StepHandler = (input: unknown, context: unknown) => unknown

const assertStepHandler: (
  candidate: unknown,
) => asserts candidate is StepHandler = (candidate) => {
  if (typeof candidate !== "function") {
    throw new TypeError("Expected a workflow step handler")
  }
}

const getPaymentReminderStep = (): StepHandler => {
  const call = vi
    .mocked(createStep)
    .mock.calls.find(
      ([nameOrConfig]) =>
        nameOrConfig === "build-order-payment-reminder-notification",
    )
  const candidate: unknown = call?.[1]
  assertStepHandler(candidate)
  return candidate
}

interface Notification {
  data?: Record<string, unknown>
}

const getNotifications = (result: unknown): Notification[] => {
  if (!isRecord(result)) {
    throw new TypeError("Expected a workflow step response")
  }
  const { output } = result
  if (!Array.isArray(output)) {
    throw new TypeError("Expected workflow notifications")
  }
  return output.filter(isRecord)
}

type OrderSummaryFixture = {
  current_order_total?: number | string | null
  original_order_total?: number | string | null
} | null

interface OrderTotalFixture {
  summary: OrderSummaryFixture
  total: number | string | null
}

const createPaymentReminderNotificationContext = (order: OrderTotalFixture) => {
  const graph = vi
    .fn<
      (input: Record<string, unknown>) => Promise<{
        data: Record<string, unknown>[]
      }>
    >()
    .mockResolvedValue({
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
  const generateOrderReceiptAttachment = vi
    .fn<
      () => Promise<{ content: Buffer; content_type: string; filename: string }>
    >()
    .mockResolvedValue({
      content: Buffer.from("pdf"),
      content_type: "application/pdf",
      filename: "receipt.pdf",
    })
  const container = {
    resolve: vi.fn<(key: string) => unknown>((key) => {
      if (key === "query") {
        return { graph }
      }

      if (key === "logger") {
        return { warn: vi.fn<() => void>() }
      }

      if (key === "order_receipt") {
        return { generateOrderReceiptAttachment }
      }

      throw new Error(`Unexpected dependency ${key}`)
    }),
  }

  return { container, generateOrderReceiptAttachment, graph }
}

describe("send order payment reminder workflow", () => {
  it("uses the fetched order summary total for notification data", async () => {
    await import("../send-order-payment-reminder")

    const step = getPaymentReminderStep()

    const { container, graph } = createPaymentReminderNotificationContext({
      summary: {
        current_order_total: 1234.56,
        original_order_total: 1999,
      },
      total: 1999,
    })

    const result: unknown = await step(
      {
        customer_id: "cus_123",
        email: "customer@example.com",
        order_display_id: "#1001",
        order_id: "order_123",
        payment_url: "https://shop.example/orders/order_123",
        store_name: "Store",
        total: "stale input total",
      },
      { container },
    )
    const notifications = getNotifications(result)

    expect(notifications[0]?.data?.["total"]).toBe(
      new Intl.NumberFormat("cs-CZ", {
        currency: "CZK",
        style: "currency",
      }).format(1234.56),
    )
    expect(notifications[0]?.data?.["total"]).not.toBe("stale input total")
    expect(notifications[0]?.data?.["total"]).not.toBe(1999)
    const graphInput = graph.mock.calls[0]?.[0]
    expect(graphInput).toMatchObject({
      entity: "order",
      filters: { id: "order_123" },
    })
    expect(graphInput?.["fields"]).toStrictEqual(
      expect.arrayContaining(["summary.*", "total", "currency_code"]),
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
  ])(
    "uses fetched order total precedence before input fallback %#",
    async ({ expectedTotal, inputTotal, order }) => {
      await import("../send-order-payment-reminder")
      const step = getPaymentReminderStep()

      const { container } = createPaymentReminderNotificationContext(order)

      const result: unknown = await step(
        {
          customer_id: "cus_123",
          email: "customer@example.com",
          order_display_id: "#1001",
          order_id: "order_123",
          payment_url: "https://shop.example/orders/order_123",
          store_name: "Store",
          total: inputTotal,
        },
        { container },
      )
      const notifications = getNotifications(result)

      expect(notifications[0]?.data?.["total"]).toBe(expectedTotal)
    },
  )
})

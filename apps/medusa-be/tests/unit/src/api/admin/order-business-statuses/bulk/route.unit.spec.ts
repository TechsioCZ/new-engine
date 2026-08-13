import { beforeEach, describe, expect, it, vi } from "vitest"

const { runWorkflow, updateOrderBusinessStatusesWorkflow } = vi.hoisted(() => {
  const run = vi.fn()

  return {
    runWorkflow: run,
    updateOrderBusinessStatusesWorkflow: vi.fn(() => ({ run })),
  }
})

vi.mock("@medusajs/framework/utils", () => ({
  ContainerRegistrationKeys: {
    LOGGER: "logger",
    QUERY: "query",
  },
  Modules: {
    CACHING: "caching",
  },
}))

vi.mock(
  "../../../../../../../src/workflows/order-business-status/update-order-business-statuses",
  () => ({ updateOrderBusinessStatusesWorkflow })
)

const createMockResponse = () => ({
  json: vi.fn().mockReturnThis(),
})

describe("POST /admin/order-business-statuses/bulk", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("runs the selected orders through the workflow and returns exact counts", async () => {
    const { POST } = await import(
      "../../../../../../../src/api/admin/order-business-statuses/bulk/route"
    )
    const result = {
      changed_count: 2,
      order_ids: ["order_1", "order_2", "order_3"],
      processed_count: 3,
      requested_count: 3,
      status: "paid" as const,
      unchanged_count: 1,
    }
    runWorkflow.mockResolvedValue({ result })
    const graph = vi.fn().mockResolvedValue({
      data: result.order_ids.map((id, index) => ({
        created_at: `2026-08-0${index + 1}T10:00:00.000Z`,
        currency_code: "eur",
        custom_display_id: `WEB-${index + 1}`,
        display_id: 1001 + index,
        email: `customer-${index + 1}@example.com`,
        id,
        metadata: { order_business_status_manual: "paid" },
        status: "pending",
        total: 1000 + index,
      })),
    })
    const clear = vi.fn().mockResolvedValue(undefined)
    const scope = {
      resolve: vi.fn((key) => {
        if (key === "query") {
          return { graph }
        }

        if (key === "caching") {
          return { clear }
        }

        throw new Error(`Unexpected container key: ${String(key)}`)
      }),
    }
    const req = {
      scope,
      validatedBody: {
        order_ids: result.order_ids,
        status: result.status,
      },
    }
    const res = createMockResponse()

    await POST(req, res)

    expect(updateOrderBusinessStatusesWorkflow).toHaveBeenCalledWith(scope)
    expect(runWorkflow).toHaveBeenCalledWith({ input: req.validatedBody })
    expect(clear).toHaveBeenCalledWith({
      tags: ["order-expedition:summary"],
    })
    expect(res.json).toHaveBeenCalledWith({
      ...result,
      count: 3,
      orders: result.order_ids.map((id, index) => ({
        business_status: {
          id: "paid",
          priority: 6,
          tone: "green",
          translation_key: "statuses.paid",
        },
        created_at: `2026-08-0${index + 1}T10:00:00.000Z`,
        currency_code: "eur",
        custom_display_id: `WEB-${index + 1}`,
        display_id: 1001 + index,
        email: `customer-${index + 1}@example.com`,
        id,
        manual_status: "paid",
        total: 1000 + index,
      })),
      skipped: [],
      skipped_count: 0,
    })
  })

  it("does not invalidate the summary when every selected order is unchanged", async () => {
    const { POST } = await import(
      "../../../../../../../src/api/admin/order-business-statuses/bulk/route"
    )
    const result = {
      changed_count: 0,
      order_ids: ["order_1"],
      processed_count: 1,
      requested_count: 1,
      status: "processing" as const,
      unchanged_count: 1,
    }
    runWorkflow.mockResolvedValue({ result })
    const graph = vi.fn().mockResolvedValue({
      data: [
        {
          id: "order_1",
          metadata: { order_business_status_manual: "processing" },
        },
      ],
    })
    const scope = {
      resolve: vi.fn((key) => {
        if (key === "query") {
          return { graph }
        }

        throw new Error(`Unexpected container key: ${String(key)}`)
      }),
    }
    const res = createMockResponse()

    await POST(
      {
        scope,
        validatedBody: {
          order_ids: ["order_1"],
          status: "processing",
        },
      },
      res
    )

    expect(scope.resolve).not.toHaveBeenCalledWith("caching")
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        changed_count: 0,
        count: 1,
        processed_count: 1,
        unchanged_count: 1,
      })
    )
  })
})

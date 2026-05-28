import { vi } from "vitest"
import { createMedusaOrderExpeditionService } from "../src/order-expedition/medusa-service"
import type {
  OrderBusinessStatusesByIdsResponse,
  OrderExpeditionOrdersResponse,
  OrderExpeditionStatusUpdateResponse,
} from "../src/order-expedition/types"
import type { AdminDataClient } from "../src/shared/admin-client"
import { AdminApiError } from "../src/shared/error-utils"

function createClient(
  overrides: Partial<AdminDataClient> = {}
): AdminDataClient {
  const fetchJson = vi.fn(() =>
    Promise.resolve()
  ) as AdminDataClient["fetchJson"]

  return {
    fetchBlob: vi.fn(async () => new Blob(["pdf"])),
    fetchJson,
    fetchText: vi.fn(async () => ""),
    fetchVoid: vi.fn(() => Promise.resolve()),
    ...overrides,
  }
}

describe("createMedusaOrderExpeditionService", () => {
  it("maps list filters to Admin API query params", async () => {
    const response = {
      business_status: "paid",
      carrier: "packeta",
      carrier_filter_limit_reached: false,
      count: 0,
      count_exact: true,
      has_next: false,
      limit: 25,
      offset: 10,
      orders: [],
      scanned_count: 100,
    } satisfies OrderExpeditionOrdersResponse
    const fetchJsonMock = vi.fn(async () => response)
    const client = createClient({
      fetchJson: fetchJsonMock as AdminDataClient["fetchJson"],
    })
    const service = createMedusaOrderExpeditionService(client)

    await expect(
      service.getOrders({
        businessStatus: "all",
        carrier: "packeta",
        limit: 25,
        offset: 10,
      })
    ).resolves.toBe(response)

    expect(fetchJsonMock).toHaveBeenCalledWith(
      "/admin/order-expedition/orders",
      {
        params: { carrier: "packeta", limit: 25, offset: 10 },
        signal: undefined,
      }
    )
  })

  it("returns an empty by-id response without calling the backend for empty ids", async () => {
    const fetchJsonMock = vi.fn(
      async () =>
        ({
          orders: [],
        }) satisfies OrderBusinessStatusesByIdsResponse
    )
    const client = createClient({
      fetchJson: fetchJsonMock as AdminDataClient["fetchJson"],
    })
    const service = createMedusaOrderExpeditionService(client)

    await expect(
      service.getBusinessStatusesByIds({ ids: [] })
    ).resolves.toEqual({ orders: [] })
    expect(fetchJsonMock).not.toHaveBeenCalled()
  })

  it("posts PDF requests as blobs and preserves requested order order", async () => {
    const fetchBlob = vi.fn(async () => new Blob(["pdf"]))
    const client = createClient({ fetchBlob })
    const service = createMedusaOrderExpeditionService(client)

    await service.createPdf({ orderIds: ["ord_b", "ord_a", "ord_b"] })

    expect(fetchBlob).toHaveBeenCalledWith("/admin/order-expedition/pdf", {
      body: { order_ids: ["ord_b", "ord_a"] },
      method: "POST",
    })
  })

  it("returns business blockers as a value for 400 status transitions", async () => {
    const payload = {
      blocked_orders: [
        {
          id: "ord_1",
          order_display_id: "#1",
          reason: "Order is already completed",
        },
      ],
      message: "One or more selected orders cannot transition",
      target_status: "completed",
    }
    const fetchJsonMock = vi.fn(
      (): Promise<OrderExpeditionStatusUpdateResponse> =>
        Promise.reject(new AdminApiError("Blocked", 400, payload))
    )
    const client = createClient({
      fetchJson: fetchJsonMock as AdminDataClient["fetchJson"],
    })
    const service = createMedusaOrderExpeditionService(client)

    await expect(
      service.updateStatus({
        orderIds: ["ord_1"],
        targetStatus: "completed",
      })
    ).resolves.toEqual({
      blockedOrders: payload.blocked_orders,
      message: payload.message,
      ok: false,
      targetStatus: "completed",
    })
  })

  it("rethrows 400 status transitions without a blocker payload", async () => {
    const error = new AdminApiError("Invalid status transition", 400, {
      message: "Invalid status transition",
    })
    const fetchJsonMock = vi.fn(
      (): Promise<OrderExpeditionStatusUpdateResponse> => Promise.reject(error)
    )
    const client = createClient({
      fetchJson: fetchJsonMock as AdminDataClient["fetchJson"],
    })
    const service = createMedusaOrderExpeditionService(client)

    await expect(
      service.updateStatus({
        orderIds: ["ord_1"],
        targetStatus: "completed",
      })
    ).rejects.toBe(error)
  })
})

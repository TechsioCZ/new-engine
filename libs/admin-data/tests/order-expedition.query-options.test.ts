import { QueryClient } from "@tanstack/react-query"
import { vi } from "vitest"
import { createOrderExpeditionQueryOptionsFactory } from "../src/order-expedition/query-options"
import type {
  OrderBusinessStatusSummary,
  OrderExpeditionService,
} from "../src/order-expedition/types"

const orderSummary = {
  business_status: {
    id: "processing",
    priority: 5,
    tone: "blue",
    translation_key: "statuses.processing",
  },
  id: "ord_1",
  manual_status: "processing",
} satisfies OrderBusinessStatusSummary

describe("order-expedition query options", () => {
  it("forwards AbortSignal and uses realtime cache defaults for orders", async () => {
    const service = {
      bulkUpdateBusinessStatus: vi.fn(async () => ({
        count: 0,
        orders: [],
        skipped: [],
        skipped_count: 0,
        status: null,
      })),
      createPdf: vi.fn(async () => new Blob()),
      getBusinessStatusesByIds: vi.fn(async () => ({ orders: [] })),
      getCarriers: vi.fn(async () => ({ carriers: [] })),
      getOrders: vi.fn(async () => ({
        business_status: null,
        carrier: null,
        carrier_filter_limit_reached: false,
        count: 0,
        count_exact: true,
        has_next: false,
        limit: 25,
        offset: 10,
        orders: [],
        scanned_count: null,
      })),
      updateBusinessStatus: vi.fn(async () => ({ order: orderSummary })),
      updateStatus: vi.fn(async () => ({
        blockedOrders: [],
        count: 0,
        ok: true,
        orders: [],
        targetStatus: "completed",
      })),
    } satisfies OrderExpeditionService
    const factory = createOrderExpeditionQueryOptionsFactory({
      queryKeyNamespace: "admin-test",
      service,
    })
    const query = factory.getOrdersQueryOptions({
      businessStatus: "paid",
      carrier: "all",
      limit: 25,
      offset: 10,
    })
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    expect(query.staleTime).toBe(15 * 1000)

    await queryClient.prefetchQuery(query)

    expect(service.getOrders).toHaveBeenCalledWith(
      { businessStatus: "paid", carrier: "all", limit: 25, offset: 10 },
      expect.any(AbortSignal)
    )
  })
})

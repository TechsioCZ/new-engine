import { QueryClient } from "@tanstack/react-query"
import { vi } from "vitest"
import {
  ACTION_REQUIRED_SUMMARY_REFETCH_INTERVAL_MS,
  createActionRequiredQueryOptionsFactory,
} from "../src/action-required/query-options"
import type { ActionRequiredService } from "../src/action-required/types"

describe("action-required query options", () => {
  it("forwards AbortSignal and uses realtime cache defaults", async () => {
    const service = {
      getCustomers: vi.fn(),
      getOrders: vi.fn(async () => ({
        count: 0,
        count_exact: true,
        has_next: false,
        limit: 25,
        offset: 10,
        orders: [],
      })),
      getSummary: vi.fn(),
    } satisfies ActionRequiredService
    const factory = createActionRequiredQueryOptionsFactory({
      queryKeyNamespace: "admin-test",
      service,
    })
    const query = factory.getOrdersQueryOptions({
      limit: 25,
      offset: 10,
    })
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    expect(query.staleTime).toBe(15 * 1000)

    await queryClient.prefetchQuery(query)

    expect(service.getOrders).toHaveBeenCalledWith(
      { limit: 25, offset: 10 },
      expect.any(AbortSignal)
    )
  })

  it("uses summary service and the action-required polling default", async () => {
    const summary = {
      customers: null,
      orders: null,
    }
    const service = {
      getCustomers: vi.fn(),
      getOrders: vi.fn(),
      getSummary: vi.fn(async () => summary),
    } satisfies ActionRequiredService
    const factory = createActionRequiredQueryOptionsFactory({ service })
    const query = factory.getSummaryQueryOptions()
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    await expect(queryClient.fetchQuery(query)).resolves.toEqual(summary)

    expect(service.getSummary).toHaveBeenCalledWith({}, expect.any(AbortSignal))
    expect(service.getOrders).not.toHaveBeenCalled()
    expect(service.getCustomers).not.toHaveBeenCalled()
    expect(query.refetchInterval).toBe(
      ACTION_REQUIRED_SUMMARY_REFETCH_INTERVAL_MS
    )
  })
})

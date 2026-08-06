import { QueryClient } from "@tanstack/react-query"
import { vi, describe, expect, it } from "vitest"

import { createCollectionQueryOptionsFactory } from "../src/collections/query-options"
import { createOrderQueryOptionsFactory } from "../src/orders/query-options"

describe("read query options factories", () => {
  it("builds reusable collection query options for list and detail reads", async () => {
    interface Collection {
      id: string
      title: string
    }
    interface ListInput {
      page?: number
      limit?: number
      enabled?: boolean
    }
    interface ListParams {
      page?: number
      limit?: number
    }
    interface DetailInput {
      id?: string
      enabled?: boolean
    }
    interface DetailParams {
      id?: string
    }

    const service = {
      getCollection: vi.fn<(params: DetailParams) => Promise<Collection>>(
        async (params) =>
          await Promise.resolve({
            id: params.id ?? "missing",
            title: "Detail",
          }),
      ),
      getCollections: vi.fn<
        (
          params: ListParams,
        ) => Promise<{ collections: Collection[]; count: number }>
      >(
        async (params) =>
          await Promise.resolve({
            collections: [{ id: `col_${params.page ?? 1}`, title: "Spring" }],
            count: 1,
          }),
      ),
    }

    const { getListQueryOptions, getDetailQueryOptions } =
      createCollectionQueryOptionsFactory<
        Collection,
        ListInput,
        ListParams,
        DetailInput,
        DetailParams
      >({
        buildDetailParams: (input) =>
          input.id === undefined ? {} : { id: input.id },
        buildListParams: (input) => ({
          ...(input.page === undefined ? {} : { page: input.page }),
          ...(input.limit === undefined ? {} : { limit: input.limit }),
        }),
        queryKeyNamespace: "collection-query-options",
        service,
      })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    await queryClient.prefetchQuery(
      getListQueryOptions({
        enabled: true,
        limit: 4,
        page: 2,
      }),
    )
    await queryClient.prefetchQuery(
      getDetailQueryOptions({
        enabled: true,
        id: "col_1",
      }),
    )

    expect(service.getCollections).toHaveBeenCalledWith(
      { limit: 4, page: 2 },
      expect.any(AbortSignal),
    )
    expect(service.getCollection).toHaveBeenCalledWith(
      { id: "col_1" },
      expect.any(AbortSignal),
    )
  })

  it("builds reusable order query options with user-data cache defaults", async () => {
    interface Order {
      id: string
    }
    interface ListInput {
      page?: number
      limit?: number
      enabled?: boolean
    }
    interface ListParams {
      page?: number
      limit?: number
    }
    interface DetailInput {
      id?: string
      enabled?: boolean
    }
    interface DetailParams {
      id?: string
    }

    const service = {
      getOrder: vi.fn<(params: DetailParams) => Promise<Order>>(
        async (params) =>
          await Promise.resolve({
            id: params.id ?? "missing",
          }),
      ),
      getOrders: vi.fn<
        (params: ListParams) => Promise<{ count: number; orders: Order[] }>
      >(
        async (params) =>
          await Promise.resolve({
            count: 1,
            orders: [{ id: `order_${params.page ?? 1}` }],
          }),
      ),
    }

    const { getListQueryOptions, getDetailQueryOptions } =
      createOrderQueryOptionsFactory<
        Order,
        ListInput,
        ListParams,
        DetailInput,
        DetailParams
      >({
        buildDetailParams: (input) =>
          input.id === undefined ? {} : { id: input.id },
        buildListParams: (input) => ({
          ...(input.page === undefined ? {} : { page: input.page }),
          ...(input.limit === undefined ? {} : { limit: input.limit }),
        }),
        queryKeyNamespace: "order-query-options",
        service,
      })

    const listQuery = getListQueryOptions({
      enabled: true,
      limit: 5,
      page: 3,
    })
    const detailQuery = getDetailQueryOptions({
      enabled: true,
      id: "ord_1",
    })

    expect(listQuery.staleTime).toBe(5 * 60 * 1000)
    expect(detailQuery.staleTime).toBe(5 * 60 * 1000)

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    await queryClient.prefetchQuery(listQuery)
    await queryClient.prefetchQuery(detailQuery)

    expect(service.getOrders).toHaveBeenCalledWith(
      { limit: 5, page: 3 },
      expect.any(AbortSignal),
    )
    expect(service.getOrder).toHaveBeenCalledWith(
      { id: "ord_1" },
      expect.any(AbortSignal),
    )
  })
})

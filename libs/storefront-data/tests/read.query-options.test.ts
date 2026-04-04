import { QueryClient } from "@tanstack/react-query"
import { createCollectionQueryOptionsFactory } from "../src/collections/query-options"
import { createOrderQueryOptionsFactory } from "../src/orders/query-options"

describe("read query options factories", () => {
  it("builds reusable collection query options for list and detail reads", async () => {
    type Collection = { id: string; title: string }
    type ListInput = {
      page?: number
      limit?: number
      enabled?: boolean
    }
    type ListParams = {
      page?: number
      limit?: number
    }
    type DetailInput = {
      id?: string
      enabled?: boolean
    }
    type DetailParams = {
      id?: string
    }

    const service = {
      getCollections: vi.fn(async (params: ListParams) => ({
        collections: [{ id: `col_${params.page ?? 1}`, title: "Spring" }],
        count: 1,
      })),
      getCollection: vi.fn(async (params: DetailParams) => ({
        id: params.id ?? "missing",
        title: "Detail",
      })),
    }

    const { getListQueryOptions, getDetailQueryOptions } =
      createCollectionQueryOptionsFactory<
        Collection,
        ListInput,
        ListParams,
        DetailInput,
        DetailParams
      >({
        service,
        queryKeyNamespace: "collection-query-options",
        buildListParams: (input) => ({
          page: input.page,
          limit: input.limit,
        }),
        buildDetailParams: (input) => ({
          id: input.id,
        }),
      })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    await queryClient.prefetchQuery(
      getListQueryOptions({
        page: 2,
        limit: 4,
        enabled: true,
      })
    )
    await queryClient.prefetchQuery(
      getDetailQueryOptions({
        id: "col_1",
        enabled: true,
      })
    )

    expect(service.getCollections).toHaveBeenCalledWith(
      { page: 2, limit: 4 },
      expect.any(AbortSignal)
    )
    expect(service.getCollection).toHaveBeenCalledWith(
      { id: "col_1" },
      expect.any(AbortSignal)
    )
  })

  it("builds reusable order query options with user-data cache defaults", async () => {
    type Order = { id: string }
    type ListInput = {
      page?: number
      limit?: number
      enabled?: boolean
    }
    type ListParams = {
      page?: number
      limit?: number
    }
    type DetailInput = {
      id?: string
      enabled?: boolean
    }
    type DetailParams = {
      id?: string
    }

    const service = {
      getOrders: vi.fn(async (params: ListParams) => ({
        orders: [{ id: `order_${params.page ?? 1}` }],
        count: 1,
      })),
      getOrder: vi.fn(async (params: DetailParams) => ({
        id: params.id ?? "missing",
      })),
    }

    const { getListQueryOptions, getDetailQueryOptions } =
      createOrderQueryOptionsFactory<
        Order,
        ListInput,
        ListParams,
        DetailInput,
        DetailParams
      >({
        service,
        queryKeyNamespace: "order-query-options",
        buildListParams: (input) => ({
          page: input.page,
          limit: input.limit,
        }),
        buildDetailParams: (input) => ({
          id: input.id,
        }),
      })

    const listQuery = getListQueryOptions({
      page: 3,
      limit: 5,
      enabled: true,
    })
    const detailQuery = getDetailQueryOptions({
      id: "ord_1",
      enabled: true,
    })

    expect(listQuery.staleTime).toBe(5 * 60 * 1000)
    expect(detailQuery.staleTime).toBe(5 * 60 * 1000)

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    await queryClient.prefetchQuery(listQuery)
    await queryClient.prefetchQuery(detailQuery)

    expect(service.getOrders).toHaveBeenCalledWith(
      { page: 3, limit: 5 },
      expect.any(AbortSignal)
    )
    expect(service.getOrder).toHaveBeenCalledWith(
      { id: "ord_1" },
      expect.any(AbortSignal)
    )
  })
})

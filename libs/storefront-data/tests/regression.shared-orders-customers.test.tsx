import { QueryClient } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { createCustomerHooks } from "../src/customers/hooks"
import { createOrderHooks } from "../src/orders/hooks"
import { createProductHooks } from "../src/products/hooks"
import { resolvePagination as resolveProductPagination } from "../src/products/pagination"
import { resolvePagination as resolveSharedPagination } from "../src/shared/pagination"
import { StorefrontDataProvider } from "../src/client/provider"

const createWrapper = (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => (
    <StorefrontDataProvider client={client}>{children}</StorefrontDataProvider>
  )

describe("phase 3 regressions", () => {
  it("keeps pagination behavior via shared helper and products re-export", () => {
    expect(resolveSharedPagination).toBe(resolveProductPagination)

    expect(resolveSharedPagination({ page: 3, limit: 5 }, 20)).toEqual({
      page: 3,
      limit: 5,
      offset: 10,
    })

    expect(resolveProductPagination({ offset: 9, limit: 3 }, 20)).toEqual({
      page: 4,
      limit: 3,
      offset: 9,
    })
  })

  it("strips enabled before passing params to order service", async () => {
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

    const seenListParams: ListParams[] = []
    const seenDetailParams: DetailParams[] = []

    const service = {
      getOrders: vi.fn(async (params: ListParams) => {
        seenListParams.push(params)
        return {
          orders: [{ id: "order_1" }],
          count: 1,
        }
      }),
      getOrder: vi.fn(async (params: DetailParams) => {
        seenDetailParams.push(params)
        return { id: "order_1" } as Order
      }),
    }

    const { useOrders, useOrder } = createOrderHooks<
      Order,
      ListInput,
      ListParams,
      DetailInput,
      DetailParams
    >({
      service,
      queryKeyNamespace: "phase3-orders",
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
    const wrapper = createWrapper(queryClient)

    renderHook(() => useOrders({ page: 2, limit: 5, enabled: true }), {
      wrapper,
    })
    renderHook(() => useOrder({ id: "order_1", enabled: true }), { wrapper })

    await waitFor(() => {
      expect(service.getOrders).toHaveBeenCalledTimes(1)
      expect(service.getOrder).toHaveBeenCalledTimes(1)
    })

    expect(seenListParams[0]).toEqual({ page: 2, limit: 5 })
    expect(seenDetailParams[0]).toEqual({ id: "order_1" })
  })

  it("exposes reusable order query options for TanStack prefetchQuery", async () => {
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
        orders: [{ id: `order_page_${params.page ?? 1}` }],
        count: 1,
      })),
      getOrder: vi.fn(async (params: DetailParams) => ({
        id: params.id ?? "missing",
      })),
    }

    const { createOrdersListQueryOptions, createOrderQueryOptions } =
      createOrderHooks<Order, ListInput, ListParams, DetailInput, DetailParams>({
        service,
        queryKeyNamespace: "phase3-order-query-options",
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
      createOrdersListQueryOptions({
        page: 2,
        limit: 5,
        enabled: true,
      })
    )
    await queryClient.prefetchQuery(
      createOrderQueryOptions({
        id: "order_1",
        enabled: true,
      })
    )

    expect(service.getOrders).toHaveBeenCalledWith(
      { page: 2, limit: 5 },
      expect.any(AbortSignal)
    )
    expect(service.getOrder).toHaveBeenCalledWith(
      { id: "order_1" },
      expect.any(AbortSignal)
    )
  })

  it("exposes reusable product prefetch query options with list/detail specializations", async () => {
    type Product = { handle: string }
    type ListInput = {
      page?: number
      limit?: number
      region_id?: string
      enabled?: boolean
    }
    type ListParams = {
      page?: number
      limit?: number
      region_id?: string
    }
    type DetailInput = {
      handle: string
      region_id?: string
      enabled?: boolean
    }
    type DetailParams = {
      handle: string
      region_id?: string
    }

    const service = {
      getProducts: vi.fn(async (params: ListParams) => ({
        products: [{ handle: `list-${params.page ?? 1}` }],
        count: 1,
        limit: params.limit ?? 20,
        offset: 0,
      })),
      getProductsGlobal: vi.fn(async (params: ListParams) => ({
        products: [{ handle: `global-${params.page ?? 1}` }],
        count: 1,
        limit: params.limit ?? 20,
        offset: 0,
      })),
      getProductByHandle: vi.fn(async (params: DetailParams) => ({
        handle: params.handle,
      })),
    }

    const {
      createProductsListPrefetchQueryOptions,
      createProductsFirstPagePrefetchQueryOptions,
      createProductPrefetchQueryOptions,
    } = createProductHooks<Product, ListInput, ListParams, DetailInput, DetailParams>({
      service,
      queryKeyNamespace: "phase3-product-query-options",
      requireRegion: false,
      buildListParams: (input) => ({
        page: input.page,
        limit: input.limit,
        region_id: input.region_id,
      }),
      buildPrefetchParams: (input) => ({
        page: 1,
        limit: input.limit,
        region_id: input.region_id,
      }),
      buildDetailParams: (input) => ({
        handle: input.handle,
        region_id: input.region_id,
      }),
    })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    await queryClient.prefetchQuery(
      createProductsListPrefetchQueryOptions({
        page: 3,
        limit: 4,
        region_id: "reg_1",
      })
    )
    await queryClient.prefetchQuery(
      createProductsFirstPagePrefetchQueryOptions(
        {
          page: 9,
          limit: 4,
          region_id: "reg_1",
        },
        {
          useGlobalFetcher: true,
        }
      )
    )
    await queryClient.prefetchQuery(
      createProductPrefetchQueryOptions({
        handle: "hoodie",
        region_id: "reg_1",
      })
    )

    expect(service.getProducts).toHaveBeenCalledWith(
      { page: 3, limit: 4, region_id: "reg_1" },
      expect.any(AbortSignal)
    )
    expect(service.getProductsGlobal).toHaveBeenCalledWith(
      { page: 1, limit: 4, region_id: "reg_1" },
      expect.any(AbortSignal)
    )
    expect(service.getProductByHandle).toHaveBeenCalledWith(
      { handle: "hoodie", region_id: "reg_1" },
      expect.any(AbortSignal)
    )
  })

  it("keeps runtime guard for delete address mutation while requiring addressId", async () => {
    type Customer = { id: string }
    type Address = { id: string }

    const service = {
      getAddresses: vi.fn(async () => ({ addresses: [] as Address[] })),
      createAddress: vi.fn(async () => ({ id: "addr_created" } as Address)),
      updateAddress: vi.fn(async () => ({ id: "addr_updated" } as Address)),
      deleteAddress: vi.fn(async () => {}),
      updateCustomer: vi.fn(async () => ({ id: "cus_1" } as Customer)),
    }

    const { useDeleteCustomerAddress } = createCustomerHooks<
      Customer,
      Address,
      { enabled?: boolean }
    >({
      service,
      queryKeyNamespace: "phase3-customers",
    })

    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
    })
    const wrapper = createWrapper(queryClient)

    const { result } = renderHook(() => useDeleteCustomerAddress(), { wrapper })

    await act(async () => {
      await expect(result.current.mutateAsync({} as never)).rejects.toThrow(
        "Address id is required"
      )
    })

    await act(async () => {
      await result.current.mutateAsync({ addressId: "addr_1" })
    })

    expect(service.deleteAddress).toHaveBeenCalledWith("addr_1")
  })
})

import { QueryClient } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { vi, describe, expect, expectTypeOf, it } from "vitest"

import { StorefrontDataProvider } from "../src/client/provider"
import { createCustomerHooks } from "../src/customers/hooks"
import { createOrderHooks } from "../src/orders/hooks"
import { createProductHooks } from "../src/products/hooks"
import { resolvePagination as resolveSharedPagination } from "../src/shared/pagination"

const createWrapper = (client: QueryClient) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <StorefrontDataProvider client={client}>{children}</StorefrontDataProvider>
  )
  return Wrapper
}

describe("phase 3 regressions", () => {
  it("resolves shared pagination behavior for page and offset inputs", () => {
    expect(resolveSharedPagination({ limit: 5, page: 3 }, 20)).toStrictEqual({
      limit: 5,
      offset: 10,
      page: 3,
    })

    expect(resolveSharedPagination({ limit: 3, offset: 9 }, 20)).toStrictEqual({
      limit: 3,
      offset: 9,
      page: 4,
    })
  })

  it("strips enabled before passing params to order service", async () => {
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

    const seenListParams: ListParams[] = []
    const seenDetailParams: DetailParams[] = []

    const service = {
      getOrder: vi.fn<(params: DetailParams) => Promise<{ id: string }>>(
        async (params) => {
          seenDetailParams.push(params)
          await Promise.resolve()
          return { id: "order_1" }
        },
      ),
      getOrders: vi.fn<
        (
          params: ListParams,
        ) => Promise<{ orders: { id: string }[]; count: number }>
      >(async (params) => {
        seenListParams.push(params)
        await Promise.resolve()
        return {
          count: 1,
          orders: [{ id: "order_1" }],
        }
      }),
    }

    const { useOrders, useOrder } = createOrderHooks<
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
      queryKeyNamespace: "phase3-orders",
      service,
    })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const wrapper = createWrapper(queryClient)

    renderHook(() => useOrders({ enabled: true, limit: 5, page: 2 }), {
      wrapper,
    })
    renderHook(() => useOrder({ enabled: true, id: "order_1" }), { wrapper })

    await waitFor(() => {
      expect(service.getOrders).toHaveBeenCalledOnce()
      expect(service.getOrder).toHaveBeenCalledOnce()
    })

    expect(seenListParams[0]).toStrictEqual({ limit: 5, page: 2 })
    expect(seenDetailParams[0]).toStrictEqual({ id: "order_1" })
  })

  it("exposes reusable order query options for TanStack prefetchQuery", async () => {
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
      getOrder: vi.fn<(params: DetailParams) => Promise<{ id: string }>>(
        async (params) => {
          await Promise.resolve()
          return { id: params.id ?? "missing" }
        },
      ),
      getOrders: vi.fn<
        (
          params: ListParams,
        ) => Promise<{ orders: { id: string }[]; count: number }>
      >(async (params) => {
        await Promise.resolve()
        return {
          count: 1,
          orders: [{ id: `order_page_${params.page ?? 1}` }],
        }
      }),
    }

    const { getListQueryOptions, getDetailQueryOptions } = createOrderHooks<
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
      queryKeyNamespace: "phase3-order-query-options",
      service,
    })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    await queryClient.prefetchQuery(
      getListQueryOptions({
        enabled: true,
        limit: 5,
        page: 2,
      }),
    )
    await queryClient.prefetchQuery(
      getDetailQueryOptions({
        enabled: true,
        id: "order_1",
      }),
    )

    expect(service.getOrders).toHaveBeenCalledWith(
      { limit: 5, page: 2 },
      expect.any(AbortSignal),
    )
    expect(service.getOrder).toHaveBeenCalledWith(
      { id: "order_1" },
      expect.any(AbortSignal),
    )
  })

  it("exposes reusable product query options for list and detail reads", async () => {
    interface Product {
      handle: string
    }
    interface ListInput {
      page?: number
      limit?: number
      offset?: number
      region_id?: string
      enabled?: boolean
    }
    interface ListParams {
      page?: number
      limit?: number
      offset?: number
      region_id?: string
    }
    interface DetailInput {
      handle: string
      region_id?: string
      enabled?: boolean
    }
    interface DetailParams {
      handle: string
      region_id?: string
    }

    interface ProductListResult {
      products: { handle: string }[]
      count: number
      limit: number
      offset: number
    }

    const service = {
      getProductByHandle: vi.fn<
        (params: DetailParams) => Promise<{ handle: string }>
      >(async (params) => {
        await Promise.resolve()
        return { handle: params.handle }
      }),
      getProducts: vi.fn<(params: ListParams) => Promise<ProductListResult>>(
        async (params) => {
          await Promise.resolve()
          return {
            count: 1,
            limit: params.limit ?? 20,
            offset: 0,
            products: [{ handle: `list-${params.page ?? 1}` }],
          }
        },
      ),
      getProductsGlobal: vi.fn<
        (params: ListParams) => Promise<ProductListResult>
      >(async (params) => {
        await Promise.resolve()
        return {
          count: 1,
          limit: params.limit ?? 20,
          offset: 0,
          products: [{ handle: `global-${params.page ?? 1}` }],
        }
      }),
    }

    const { getListQueryOptions, getDetailQueryOptions } = createProductHooks<
      Product,
      ListInput,
      ListParams,
      DetailInput,
      DetailParams
    >({
      buildDetailParams: (input) => ({
        handle: input.handle,
        ...(input.region_id !== undefined && input.region_id !== ""
          ? { region_id: input.region_id }
          : {}),
      }),
      buildListParams: (input) => ({
        ...(input.page === undefined ? {} : { page: input.page }),
        ...(input.limit === undefined ? {} : { limit: input.limit }),
        ...(input.offset === undefined ? {} : { offset: input.offset }),
        ...(input.region_id !== undefined && input.region_id !== ""
          ? { region_id: input.region_id }
          : {}),
      }),
      buildPrefetchParams: (input) => ({
        ...(input.page === undefined ? {} : { page: input.page }),
        ...(input.limit === undefined ? {} : { limit: input.limit }),
        ...(input.offset === undefined ? {} : { offset: input.offset }),
        ...(input.region_id !== undefined && input.region_id !== ""
          ? { region_id: input.region_id }
          : {}),
      }),
      queryKeyNamespace: "phase3-product-query-options",
      requireRegion: false,
      service,
    })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    await queryClient.prefetchQuery(
      getListQueryOptions(
        {
          enabled: true,
          limit: 4,
          offset: 8,
          page: 3,
          region_id: "reg_1",
        },
        {
          useGlobalFetcher: true,
        },
      ),
    )
    await queryClient.prefetchQuery(
      getDetailQueryOptions({
        enabled: true,
        handle: "hoodie",
        region_id: "reg_1",
      }),
    )

    expect(service.getProductsGlobal).toHaveBeenCalledWith(
      { limit: 4, offset: 8, page: 3, region_id: "reg_1" },
      expect.any(AbortSignal),
    )
    expect(service.getProductByHandle).toHaveBeenCalledWith(
      { handle: "hoodie", region_id: "reg_1" },
      expect.any(AbortSignal),
    )
  })

  it("excludes enabled from suspense product inputs at type level", () => {
    interface Product {
      handle: string
    }
    interface ListInput {
      page?: number
      limit?: number
      region_id?: string
      enabled?: boolean
    }
    interface ListParams {
      page?: number
      limit?: number
      region_id?: string
    }
    interface DetailInput {
      handle: string
      region_id?: string
      enabled?: boolean
    }
    interface DetailParams {
      handle: string
      region_id?: string
    }

    const service = {
      getProductByHandle: vi.fn<() => Promise<Product | null>>(async () => {
        await Promise.resolve()
        return null
      }),
      getProducts: vi.fn<
        () => Promise<{
          products: Product[]
          count: number
          limit: number
          offset: number
        }>
      >(async () => {
        await Promise.resolve()
        return {
          count: 0,
          limit: 20,
          offset: 0,
          products: [],
        }
      }),
    }

    const { useSuspenseProducts, useSuspenseProduct } = createProductHooks<
      Product,
      ListInput,
      ListParams,
      DetailInput,
      DetailParams
    >({
      buildDetailParams: (input) => ({
        handle: input.handle,
        ...(input.region_id !== undefined && input.region_id !== ""
          ? { region_id: input.region_id }
          : {}),
      }),
      buildListParams: (input) => ({
        ...(input.page === undefined ? {} : { page: input.page }),
        ...(input.limit === undefined ? {} : { limit: input.limit }),
        ...(input.region_id !== undefined && input.region_id !== ""
          ? { region_id: input.region_id }
          : {}),
      }),
      queryKeyNamespace: "phase3-suspense-input-types",
      requireRegion: false,
      service,
    })

    type SuspenseListInput = Parameters<typeof useSuspenseProducts>[0]
    type SuspenseDetailInput = Parameters<typeof useSuspenseProduct>[0]

    const validListInput: SuspenseListInput = {
      limit: 10,
      page: 1,
      region_id: "reg_1",
    }
    const validDetailInput: SuspenseDetailInput = {
      handle: "hoodie",
      region_id: "reg_1",
    }
    void validListInput
    void validDetailInput

    expectTypeOf<"enabled">().not.toExtend<keyof SuspenseListInput>()
    expectTypeOf<"enabled">().not.toExtend<keyof SuspenseDetailInput>()
  })

  it("keeps runtime guard for delete address mutation while requiring addressId", async () => {
    interface Customer {
      id: string
    }
    interface Address {
      id: string
    }

    const service = {
      createAddress: vi.fn<() => Promise<{ id: string }>>(async () => {
        await Promise.resolve()
        return { id: "addr_created" }
      }),
      deleteAddress: vi.fn<() => Promise<void>>(async () => {}),
      getAddresses: vi.fn<() => Promise<{ addresses: Address[] }>>(async () => {
        await Promise.resolve()
        return { addresses: [] }
      }),
      updateAddress: vi.fn<() => Promise<{ id: string }>>(async () => {
        await Promise.resolve()
        return { id: "addr_updated" }
      }),
      updateCustomer: vi.fn<() => Promise<{ id: string }>>(async () => {
        await Promise.resolve()
        return { id: "cus_1" }
      }),
    }

    const { useDeleteCustomerAddress } = createCustomerHooks<
      Customer,
      Address,
      { enabled?: boolean }
    >({
      addressAdapter: {
        toCreateParams: (input) => input,
        toUpdateParams: (input) => input,
      },
      buildListParams: (input) => input,
      buildUpdateCustomerParams: (input) => input,
      queryKeyNamespace: "phase3-customers",
      service,
    })

    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)

    const { result } = renderHook(() => useDeleteCustomerAddress(), {
      wrapper,
    })

    await act(async () => {
      await expect(
        result.current.mutateAsync({ addressId: "" }),
      ).rejects.toThrow("Address id is required")
    })

    await act(async () => {
      await result.current.mutateAsync({ addressId: "addr_1" })
    })

    expect(service.deleteAddress).toHaveBeenCalledWith("addr_1")
  })
})

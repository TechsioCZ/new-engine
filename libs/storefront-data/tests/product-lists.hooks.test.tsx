import { QueryClient } from "@tanstack/react-query"
import { act, renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it } from "vitest"

import { StorefrontDataProvider } from "../src/client/provider"
import { createProductListHooks } from "../src/product-lists/hooks"
import { createProductListQueryKeys } from "../src/product-lists/query-keys"
import type {
  ProductListCartLike,
  ProductListDetailInputBase,
  ProductListListInputBase,
  ProductListService,
} from "../src/product-lists/types"
import { createCacheConfig } from "../src/shared/cache-config"

interface ProductList {
  id: string
}
interface ProductListItem {
  id: string
}
type Cart = ProductListCartLike
interface ListParams {
  limit: number
  offset: number
}
interface DetailParams {
  id?: string | null
}
type ListKeyParams = ListParams & { customerId?: string | null }
type DetailKeyParams = DetailParams & { customerId?: string | null }
type Service = ProductListService<
  ProductList,
  ProductListItem,
  Cart,
  ListParams,
  DetailParams
>

const createWrapper =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => (
    <StorefrontDataProvider client={client}>{children}</StorefrontDataProvider>
  )

const buildListParams = (input: ProductListListInputBase): ListParams => {
  const limit = input.limit ?? 20
  const page = input.page ?? 1
  return { limit, offset: (page - 1) * limit }
}

const buildDetailParams = (input: ProductListDetailInputBase): DetailParams =>
  input.id === undefined ? {} : { id: input.id }

const createService = (overrides: Partial<Service> = {}): Service => ({
  addFavoriteProductListItem: async () => null,
  addProductListItem: async () => null,
  changeProductListItemQuantity: async () => null,
  createCustomProductList: async () => null,
  createFavoriteProductList: async () => null,
  createProductListCart: async () => ({ id: "cart_1" }),
  deleteProductList: async (input) => ({ deleted: true, id: input.listId }),
  deleteProductListItem: async (input) => ({ deleted: true, id: input.itemId }),
  getProductList: async () => null,
  incrementProductListItem: async () => null,
  listProductLists: async (params) => ({
    productLists: [],
    count: 0,
    limit: params.limit,
    offset: params.offset,
  }),
  updateProductList: async () => null,
  updateProductListItem: async () => null,
  ...overrides,
})

describe("product-list prefetch hooks", () => {
  it("uses customer-scoped keys and prefetch skip controls for lists", async () => {
    let fetchCount = 0
    const queryKeys = createProductListQueryKeys<
      ListKeyParams,
      DetailKeyParams
    >("test-product-list-prefetch")
    const service = createService({
      listProductLists: async (params) => {
        fetchCount += 1
        return {
          count: 1,
          limit: params.limit,
          offset: params.offset,
          productLists: [{ id: `list_${params.offset}` }],
        }
      },
    })
    const { usePrefetchProductLists } = createProductListHooks<
      ProductList,
      ProductListItem,
      Cart,
      ProductListListInputBase,
      ListParams,
      ProductListDetailInputBase,
      DetailParams,
      ListKeyParams,
      DetailKeyParams
    >({
      buildDetailParams,
      buildListParams,
      cacheConfig: createCacheConfig({
        userData: { staleTime: 0 },
      }),
      queryKeys,
      service,
    })
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const wrapper = createWrapper(queryClient)
    const input = { customerId: "cus_1", limit: 2, page: 1 }
    const queryKey = queryKeys.list({
      ...buildListParams(input),
      customerId: "cus_1",
    })

    queryClient.setQueryData(queryKey, {
      count: 0,
      limit: 2,
      offset: 0,
      productLists: [],
    })

    const { result: freshResult } = renderHook(
      () => usePrefetchProductLists(),
      { wrapper }
    )
    const { result: anyResult } = renderHook(
      () => usePrefetchProductLists({ skipMode: "any" }),
      {
        wrapper,
      }
    )
    const { result: noSkipResult } = renderHook(
      () => usePrefetchProductLists({ skipIfCached: false }),
      { wrapper }
    )

    await act(async () => {
      await freshResult.current.prefetchProductLists(input)
    })
    expect(fetchCount).toBe(1)

    await act(async () => {
      await anyResult.current.prefetchProductLists(input)
    })
    expect(fetchCount).toBe(1)

    await act(async () => {
      await noSkipResult.current.prefetchProductLists(input)
    })
    expect(fetchCount).toBe(2)
    expect(queryClient.getQueryData(queryKey)).toStrictEqual({
      count: 1,
      limit: 2,
      offset: 0,
      productLists: [{ id: "list_0" }],
    })
  })

  it("prefetches detail only when product-list id is present", async () => {
    let fetchCount = 0
    const queryKeys = createProductListQueryKeys<
      ListKeyParams,
      DetailKeyParams
    >("test-product-list-detail-prefetch")
    const service = createService({
      getProductList: async (params) => {
        fetchCount += 1
        return params.id ? { id: params.id } : null
      },
    })
    const { usePrefetchProductList } = createProductListHooks<
      ProductList,
      ProductListItem,
      Cart,
      ProductListListInputBase,
      ListParams,
      ProductListDetailInputBase,
      DetailParams,
      ListKeyParams,
      DetailKeyParams
    >({
      buildDetailParams,
      buildListParams,
      queryKeys,
      service,
    })
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const wrapper = createWrapper(queryClient)
    const { result } = renderHook(() => usePrefetchProductList(), { wrapper })

    await act(async () => {
      await result.current.prefetchProductList({ customerId: "cus_1" })
    })
    expect(fetchCount).toBe(0)

    await act(async () => {
      await result.current.prefetchProductList({
        customerId: "cus_1",
        id: "list_1",
      })
    })

    expect(fetchCount).toBe(1)
    expect(
      queryClient.getQueryData(
        queryKeys.detail({ customerId: "cus_1", id: "list_1" })
      )
    ).toStrictEqual({ id: "list_1" })
  })
})

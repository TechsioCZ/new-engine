import { QueryClient } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import {
  createProductHooks,
  createProductQueryKeys,
  type ProductListInputBase,
  type ProductService,
} from "../src/products"
import { createCacheConfig } from "../src/shared"
import { StorefrontDataProvider } from "../src/client"
import {
  dehydrate,
  HydrationBoundary,
  getServerQueryClient,
} from "../src/server"

type TestProduct = {
  id: string
  title: string
}

type ProductListParams = {
  limit: number
  offset: number
  region_id?: string
}

type ProductDetailParams = {
  handle: string
  region_id?: string
}

const buildListParams = (
  input: ProductListInputBase
): ProductListParams => {
  const limit = input.limit ?? 20
  const page = input.page ?? 1
  const offset = (page - 1) * limit

  return {
    limit,
    offset,
    region_id: input.region_id,
  }
}

describe("storefront-data SSR hydration smoke", () => {
  it("hydrates prefetched queries without refetching on the client", async () => {
    let fetchCount = 0
    const service: ProductService<TestProduct, ProductListParams, ProductDetailParams> = {
      getProducts: async (params) => {
        fetchCount += 1
        return {
          products: [
            {
              id: `prod_${params.region_id ?? "default"}`,
              title: "Hydrated Product",
            },
          ],
          count: 1,
          limit: params.limit,
          offset: params.offset,
        }
      },
      getProductByHandle: async () => null,
    }

    const cacheConfig = createCacheConfig({
      semiStatic: {
        staleTime: Number.POSITIVE_INFINITY,
        gcTime: Number.POSITIVE_INFINITY,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
    })

    const queryKeyNamespace = "smoke-ssr"
    const { useProducts } = createProductHooks({
      service,
      buildListParams,
      queryKeyNamespace,
      cacheConfig,
    })

    const input = {
      page: 1,
      limit: 2,
      region_id: "reg_ssr",
    }

    const listParams = buildListParams(input)
    const queryKeys = createProductQueryKeys<ProductListParams, ProductDetailParams>(
      queryKeyNamespace
    )

    const serverQueryClient = getServerQueryClient()
    await serverQueryClient.prefetchQuery({
      queryKey: queryKeys.list(listParams),
      queryFn: () => service.getProducts(listParams),
    })

    const dehydratedState = dehydrate(serverQueryClient)

    const clientQueryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })

    const wrapper = ({ children }: { children: ReactNode }) => (
      <StorefrontDataProvider client={clientQueryClient}>
        <HydrationBoundary state={dehydratedState}>
          {children}
        </HydrationBoundary>
      </StorefrontDataProvider>
    )

    const { result } = renderHook(() => useProducts(input), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.products).toHaveLength(1)
    expect(fetchCount).toBe(1)
  })
})

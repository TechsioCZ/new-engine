import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it } from "vitest"

import { StorefrontDataProvider } from "../src/client/provider"
import { createProductHooks } from "../src/products/hooks"
import { createProductQueryKeys } from "../src/products/query-keys"
import type {
  ProductListInputBase,
  ProductService,
} from "../src/products/types"
import { getServerQueryClient } from "../src/server/get-query-client"
import { createCacheConfig } from "../src/shared/cache-config"

interface TestProduct {
  id: string
  title: string
}

interface ProductListParams {
  limit: number
  offset: number
  region_id?: string
}

interface ProductDetailParams {
  handle: string
  region_id?: string
}

const buildListParams = (input: ProductListInputBase): ProductListParams => {
  const limit = input.limit ?? 20
  const page = input.page ?? 1
  const offset = (page - 1) * limit

  return {
    limit,
    offset,
    ...(input.region_id ? { region_id: input.region_id } : {}),
  }
}

const trackedClients: QueryClient[] = []

const trackClient = (client: QueryClient) => {
  trackedClients.push(client)
  return client
}

const createTestClient = (
  config?: ConstructorParameters<typeof QueryClient>[0],
) => trackClient(new QueryClient(config))

afterEach(() => {
  for (const client of trackedClients) {
    client.clear()
  }
  trackedClients.length = 0
})

describe("storefront-data SSR hydration smoke", () => {
  it("hydrates prefetched queries without refetching on the client", async () => {
    let fetchCount = 0
    const service: ProductService<
      TestProduct,
      ProductListParams,
      ProductDetailParams
    > = {
      getProductByHandle: async () => null,
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
    }

    const cacheConfig = createCacheConfig({
      semiStatic: {
        gcTime: Number.POSITIVE_INFINITY,
        refetchOnMount: false,
        refetchOnReconnect: false,
        refetchOnWindowFocus: false,
        staleTime: Number.POSITIVE_INFINITY,
      },
    })

    const queryKeyNamespace = "smoke-ssr"
    const { useProducts } = createProductHooks({
      buildListParams,
      cacheConfig,
      queryKeyNamespace,
      service,
    })

    const input = {
      limit: 2,
      page: 1,
      region_id: "reg_ssr",
    }

    const listParams = buildListParams(input)
    const queryKeys = createProductQueryKeys<
      ProductListParams,
      ProductDetailParams
    >(queryKeyNamespace)

    const serverQueryClient = trackClient(getServerQueryClient())
    await serverQueryClient.prefetchQuery({
      queryFn: async () => service.getProducts(listParams),
      queryKey: queryKeys.list(listParams),
    })

    const dehydratedState = dehydrate(serverQueryClient)

    const clientQueryClient = createTestClient({
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
      expect(result.current.isSuccess).toBeTruthy()
    })

    expect(result.current.products).toHaveLength(1)
    expect(fetchCount).toBe(1)
  })
})

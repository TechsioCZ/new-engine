import { QueryClient } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import {
  createProductHooks,
  type ProductListInputBase,
  type ProductService,
} from "../src/products"
import { StorefrontDataProvider } from "../src/client"

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

describe("storefront-data network smoke", () => {
  const baseUrl = "https://storefront.test"
  let requestCount = 0
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    requestCount = 0
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      requestCount += 1

      const url = new URL(String(input))
      const limit = Number(url.searchParams.get("limit") ?? "0")
      const offset = Number(url.searchParams.get("offset") ?? "0")
      const regionId = url.searchParams.get("region_id") ?? ""

      const payload = {
        products: [
          {
            id: `prod_${regionId || "default"}`,
            title: "Network Product",
          },
        ],
        count: 1,
        limit,
        offset,
      }

      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      })
    }) as typeof fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it("fetches products through network and caches the result", async () => {
    const service: ProductService<TestProduct, ProductListParams, ProductDetailParams> = {
      getProducts: async (params) => {
        const query = new URLSearchParams({
          limit: String(params.limit),
          offset: String(params.offset),
          region_id: params.region_id ?? "",
        })
        const response = await fetch(`${baseUrl}/products?${query}`)
        return response.json()
      },
      getProductByHandle: async () => null,
    }

    const { useProducts } = createProductHooks({
      service,
      buildListParams,
      queryKeyNamespace: "smoke-network",
    })

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })

    const wrapper = ({ children }: { children: ReactNode }) => (
      <StorefrontDataProvider client={queryClient}>
        {children}
      </StorefrontDataProvider>
    )

    const { result } = renderHook(
      () =>
        useProducts({
          page: 1,
          limit: 2,
          region_id: "reg_test",
        }),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.products).toHaveLength(1)
    expect(requestCount).toBe(1)
  })
})

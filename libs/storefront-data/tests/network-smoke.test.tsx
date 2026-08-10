import { QueryClient } from "@tanstack/react-query"
import { getRecordValue, isRecord } from "@techsio/std/object"
import { renderHook, waitFor } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import type { ReactNode } from "react"
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest"

import { StorefrontDataProvider } from "../src/client/provider"
import { createProductHooks } from "../src/products/hooks"
import type {
  ProductListInputBase,
  ProductService,
} from "../src/products/types"
import { server } from "./msw-server"

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
    ...(input.region_id === undefined || input.region_id.length === 0
      ? {}
      : { region_id: input.region_id }),
  }
}

const trackedClients: QueryClient[] = []

const createTestClient = (
  config?: ConstructorParameters<typeof QueryClient>[0],
) => {
  const client = new QueryClient(config)
  trackedClients.push(client)
  return client
}

describe("storefront-data network smoke", () => {
  const baseUrl = "https://storefront.test"
  let requestCount = 0

  beforeEach(() => {
    requestCount = 0
    server.use(
      http.get(`${baseUrl}/products`, ({ request }) => {
        requestCount += 1

        const url = new URL(request.url)
        const limit = Number(url.searchParams.get("limit") ?? "0")
        const offset = Number(url.searchParams.get("offset") ?? "0")
        const regionId = url.searchParams.get("region_id") ?? ""

        const payload = {
          count: 1,
          limit,
          offset,
          products: [
            {
              id: `prod_${regionId.length > 0 ? regionId : "default"}`,
              title: "Network Product",
            },
          ],
        }

        return HttpResponse.json(payload)
      }),
    )
  })

  afterEach(() => {
    for (const client of trackedClients) {
      client.clear()
    }
    trackedClients.length = 0
  })

  it("fetches products through network and caches the result", async () => {
    const service: ProductService<
      TestProduct,
      ProductListParams,
      ProductDetailParams
    > = {
      getProductByHandle: vi
        .fn<
          ProductService<
            TestProduct,
            ProductListParams,
            ProductDetailParams
          >["getProductByHandle"]
        >()
        .mockResolvedValue(null),
      getProducts: async (params) => {
        const query = new URLSearchParams({
          limit: String(params.limit),
          offset: String(params.offset),
          region_id: params.region_id ?? "",
        })
        const response = await fetch(`${baseUrl}/products?${query}`)
        const payload: unknown = await response.json()
        if (!isRecord(payload)) {
          throw new TypeError("Invalid product list response")
        }
        const count = getRecordValue(payload, "count")
        const responseLimit = getRecordValue(payload, "limit")
        const responseOffset = getRecordValue(payload, "offset")
        const productPayloads = getRecordValue(payload, "products")
        if (!Array.isArray(productPayloads)) {
          throw new TypeError("Invalid product list products")
        }
        if (
          typeof count !== "number" ||
          typeof responseLimit !== "number" ||
          typeof responseOffset !== "number"
        ) {
          throw new TypeError("Invalid product list pagination")
        }
        const products = productPayloads.map((product: unknown) => {
          if (!isRecord(product)) {
            throw new TypeError("Invalid product response")
          }
          const id = getRecordValue(product, "id")
          const title = getRecordValue(product, "title")
          if (typeof id !== "string" || typeof title !== "string") {
            throw new TypeError("Invalid product response")
          }
          return { id, title }
        })
        return {
          count,
          limit: responseLimit,
          offset: responseOffset,
          products,
        }
      },
    }

    const { useProducts } = createProductHooks({
      buildListParams,
      queryKeyNamespace: "smoke-network",
      service,
    })

    const queryClient = createTestClient({
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
          limit: 2,
          page: 1,
          region_id: "reg_test",
        }),
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBeTruthy()
    })

    expect(result.current.products).toHaveLength(1)
    expect(requestCount).toBe(1)
  })
})

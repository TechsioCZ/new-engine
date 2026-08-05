import type { HttpTypes } from "@medusajs/types"
import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vitest"

import { createMedusaStorefrontServerReadPreset } from "../src/medusa/server-read"
import { createOrderQueryKeys } from "../src/orders/query-keys"
import type {
  MedusaProductListDetailKeyInput,
  MedusaProductListListKeyInput,
} from "../src/product-lists/medusa-service"
import { createProductListQueryKeys } from "../src/product-lists/query-keys"
import { createProductQueryKeys } from "../src/products/query-keys"
import { createRegionQueryKeys } from "../src/regions/query-keys"
import { createTestMedusaSdk } from "./medusa-fixtures"

const createSdkMock = () => {
  const clientFetch = vi.fn((path: string): Record<string, unknown> => {
    if (path === "/store/products") {
      return {
        count: 1,
        limit: 2,
        offset: 0,
        products: [{ id: "prod_1", handle: "p-1", title: "Product 1" }],
      }
    }

    if (path === "/store/regions") {
      return {
        count: 1,
        limit: 20,
        offset: 0,
        regions: [{ id: "reg_1", name: "CZ" }],
      }
    }

    if (path === "/store/product-lists") {
      return {
        count: 1,
        limit: 5,
        offset: 5,
        product_lists: [{ id: "list_1", title: "Favorite" }],
      }
    }

    if (path === "/store/product-lists/list_1") {
      return {
        product_list: { id: "list_1", title: "Favorite" },
      }
    }

    return {}
  })

  const sdk = createTestMedusaSdk()
  Object.defineProperty(sdk.client, "fetch", { value: clientFetch })
  Object.defineProperty(sdk.store.cart, "retrieve", {
    value: vi.fn(async () => ({ cart: null })),
  })
  Object.defineProperty(sdk.store.payment, "initiatePaymentSession", {
    value: vi.fn(async () => ({
      payment_collection: { payment_sessions: [] },
    })),
  })

  return {
    sdk,
    spies: {
      clientFetch,
    },
  }
}

describe(createMedusaStorefrontServerReadPreset, () => {
  it("builds namespaced reusable read query options for SSR prefetch", async () => {
    const { sdk, spies } = createSdkMock()
    const productQueryKeys = createProductQueryKeys<
      { limit: number },
      { handle: string }
    >(["tenant", "demo"])
    const regionQueryKeys = createRegionQueryKeys<
      Record<string, never>,
      { id: string }
    >(["tenant", "demo"])
    const productListQueryKeys = createProductListQueryKeys<
      MedusaProductListListKeyInput,
      MedusaProductListDetailKeyInput
    >(["tenant", "demo"])
    const preset = createMedusaStorefrontServerReadPreset({
      queryKeyNamespace: ["tenant", "demo"],
      sdk,
    })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    const productQuery = preset.queries.products.getListQueryOptions({
      limit: 2,
    })
    const regionQuery = preset.queries.regions.getListQueryOptions({})
    const productListQuery = preset.queries.productLists.getListQueryOptions({
      customerId: "cus_1",
      enabled: true,
      limit: 5,
      page: 2,
    })
    const productListDetailQuery =
      preset.queries.productLists.getDetailQueryOptions({
        customerId: "cus_1",
        enabled: true,
        id: "list_1",
      })

    expect(productQuery.queryKey).toStrictEqual(
      productQueryKeys.list({ limit: 2 })
    )
    expect(regionQuery.queryKey).toStrictEqual(regionQueryKeys.list({}))
    expect(productListQuery.queryKey).toStrictEqual(
      productListQueryKeys.list({
        customerId: "cus_1",
        limit: 5,
        offset: 5,
      })
    )
    expect(productListDetailQuery.queryKey).toStrictEqual(
      productListQueryKeys.detail({
        customerId: "cus_1",
        id: "list_1",
      })
    )

    await queryClient.prefetchQuery(productQuery)
    await queryClient.prefetchQuery(regionQuery)
    await queryClient.prefetchQuery(productListQuery)
    await queryClient.prefetchQuery(productListDetailQuery)

    expect(spies.clientFetch).toHaveBeenCalledWith(
      "/store/products",
      expect.objectContaining({
        query: expect.objectContaining({
          limit: 2,
        }),
      })
    )
    expect(spies.clientFetch).toHaveBeenCalledWith(
      "/store/regions",
      expect.objectContaining({
        query: {},
      })
    )
    expect(spies.clientFetch).toHaveBeenCalledWith(
      "/store/product-lists",
      expect.objectContaining({
        query: expect.objectContaining({
          limit: 5,
          offset: 5,
        }),
      })
    )
    expect(spies.clientFetch).toHaveBeenCalledWith(
      "/store/product-lists/list_1",
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      })
    )
  })

  it("supports custom order services and list param builders without touching hooks", async () => {
    const { sdk } = createSdkMock()
    const orderQueryKeys = createOrderQueryKeys<
      { limit: number; offset: number },
      { id: string }
    >("storefront-data")

    const customOrderService = {
      getOrder: vi.fn(async () => null),
      getOrders: vi.fn(
        async (): Promise<{
          orders: HttpTypes.StoreOrder[]
          count: number
        }> => ({
          orders: [],
          count: 0,
        })
      ),
    }

    const preset = createMedusaStorefrontServerReadPreset({
      orders: {
        hooks: {
          buildListParams: (input) => ({
            limit: input.limit ?? 20,
            offset: Math.max((input.page ?? 1) - 1, 0) * (input.limit ?? 20),
          }),
        },
        service: customOrderService,
      },
      sdk,
    })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    const ordersQuery = preset.queries.orders.getListQueryOptions({
      enabled: true,
      limit: 5,
      page: 3,
    })

    expect(ordersQuery.queryKey).toStrictEqual(
      orderQueryKeys.list({ limit: 5, offset: 10 })
    )
    expect(ordersQuery.staleTime).toBe(5 * 60 * 1000)

    await queryClient.prefetchQuery(ordersQuery)

    expect(customOrderService.getOrders).toHaveBeenCalledWith(
      { limit: 5, offset: 10 },
      expect.any(AbortSignal)
    )
  })

  it("forwards Product Attribute detail parameter overrides to SSR queries", async () => {
    const { sdk } = createSdkMock()
    const productAttributeService = {
      getProductAttributes: vi.fn(async () => []),
    }
    const preset = createMedusaStorefrontServerReadPreset({
      productAttributes: {
        hooks: {
          buildDetailParams: ({ productId }) => ({
            productId: `resolved:${productId}`,
          }),
        },
        service: productAttributeService,
      },
      sdk,
    })
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const query = preset.queries.productAttributes.getDetailQueryOptions({
      productId: "prod_1",
    })

    expect(query.queryKey).toStrictEqual([
      "storefront-data",
      "product-attributes",
      "detail",
      { productId: "resolved:prod_1" },
    ])
    await queryClient.prefetchQuery(query)
    expect(productAttributeService.getProductAttributes).toHaveBeenCalledWith(
      { productId: "resolved:prod_1" },
      expect.any(AbortSignal)
    )
  })
})

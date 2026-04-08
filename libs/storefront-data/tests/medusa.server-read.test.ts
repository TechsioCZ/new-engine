import type Medusa from "@medusajs/js-sdk"
import type { HttpTypes } from "@medusajs/types"
import { QueryClient } from "@tanstack/react-query"
import { createMedusaStorefrontServerReadPreset } from "../src/medusa/server-read"
import { createOrderQueryKeys } from "../src/orders/query-keys"
import { createProductQueryKeys } from "../src/products/query-keys"
import { createRegionQueryKeys } from "../src/regions/query-keys"

const createSdkMock = () => {
  const clientFetch = vi.fn(
    async (path: string): Promise<Record<string, unknown>> => {
      if (path === "/store/products") {
        return {
          products: [{ id: "prod_1", handle: "p-1", title: "Product 1" }],
          count: 1,
          limit: 2,
          offset: 0,
        }
      }

      if (path === "/store/regions") {
        return {
          regions: [{ id: "reg_1", name: "CZ" }],
          count: 1,
          limit: 20,
          offset: 0,
        }
      }

      return {}
    }
  )

  return {
    sdk: {
      client: {
        fetch: clientFetch,
      },
      store: {
        cart: {
          retrieve: vi.fn(async () => ({ cart: null })),
        },
        payment: {
          initiatePaymentSession: vi.fn(async () => ({
            payment_collection: { payment_sessions: [] },
          })),
        },
      },
    } as unknown as Medusa,
    spies: {
      clientFetch,
    },
  }
}

describe("createMedusaStorefrontServerReadPreset", () => {
  it("builds namespaced reusable read query options for SSR prefetch", async () => {
    const { sdk, spies } = createSdkMock()
    const productQueryKeys = createProductQueryKeys<{ limit: number }, { handle: string }>([
      "tenant",
      "demo",
    ])
    const regionQueryKeys = createRegionQueryKeys<Record<string, never>, { id: string }>([
      "tenant",
      "demo",
    ])
    const preset = createMedusaStorefrontServerReadPreset({
      sdk,
      queryKeyNamespace: ["tenant", "demo"],
    })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    const productQuery = preset.queries.products.getListQueryOptions({
      limit: 2,
    })
    const regionQuery = preset.queries.regions.getListQueryOptions({})

    expect(productQuery.queryKey).toEqual(productQueryKeys.list({ limit: 2 }))
    expect(regionQuery.queryKey).toEqual(regionQueryKeys.list({}))

    await queryClient.prefetchQuery(productQuery)
    await queryClient.prefetchQuery(regionQuery)

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
  })

  it("supports custom order services and list param builders without touching hooks", async () => {
    const { sdk } = createSdkMock()
    const orderQueryKeys = createOrderQueryKeys<{ limit: number; offset: number }, { id: string }>(
      "storefront-data"
    )

    const customOrderService = {
      getOrders: vi.fn(
        async (): Promise<{
          orders: HttpTypes.StoreOrder[]
          count: number
        }> => ({
          orders: [],
          count: 0,
        })
      ),
      getOrder: vi.fn(async () => null),
    }

    const preset = createMedusaStorefrontServerReadPreset({
      sdk,
      orders: {
        service: customOrderService,
        hooks: {
          buildListParams: (input) => ({
            limit: input.limit ?? 20,
            offset: Math.max((input.page ?? 1) - 1, 0) * (input.limit ?? 20),
          }),
        },
      },
    })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    const ordersQuery = preset.queries.orders.getListQueryOptions({
      page: 3,
      limit: 5,
      enabled: true,
    })

    expect(ordersQuery.queryKey).toEqual(
      orderQueryKeys.list({ limit: 5, offset: 10 })
    )
    expect(ordersQuery.staleTime).toBe(5 * 60 * 1000)

    await queryClient.prefetchQuery(ordersQuery)

    expect(customOrderService.getOrders).toHaveBeenCalledWith(
      { limit: 5, offset: 10 },
      expect.any(AbortSignal)
    )
  })
})

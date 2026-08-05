import { readFileSync } from "node:fs"
import { join } from "node:path"

import type { HttpTypes } from "@medusajs/types"
import { QueryClient } from "@tanstack/react-query"
import { vi, describe, expect, it } from "vitest"

import { createCatalogHooks } from "../src/catalog/hooks"
import { createMedusaCatalogService } from "../src/catalog/medusa-service"
import { createCatalogQueryKeys } from "../src/catalog/query-keys"
import { createMedusaCustomerService } from "../src/customers/medusa-service"

interface CatalogProduct {
  id: string
}
interface CatalogFacets {
  status: string[]
}
interface CatalogListInput {
  page?: number
  limit?: number
  region_id?: string
  country_code?: string
  enabled?: boolean
}
interface CatalogListParams {
  page: number
  limit: number
  region_id?: string
  country_code?: string
}

interface SdkLike {
  client: {
    fetch: ReturnType<typeof vi.fn>
  }
}

interface CustomerSdkLike {
  store: {
    customer: {
      listAddress: ReturnType<typeof vi.fn>
      createAddress: ReturnType<typeof vi.fn>
      updateAddress: ReturnType<typeof vi.fn>
      deleteAddress: ReturnType<typeof vi.fn>
      update: ReturnType<typeof vi.fn>
    }
  }
}

describe("phase 1 regressions", () => {
  it("applies region input to standalone catalog prefetch keys and params", async () => {
    const seenParams: CatalogListParams[] = []

    const service = {
      getCatalogProducts: vi.fn(async (params: CatalogListParams) => {
        seenParams.push(params)
        return {
          count: 1,
          facets: { status: [] },
          limit: params.limit,
          page: params.page,
          products: [{ id: "prod_1" }],
          totalPages: 1,
        }
      }),
    }

    const namespace = "phase1-regression-catalog"
    const { prefetchCatalogProducts } = createCatalogHooks<
      CatalogProduct,
      CatalogListInput,
      CatalogListParams,
      CatalogFacets
    >({
      buildListParams: (input) => ({
        page: input.page ?? 1,
        limit: input.limit ?? 12,
        ...(input.region_id ? { region_id: input.region_id } : {}),
        ...(input.country_code ? { country_code: input.country_code } : {}),
      }),
      fallbackFacets: { status: [] },
      queryKeyNamespace: namespace,
      requireRegion: true,
      service,
    })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    const region = { country_code: "cz", region_id: "reg_cz" }
    await prefetchCatalogProducts(queryClient, { limit: 2, page: 1 }, region)

    expect(seenParams).toHaveLength(1)
    expect(seenParams[0]).toStrictEqual({
      country_code: "cz",
      limit: 2,
      page: 1,
      region_id: "reg_cz",
    })

    const queryKeys = createCatalogQueryKeys<CatalogListParams>(namespace)
    const queryKey = queryKeys.list({
      country_code: "cz",
      limit: 2,
      page: 1,
      region_id: "reg_cz",
    })
    expect(queryClient.getQueryData(queryKey)).toBeTruthy()
  })

  it("ignores non-string facet values in Medusa catalog list normalization", async () => {
    const sdk: SdkLike = {
      client: {
        fetch: vi.fn().mockResolvedValue({
          count: 0,
          facets: {},
          limit: 12,
          page: 1,
          products: [],
          totalPages: 0,
        }),
      },
    }

    const service = createMedusaCatalogService(sdk as never)

    const malformedInput: Record<string, unknown> = {
      limit: 12,
      page: 1,
      status: [" active ", null, 5, "draft", ""],
    }

    await expect(
      Reflect.apply(service.getCatalogProducts, service, [malformedInput]),
    ).resolves.toBeTruthy()

    expect(sdk.client.fetch).toHaveBeenCalledWith("/store/catalog/products", {
      query: expect.objectContaining({
        limit: 12,
        page: 1,
        status: "active,draft",
      }),
      signal: null,
    })
  })

  it("selects newly created customer address by id diff instead of array order", async () => {
    const sdk: CustomerSdkLike = {
      store: {
        customer: {
          createAddress: vi.fn().mockResolvedValue({
            customer: {
              addresses: [
                { id: "addr_old_1", address_1: "Old 1" },
                { id: "addr_new", address_1: "New" },
                { id: "addr_old_2", address_1: "Old 2" },
              ],
            },
          }),
          deleteAddress: vi.fn(),
          listAddress: vi.fn().mockResolvedValue({
            addresses: [{ id: "addr_old_1" }, { id: "addr_old_2" }],
          }),
          update: vi.fn(),
          updateAddress: vi.fn(),
        },
      },
    }

    const service = createMedusaCustomerService(sdk as never)

    const created = await service.createAddress({
      address_1: "New",
      city: "Prague",
    })

    expect(created.id).toBe("addr_new")
  })

  it("loads all address pages before id diff in createAddress", async () => {
    const sdk: CustomerSdkLike = {
      store: {
        customer: {
          createAddress: vi.fn().mockResolvedValue({
            customer: {
              addresses: [
                { id: "addr_old_1", address_1: "Old 1" },
                { id: "addr_old_2", address_1: "Old 2" },
                { id: "addr_old_3", address_1: "Old 3" },
                { id: "addr_new", address_1: "New" },
              ],
            },
          }),
          deleteAddress: vi.fn(),
          listAddress: vi
            .fn()
            .mockResolvedValueOnce({
              addresses: [{ id: "addr_old_1" }, { id: "addr_old_2" }],
              count: 3,
            })
            .mockResolvedValueOnce({
              addresses: [{ id: "addr_old_3" }],
              count: 3,
            }),
          update: vi.fn(),
          updateAddress: vi.fn(),
        },
      },
    }

    const service = createMedusaCustomerService(sdk as never)

    const created = await service.createAddress({
      address_1: "New",
      city: "Prague",
    })

    expect(created.id).toBe("addr_new")
    expect(sdk.store.customer.listAddress).toHaveBeenCalledTimes(2)
    expect(sdk.store.customer.listAddress).toHaveBeenNthCalledWith(1, {
      limit: 100,
      offset: 0,
    })
    expect(sdk.store.customer.listAddress).toHaveBeenNthCalledWith(2, {
      limit: 100,
      offset: 2,
    })
  })

  it("falls back to newest matching address when pre-list fails", async () => {
    const sdk: CustomerSdkLike = {
      store: {
        customer: {
          createAddress: vi.fn().mockResolvedValue({
            customer: {
              addresses: [
                {
                  id: "addr_other",
                  address_1: "Other",
                  city: "Brno",
                  created_at: "2026-02-20T10:00:00.000Z",
                },
                {
                  id: "addr_match_old",
                  address_1: "Main",
                  city: "Prague",
                  created_at: "2026-02-20T12:00:00.000Z",
                },
                {
                  id: "addr_match_new",
                  address_1: "Main",
                  city: "Prague",
                  created_at: "2026-02-20T13:00:00.000Z",
                },
              ] as HttpTypes.StoreCustomerAddress[],
            },
          }),
          deleteAddress: vi.fn(),
          listAddress: vi.fn().mockRejectedValue(new Error("not available")),
          update: vi.fn(),
          updateAddress: vi.fn(),
        },
      },
    }

    const service = createMedusaCustomerService(sdk as never)

    const created = await service.createAddress({
      address_1: "Main",
      city: "Prague",
    })

    expect(created.id).toBe("addr_match_new")
  })

  it("defines explicit package exports and blocks root get-query-client alias", () => {
    const packageJson = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf-8"),
    ) as {
      exports?: Record<string, unknown>
    }

    expect(packageJson.exports).toBeTruthy()
    expect(packageJson.exports?.["."]).toBeNull()
    expect(packageJson.exports?.["./client/provider"]).toStrictEqual({
      import: "./dist/client/provider.js",
      types: "./dist/src/client/provider.d.ts",
    })
    expect(packageJson.exports?.["./server/get-query-client"]).toStrictEqual({
      import: "./dist/server/get-query-client.js",
      types: "./dist/src/server/get-query-client.d.ts",
    })
    expect(
      packageJson.exports?.["./product-lists/query-options"],
    ).toStrictEqual({
      import: "./dist/product-lists/query-options.js",
      types: "./dist/src/product-lists/query-options.d.ts",
    })
    expect(packageJson.exports?.["./get-query-client"]).toBeUndefined()
    expect(packageJson.exports?.["./medusa/cart-flow"]).toBeUndefined()
    expect(packageJson.exports?.["./*"]).toBeUndefined()
  })
})

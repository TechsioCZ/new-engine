import { QueryClient } from "@tanstack/react-query"
import type { HttpTypes } from "@medusajs/types"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { createCatalogHooks } from "../src/catalog/hooks"
import { createCatalogQueryKeys } from "../src/catalog/query-keys"
import { createMedusaCatalogService } from "../src/catalog/medusa-service"
import { createMedusaCustomerService } from "../src/customers/medusa-service"

type CatalogProduct = { id: string }
type CatalogFacets = { status: string[] }
type CatalogListInput = {
  page?: number
  limit?: number
  region_id?: string
  country_code?: string
  enabled?: boolean
}
type CatalogListParams = {
  page: number
  limit: number
  region_id?: string
  country_code?: string
}

type SdkLike = {
  client: {
    fetch: ReturnType<typeof vi.fn>
  }
}

type CustomerSdkLike = {
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
          products: [{ id: "prod_1" }],
          count: 1,
          page: params.page,
          limit: params.limit,
          facets: { status: [] },
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
      service,
      fallbackFacets: { status: [] },
      queryKeyNamespace: namespace,
      buildListParams: (input) => ({
        page: input.page ?? 1,
        limit: input.limit ?? 12,
        region_id: input.region_id,
        country_code: input.country_code,
      }),
      requireRegion: true,
    })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    const region = { region_id: "reg_cz", country_code: "cz" }
    await prefetchCatalogProducts(queryClient, { page: 1, limit: 2 }, region)

    expect(seenParams).toHaveLength(1)
    expect(seenParams[0]).toEqual({
      page: 1,
      limit: 2,
      region_id: "reg_cz",
      country_code: "cz",
    })

    const queryKeys = createCatalogQueryKeys<CatalogListParams>(namespace)
    const queryKey = queryKeys.list({
      page: 1,
      limit: 2,
      region_id: "reg_cz",
      country_code: "cz",
    })
    expect(queryClient.getQueryData(queryKey)).toBeTruthy()
  })

  it("ignores non-string facet values in Medusa catalog list normalization", async () => {
    const sdk: SdkLike = {
      client: {
        fetch: vi.fn().mockResolvedValue({
          products: [],
          count: 0,
          page: 1,
          limit: 12,
          totalPages: 0,
          facets: {},
        }),
      },
    }

    const service = createMedusaCatalogService(sdk as never)

    await expect(
      service.getCatalogProducts({
        page: 1,
        limit: 12,
        status: [
          " active ",
          null as unknown as string,
          5 as unknown as string,
          "draft",
          "",
        ],
      } as never)
    ).resolves.toBeTruthy()

    expect(sdk.client.fetch).toHaveBeenCalledWith("/store/catalog/products", {
      query: expect.objectContaining({
        page: 1,
        limit: 12,
        status: "active,draft",
      }),
      signal: undefined,
    })
  })

  it("selects newly created customer address by id diff instead of array order", async () => {
    const sdk: CustomerSdkLike = {
      store: {
        customer: {
          listAddress: vi.fn().mockResolvedValue({
            addresses: [{ id: "addr_old_1" }, { id: "addr_old_2" }],
          }),
          createAddress: vi.fn().mockResolvedValue({
            customer: {
              addresses: [
                { id: "addr_old_1", address_1: "Old 1" },
                { id: "addr_new", address_1: "New" },
                { id: "addr_old_2", address_1: "Old 2" },
              ],
            },
          }),
          updateAddress: vi.fn(),
          deleteAddress: vi.fn(),
          update: vi.fn(),
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
          updateAddress: vi.fn(),
          deleteAddress: vi.fn(),
          update: vi.fn(),
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
          listAddress: vi.fn().mockRejectedValue(new Error("not available")),
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
          updateAddress: vi.fn(),
          deleteAddress: vi.fn(),
          update: vi.fn(),
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
      readFileSync(join(process.cwd(), "package.json"), "utf8")
    ) as {
      exports?: Record<string, unknown>
    }

    expect(packageJson.exports).toBeTruthy()
    expect(packageJson.exports?.["."]).toEqual({
      types: "./dist/src/client/provider.d.ts",
      import: "./dist/client/provider.js",
    })
    expect(packageJson.exports?.["./server/get-query-client"]).toEqual({
      types: "./dist/src/server/get-query-client.d.ts",
      import: "./dist/server/get-query-client.js",
    })
    expect(packageJson.exports?.["./get-query-client"]).toBeNull()
    expect(packageJson.exports?.["./*"]).toBeUndefined()
  })
})

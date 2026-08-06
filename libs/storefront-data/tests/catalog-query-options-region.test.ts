import { QueryClient } from "@tanstack/react-query"
import { vi, describe, expect, it } from "vitest"

import { createCatalogQueryOptionsFactory } from "../src/catalog/query-options"
import type { CatalogFacets } from "../src/catalog/types"

interface Product {
  id: string
}

interface ListInput {
  q?: string
  region_id?: string
  country_code?: string
  enabled?: boolean
}

interface ListParams {
  q?: string
  region_id?: string
  country_code?: string
}

const EMPTY_FACETS: CatalogFacets = {
  brand: [],
  form: [],
  ingredient: [],
  price: {
    max: null,
    min: null,
  },
  status: [],
}

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

const createCatalogRegionTestContext = (queryKeyNamespace: string) => {
  const service = {
    getCatalogProducts: vi.fn<
      (
        params: ListParams,
        signal?: AbortSignal,
      ) => Promise<{
        count: number
        facets: CatalogFacets
        limit: number
        page: number
        products: Product[]
        totalPages: number
      }>
    >(
      async (_params) =>
        await Promise.resolve({
          count: 1,
          facets: EMPTY_FACETS,
          limit: 12,
          page: 1,
          products: [{ id: "prod_1" }],
          totalPages: 1,
        }),
    ),
  }

  const { getListQueryOptions } = createCatalogQueryOptionsFactory<
    Product,
    ListInput,
    ListParams
  >({
    buildListParams: (input) => ({
      ...(input.q !== undefined && input.q.length > 0 ? { q: input.q } : {}),
      ...(input.region_id !== undefined && input.region_id.length > 0
        ? { region_id: input.region_id }
        : {}),
      ...(input.country_code !== undefined && input.country_code.length > 0
        ? { country_code: input.country_code }
        : {}),
    }),
    queryKeyNamespace,
    service,
  })

  return {
    getListQueryOptions,
    queryClient: createQueryClient(),
    service,
  }
}

describe("catalog query options region merge", () => {
  it("uses context region when input region fields are undefined", async () => {
    const { service, getListQueryOptions, queryClient } =
      createCatalogRegionTestContext("catalog-region-options")
    await queryClient.prefetchQuery(
      getListQueryOptions(
        {
          q: "kretin",
        },
        {
          region: { country_code: "sk", region_id: "reg_sk" },
        },
      ),
    )

    expect(service.getCatalogProducts).toHaveBeenCalledWith(
      {
        country_code: "sk",
        q: "kretin",
        region_id: "reg_sk",
      },
      expect.any(AbortSignal),
    )
  })

  it("prefers explicit input region over context region", async () => {
    const { service, getListQueryOptions, queryClient } =
      createCatalogRegionTestContext("catalog-region-options-explicit")
    await queryClient.prefetchQuery(
      getListQueryOptions(
        {
          country_code: "cz",
          q: "kretin",
          region_id: "reg_cz",
        },
        {
          region: { country_code: "sk", region_id: "reg_sk" },
        },
      ),
    )

    expect(service.getCatalogProducts).toHaveBeenCalledWith(
      {
        country_code: "cz",
        q: "kretin",
        region_id: "reg_cz",
      },
      expect.any(AbortSignal),
    )
  })

  it("merges region fields independently from input and context", async () => {
    const { service, getListQueryOptions, queryClient } =
      createCatalogRegionTestContext("catalog-region-options-partial")
    await queryClient.prefetchQuery(
      getListQueryOptions(
        {
          country_code: "cz",
          q: "kretin",
        },
        {
          region: { country_code: "sk", region_id: "reg_cz" },
        },
      ),
    )

    expect(service.getCatalogProducts).toHaveBeenCalledWith(
      {
        country_code: "cz",
        q: "kretin",
        region_id: "reg_cz",
      },
      expect.any(AbortSignal),
    )
  })
})

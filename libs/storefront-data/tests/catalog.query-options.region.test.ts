import { QueryClient } from "@tanstack/react-query"
import { createCatalogQueryOptionsFactory } from "../src/catalog/query-options"
import type { CatalogFacets } from "../src/catalog/types"

type Product = { id: string }

type ListInput = {
  q?: string
  region_id?: string
  country_code?: string
  enabled?: boolean
}

type ListParams = {
  q?: string
  region_id?: string
  country_code?: string
}

const EMPTY_FACETS: CatalogFacets = {
  status: [],
  form: [],
  brand: [],
  ingredient: [],
  price: {
    min: null,
    max: null,
  },
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
    getCatalogProducts: vi.fn(async (params: ListParams) => ({
      products: [{ id: "prod_1" } as Product],
      count: 1,
      page: 1,
      limit: 12,
      totalPages: 1,
      facets: EMPTY_FACETS,
    })),
  }

  const { getListQueryOptions } = createCatalogQueryOptionsFactory<
    Product,
    ListInput,
    ListParams,
    CatalogFacets
  >({
    service,
    queryKeyNamespace,
    buildListParams: (input) => ({
      q: input.q,
      region_id: input.region_id,
      country_code: input.country_code,
    }),
  })

  return {
    service,
    getListQueryOptions,
    queryClient: createQueryClient(),
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
          region_id: undefined,
          country_code: undefined,
        },
        {
          region: { region_id: "reg_sk", country_code: "sk" },
        }
      )
    )

    expect(service.getCatalogProducts).toHaveBeenCalledWith(
      {
        q: "kretin",
        region_id: "reg_sk",
        country_code: "sk",
      },
      expect.any(AbortSignal)
    )
  })

  it("prefers explicit input region over context region", async () => {
    const { service, getListQueryOptions, queryClient } =
      createCatalogRegionTestContext("catalog-region-options-explicit")
    await queryClient.prefetchQuery(
      getListQueryOptions(
        {
          q: "kretin",
          region_id: "reg_cz",
          country_code: "cz",
        },
        {
          region: { region_id: "reg_sk", country_code: "sk" },
        }
      )
    )

    expect(service.getCatalogProducts).toHaveBeenCalledWith(
      {
        q: "kretin",
        region_id: "reg_cz",
        country_code: "cz",
      },
      expect.any(AbortSignal)
    )
  })

  it("merges region fields independently from input and context", async () => {
    const { service, getListQueryOptions, queryClient } =
      createCatalogRegionTestContext("catalog-region-options-partial")
    await queryClient.prefetchQuery(
      getListQueryOptions(
        {
          q: "kretin",
          region_id: undefined,
          country_code: "cz",
        },
        {
          region: { region_id: "reg_cz", country_code: "sk" },
        }
      )
    )

    expect(service.getCatalogProducts).toHaveBeenCalledWith(
      {
        q: "kretin",
        region_id: "reg_cz",
        country_code: "cz",
      },
      expect.any(AbortSignal)
    )
  })
})

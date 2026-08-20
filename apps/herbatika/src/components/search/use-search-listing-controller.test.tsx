import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  useCatalogListingInteractions: vi.fn(),
  useCatalogListingPageBounds: vi.fn(),
  useCatalogProducts: vi.fn(),
  useCategoryFacetItems: vi.fn(),
  useQueryStates: vi.fn(),
}))

vi.mock("nuqs", () => ({ useQueryStates: mocks.useQueryStates }))
vi.mock("@techsio/storefront-data/shared/region-context", () => ({
  useRegionContext: () => ({
    country_code: "sk",
    currency_code: "eur",
    region_id: "reg-sk",
  }),
}))
vi.mock("@/components/category/use-category-facet-items", () => ({
  useCategoryFacetItems: mocks.useCategoryFacetItems,
}))
vi.mock("@/lib/storefront/catalog-products", () => ({
  useCatalogProducts: mocks.useCatalogProducts,
}))
vi.mock("@/lib/storefront/use-catalog-listing-interactions", () => ({
  useCatalogListingInteractions: mocks.useCatalogListingInteractions,
  useCatalogListingPageBounds: mocks.useCatalogListingPageBounds,
}))

import { useSearchListingController } from "./use-search-listing-controller"

const queryState = {
  brand: [],
  form: [],
  ingredient: [],
  page: 1,
  price_max: null,
  price_min: null,
  q: "herbs",
  sort: "recommended",
  status: [],
}

const Harness = ({ refresh }: { refresh?: boolean }) => {
  useSearchListingController({ refreshServerDataOnQueryChange: refresh })
  return null
}

describe("useSearchListingController navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useQueryStates.mockReturnValue([queryState, vi.fn()])
    mocks.useCatalogProducts.mockReturnValue({
      error: null,
      facets: { price: { max: null, min: null } },
      isFetching: false,
      isLoading: false,
      products: [],
      query: { isPlaceholderData: false },
      totalCount: 0,
      totalPages: 1,
    })
    mocks.useCategoryFacetItems.mockReturnValue({
      asideBrandItems: [],
      asideFormItems: [],
      asideIngredientItems: [],
      asideStatusItems: [],
    })
    mocks.useCatalogListingInteractions.mockReturnValue({})
  })

  it("reruns SSR for result set B so its bounded URLR projections replace set A", () => {
    renderToStaticMarkup(<Harness refresh />)

    expect(mocks.useQueryStates).toHaveBeenCalledWith(expect.any(Object), {
      shallow: false,
    })
  })

  it("keeps other listing consumers on shallow query updates", () => {
    renderToStaticMarkup(<Harness />)

    expect(mocks.useQueryStates).toHaveBeenCalledWith(expect.any(Object), {
      shallow: true,
    })
  })
})

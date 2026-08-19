import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/components/catalog-listing-shell", () => ({
  CatalogListingShell: ({ results }: { results: React.ReactNode }) => results,
}))
vi.mock("@/components/category/category-facets-panel", () => ({
  CategoryFacetsPanel: () => null,
}))
vi.mock("@/components/category/category-results-section", () => ({
  CategoryResultsSection: ({
    productPublicSlugsById,
  }: {
    productPublicSlugsById: Readonly<Record<string, string>>
  }) => <output>{JSON.stringify(productPublicSlugsById)}</output>,
}))
vi.mock("@/components/recently-visited-products-section", () => ({
  RecentlyVisitedProductsSection: () => null,
}))
vi.mock("@/components/search/use-search-listing-controller", () => ({
  useSearchListingController: () => ({
    activeAsideFilterCount: 0,
    asideBrandItems: [],
    asideFormItems: [],
    asideIngredientItems: [],
    asideStatusItems: [],
    catalogQuery: {
      error: null,
      totalCount: 0,
      totalPages: 0,
    },
    isFiltersLoading: false,
    isProductAdding: () => false,
    isResultsLoading: false,
    isResultsRefreshing: false,
    onAddToCart: vi.fn(),
    onBrandToggle: vi.fn(),
    onFormToggle: vi.fn(),
    onIngredientToggle: vi.fn(),
    onPriceRangeCommit: vi.fn(),
    onProductHoverEnd: vi.fn(),
    onProductHoverStart: vi.fn(),
    onResetFilters: vi.fn(),
    onSortChange: vi.fn(),
    onStatusToggle: vi.fn(),
    page: 1,
    priceBounds: null,
    products: [],
    productsCurrencyCode: "EUR",
    queryState: { sort: "recommended" },
    selectedPriceRange: null,
  }),
}))
vi.mock("@/lib/storefront/market-context-provider", () => ({
  useMarketContext: () => ({ code: "sk" }),
}))

import { ProductIndexPage } from "./product-index-page"

describe("ProductIndexPage", () => {
  it("threads the server-projected product slug map to the result grid", () => {
    expect(
      renderToStaticMarkup(
        <ProductIndexPage
          productPublicSlugsById={{ "prod-1": "urlr-product" }}
        />
      )
    ).toContain("urlr-product")
  })
})

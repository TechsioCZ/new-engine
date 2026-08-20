import { describe, expect, it } from "vitest"
import type { RankedProductMatch } from "../../../../../modules/meilisearch/search-results"
import {
  resolveCatalogSearchExecutionPlan,
  resolveResultCount,
  selectProductMatchesForHydration,
} from "../route"

const TOTAL_PRODUCTS = 2002
const PAGE_SIZE = 20
const LAST_PAGE_OFFSET = 2000

const ascendingMatches: RankedProductMatch[] = Array.from(
  { length: TOTAL_PRODUCTS },
  (_, index) => ({ productId: `prod_${index + 1}` })
)

const planFor = (
  requestedSort: "price-asc" | "price-desc",
  options?: { cleanedQuery?: string; offset?: number }
) =>
  resolveCatalogSearchExecutionPlan({
    cleanedQuery: options?.cleanedQuery ?? "",
    fullSearchLimit: 1000,
    limit: PAGE_SIZE,
    offset: options?.offset ?? 0,
    profile: { locale: "ro-RO" },
    requestedSort,
  })

describe("Romanian catalog price pagination", () => {
  it("uses native RON facet sorting for the first page instead of the 1000-result hydration cap", () => {
    expect(planFor("price-asc")).toMatchObject({
      exhaustiveCandidateSearch: false,
      indexedProfilePriceSort: true,
      meiliSort: ["facet_price:asc"],
      paginationOptions: { limit: PAGE_SIZE, offset: 0 },
    })
    expect(planFor("price-desc")).toMatchObject({
      exhaustiveCandidateSearch: false,
      indexedProfilePriceSort: true,
      meiliSort: ["facet_price:desc"],
      paginationOptions: { limit: PAGE_SIZE, offset: 0 },
    })
  })

  it("returns the final two of 2002 ascending hits without a second offset slice", () => {
    const meiliPage = ascendingMatches.slice(LAST_PAGE_OFFSET)
    const selected = selectProductMatchesForHydration({
      cleanedQuery: "",
      limit: PAGE_SIZE,
      matchingProducts: meiliPage,
      offset: LAST_PAGE_OFFSET,
      prePaginated: true,
      priceSortDirection: 1,
    })

    expect(planFor("price-asc", { offset: LAST_PAGE_OFFSET })).toMatchObject({
      meiliSort: ["facet_price:asc"],
      paginationOptions: { limit: PAGE_SIZE, offset: LAST_PAGE_OFFSET },
    })
    expect(selected).toEqual([
      { productId: "prod_2001" },
      { productId: "prod_2002" },
    ])
    expect(
      resolveResultCount({
        estimatedTotalHits: TOTAL_PRODUCTS,
        exhaustiveCandidateSearch: false,
        fallbackCount: selected.length,
        matchingCount: selected.length,
        productStatusFacetCount: TOTAL_PRODUCTS,
      })
    ).toBe(TOTAL_PRODUCTS)
    expect(Math.ceil(TOTAL_PRODUCTS / PAGE_SIZE)).toBe(101)
  })

  it("preserves the exact reverse Meili order on the final descending page", () => {
    const descendingMatches = [...ascendingMatches].reverse()
    const meiliPage = descendingMatches.slice(LAST_PAGE_OFFSET)

    expect(
      selectProductMatchesForHydration({
        cleanedQuery: "",
        limit: PAGE_SIZE,
        matchingProducts: meiliPage,
        offset: LAST_PAGE_OFFSET,
        prePaginated: true,
        priceSortDirection: -1,
      })
    ).toEqual([{ productId: "prod_2" }, { productId: "prod_1" }])
    expect(planFor("price-desc", { offset: LAST_PAGE_OFFSET })).toMatchObject({
      meiliSort: ["facet_price:desc"],
      paginationOptions: { limit: PAGE_SIZE, offset: LAST_PAGE_OFFSET },
    })
  })

  it("keeps query plus price sorting paginated in Meili", () => {
    expect(
      planFor("price-asc", {
        cleanedQuery: "vitamina",
        offset: LAST_PAGE_OFFSET,
      })
    ).toMatchObject({
      exhaustiveCandidateSearch: false,
      meiliSort: ["facet_price:asc"],
      paginationOptions: { limit: PAGE_SIZE, offset: LAST_PAGE_OFFSET },
    })
  })

  it("preserves the existing Slovak calculated-price hydration path", () => {
    expect(
      resolveCatalogSearchExecutionPlan({
        cleanedQuery: "",
        fullSearchLimit: 1000,
        limit: PAGE_SIZE,
        offset: LAST_PAGE_OFFSET,
        profile: { locale: "sk-SK" },
        requestedSort: "price-asc",
      })
    ).toMatchObject({
      exhaustiveCandidateSearch: true,
      indexedProfilePriceSort: false,
      meiliSort: undefined,
      paginationOptions: { limit: 1000, offset: 0 },
    })
  })
})

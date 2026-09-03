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

const MARKET_PRICE_SCOPES = [
  { currency: "eur", locale: "sk-SK", market: "SK" },
  { currency: "czk", locale: "cs-CZ", market: "CZ" },
  { currency: "huf", locale: "hu-HU", market: "HU" },
  { currency: "ron", locale: "ro-RO", market: "RO" },
] as const

const ascendingMatches: RankedProductMatch[] = Array.from(
  { length: TOTAL_PRODUCTS },
  (_, index) => ({ productId: `prod_${index + 1}` })
)

type MarketPriceScope = (typeof MARKET_PRICE_SCOPES)[number]

const planFor = (
  market: MarketPriceScope,
  requestedSort: "price-asc" | "price-desc",
  options?: {
    cleanedQuery?: string
    offset?: number
    pricingContextCurrencyCode?: string
    requestedCurrencyCode?: string
  }
) =>
  resolveCatalogSearchExecutionPlan({
    cleanedQuery: options?.cleanedQuery ?? "",
    fullSearchLimit: 1000,
    limit: PAGE_SIZE,
    offset: options?.offset ?? 0,
    profile: { locale: market.locale },
    pricingContextCurrencyCode:
      options?.pricingContextCurrencyCode ?? market.currency,
    requestedCurrencyCode: options?.requestedCurrencyCode ?? market.currency,
    requestedSort,
  })

describe.each(
  MARKET_PRICE_SCOPES
)("$market catalog price pagination", (market) => {
  it("uses native market-currency facet sorting for the first ascending and descending pages", () => {
    expect(planFor(market, "price-asc")).toMatchObject({
      exhaustiveCandidateSearch: false,
      indexedProfilePriceSort: true,
      meiliSort: ["facet_price:asc"],
      paginationOptions: { limit: PAGE_SIZE, offset: 0 },
    })
    expect(planFor(market, "price-desc")).toMatchObject({
      exhaustiveCandidateSearch: false,
      indexedProfilePriceSort: true,
      meiliSort: ["facet_price:desc"],
      paginationOptions: { limit: PAGE_SIZE, offset: 0 },
    })
  })

  it("returns the exact final ascending and descending pages beyond 1000 hits", () => {
    const ascendingPage = ascendingMatches.slice(LAST_PAGE_OFFSET)
    const descendingPage = [...ascendingMatches]
      .reverse()
      .slice(LAST_PAGE_OFFSET)

    expect(
      planFor(market, "price-asc", { offset: LAST_PAGE_OFFSET })
    ).toMatchObject({
      meiliSort: ["facet_price:asc"],
      paginationOptions: { limit: PAGE_SIZE, offset: LAST_PAGE_OFFSET },
    })
    expect(
      selectProductMatchesForHydration({
        cleanedQuery: "",
        limit: PAGE_SIZE,
        matchingProducts: ascendingPage,
        offset: LAST_PAGE_OFFSET,
        prePaginated: true,
        priceSortDirection: 1,
      })
    ).toEqual([{ productId: "prod_2001" }, { productId: "prod_2002" }])

    expect(
      planFor(market, "price-desc", { offset: LAST_PAGE_OFFSET })
    ).toMatchObject({
      meiliSort: ["facet_price:desc"],
      paginationOptions: { limit: PAGE_SIZE, offset: LAST_PAGE_OFFSET },
    })
    expect(
      selectProductMatchesForHydration({
        cleanedQuery: "",
        limit: PAGE_SIZE,
        matchingProducts: descendingPage,
        offset: LAST_PAGE_OFFSET,
        prePaginated: true,
        priceSortDirection: -1,
      })
    ).toEqual([{ productId: "prod_2" }, { productId: "prod_1" }])
  })

  it("keeps query plus ascending and descending price sorting paginated in Meili", () => {
    for (const requestedSort of ["price-asc", "price-desc"] as const) {
      expect(
        planFor(market, requestedSort, {
          cleanedQuery: "vitamin",
          offset: LAST_PAGE_OFFSET,
        })
      ).toMatchObject({
        exhaustiveCandidateSearch: false,
        indexedProfilePriceSort: true,
        meiliSort: [
          `facet_price:${requestedSort === "price-asc" ? "asc" : "desc"}`,
        ],
        paginationOptions: { limit: PAGE_SIZE, offset: LAST_PAGE_OFFSET },
      })
    }
  })
})

describe("catalog price pagination currency safety", () => {
  it.each(
    MARKET_PRICE_SCOPES
  )("fails closed when $market lacks verified currency scope", (market) => {
    const plan = planFor(market, "price-asc", {
      pricingContextCurrencyCode: " ",
      requestedCurrencyCode: " ",
    })

    expect(plan).toMatchObject({
      exhaustiveCandidateSearch: true,
      indexedProfilePriceSort: false,
      meiliSort: undefined,
      paginationOptions: { limit: 1000, offset: 0 },
    })
  })

  it.each(
    MARKET_PRICE_SCOPES
  )("fails closed when $market has mixed pricing-context and request currencies", (market) => {
    const competingCurrency = market.currency === "eur" ? "ron" : "eur"
    const plan = planFor(market, "price-desc", {
      pricingContextCurrencyCode: market.currency,
      requestedCurrencyCode: competingCurrency,
    })

    expect(plan).toMatchObject({
      exhaustiveCandidateSearch: true,
      indexedProfilePriceSort: false,
      meiliSort: undefined,
      paginationOptions: { limit: 1000, offset: 0 },
    })
  })

  it.each(
    MARKET_PRICE_SCOPES
  )("fails closed when $market uses another market currency", (market) => {
    const competingCurrency = market.currency === "eur" ? "czk" : "eur"
    const plan = planFor(market, "price-asc", {
      pricingContextCurrencyCode: competingCurrency,
      requestedCurrencyCode: competingCurrency,
    })

    expect(plan).toMatchObject({
      exhaustiveCandidateSearch: true,
      indexedProfilePriceSort: false,
      meiliSort: undefined,
    })
  })

  it("fails closed for an unsupported profile locale", () => {
    expect(
      resolveCatalogSearchExecutionPlan({
        cleanedQuery: "",
        fullSearchLimit: 1000,
        limit: PAGE_SIZE,
        offset: LAST_PAGE_OFFSET,
        profile: { locale: "de-DE" },
        pricingContextCurrencyCode: "eur",
        requestedCurrencyCode: "eur",
        requestedSort: "price-asc",
      })
    ).toMatchObject({
      exhaustiveCandidateSearch: true,
      indexedProfilePriceSort: false,
      meiliSort: undefined,
    })
  })

  it("reports all 2002 native hits across 101 pages", () => {
    expect(
      resolveResultCount({
        estimatedTotalHits: TOTAL_PRODUCTS,
        exhaustiveCandidateSearch: false,
        fallbackCount: 2,
        matchingCount: 2,
        productStatusFacetCount: TOTAL_PRODUCTS,
      })
    ).toBe(TOTAL_PRODUCTS)
    expect(Math.ceil(TOTAL_PRODUCTS / PAGE_SIZE)).toBe(101)
  })
})

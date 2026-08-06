import { describe, expect, it } from "vitest"
import { validateEntityQuery, validateRouteQuery } from "./query-validation"

const invalidResult = (overrides: {
  unknown?: string[]
  duplicates?: string[]
  invalid?: string[]
}) => ({
  valid: false as const,
  unknown: [],
  duplicates: [],
  invalid: [],
  ...overrides,
})

describe("validateEntityQuery", () => {
  it("accepts the localized entity contract and tracking parameters", () => {
    expect(
      validateEntityQuery("product", { varianta: "SKU", utm_source: "x" })
    ).toEqual({ valid: true })
    expect(
      validateEntityQuery("category", { znacka: "pukka", strana: "2" })
    ).toEqual({ valid: true })
  })

  it("rejects unknown, duplicate, and invalid values", () => {
    expect(validateEntityQuery("page", { debug: "1", another: "2" })).toEqual(
      invalidResult({ unknown: ["another", "debug"] })
    )
    expect(
      validateEntityQuery(
        "product",
        new URLSearchParams("varianta=SKU-1&varianta=SKU-2")
      )
    ).toEqual(invalidResult({ duplicates: ["varianta"] }))
    expect(validateEntityQuery("category", { strana: "01" })).toEqual(
      invalidResult({ invalid: ["strana"] })
    )
  })

  it("keeps product and article parameters route-specific", () => {
    expect(validateEntityQuery("article", { varianta: "SKU" })).toEqual(
      invalidResult({ unknown: ["varianta"] })
    )
    expect(
      validateRouteQuery(
        "cz",
        { type: "entity", kind: "article", isDetail: true },
        new URLSearchParams("tema=fitness")
      )
    ).toEqual(invalidResult({ unknown: ["tema"] }))
    expect(
      validateRouteQuery(
        "cz",
        { type: "entity", kind: "product", isDetail: false },
        new URLSearchParams("varianta=SKU")
      )
    ).toEqual(invalidResult({ unknown: ["varianta"] }))
  })
})

describe("validateRouteQuery", () => {
  it("accepts the existing catalog and localized search contracts", () => {
    const searchRoute = {
      type: "flow" as const,
      kind: "search" as const,
      normalizedPath: "/vyhledavani",
    }
    expect(
      validateRouteQuery(
        "cz",
        searchRoute,
        new URLSearchParams(
          "q=caj&page=2&sort=price-asc&status=in-stock&form=sypany&brand=pukka&ingredient=mata&price_min=10&price_max=20"
        )
      )
    ).toEqual({ valid: true })
    expect(
      validateRouteQuery(
        "cz",
        searchRoute,
        new URLSearchParams("q=caj&strana=2&razeni=price-asc&znacka=pukka")
      )
    ).toEqual({ valid: true })
  })

  it("rejects cross-route leakage and conflicting naming aliases", () => {
    expect(
      validateRouteQuery(
        "cz",
        { type: "flow", kind: "cart", normalizedPath: "/kosik" },
        new URLSearchParams("q=caj")
      )
    ).toEqual(invalidResult({ unknown: ["q"] }))
    expect(
      validateRouteQuery(
        "cz",
        {
          type: "flow",
          kind: "search",
          normalizedPath: "/vyhledavani",
        },
        new URLSearchParams("q=caj&page=2&strana=2")
      )
    ).toEqual(invalidResult({ invalid: ["page", "strana"] }))
  })

  it("validates sort, facet, price, and search values", () => {
    const route = {
      type: "flow" as const,
      kind: "search" as const,
      normalizedPath: "/vyhledavani",
    }
    for (const query of [
      "q=",
      "q=caj&page=0",
      "q=caj&sort=PRICE-ASC",
      "q=caj&status=unknown",
      "q=caj&brand=pukka,,yogi",
      "q=caj&price_min=20&price_max=10",
    ]) {
      expect(
        validateRouteQuery("cz", route, new URLSearchParams(query)).valid
      ).toBe(false)
    }
  })

  it("uses exact flow-specific contracts", () => {
    expect(
      validateRouteQuery(
        "cz",
        {
          type: "flow",
          kind: "checkout",
          normalizedPath: "/pokladna/navrat-z-platby",
        },
        new URLSearchParams(
          "cart_id=cart_1&provider_id=pp_test&payment_cancelled=true"
        )
      )
    ).toEqual({ valid: true })
    expect(
      validateRouteQuery(
        "cz",
        {
          type: "flow",
          kind: "checkout",
          normalizedPath: "/pokladna/navrat-z-platby",
        },
        new URLSearchParams("cart_id=cart_1&utm_source=x")
      )
    ).toEqual(invalidResult({ unknown: ["utm_source"] }))
    expect(
      validateRouteQuery(
        "cz",
        {
          type: "flow",
          kind: "account",
          normalizedPath: "/ucet/objednavky",
        },
        new URLSearchParams("page=2")
      )
    ).toEqual({ valid: true })
  })
})

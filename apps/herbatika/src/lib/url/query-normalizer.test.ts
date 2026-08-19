import { describe, expect, it } from "vitest"
import {
  normalizeQuery,
  QUERY_ALLOWED_KEYS_BY_ROUTE_KIND,
  type QueryRouteKind,
} from "./query-normalizer"
import {
  allowedQueryKeyCases,
  canonicalSerializationCases,
  forbiddenQueryKeyCases,
  invalidPageValues,
  invalidPriceValues,
  validSortValues,
} from "./query-normalizer.fixtures"

const requireAccepted = (routeKind: QueryRouteKind, rawQuery: string) => {
  const result = normalizeQuery({ rawQuery, routeKind })

  if (result.kind !== "accept") {
    throw new Error(`Expected accept, received ${result.kind}`)
  }

  return result
}

const requireRedirect = (routeKind: QueryRouteKind, rawQuery: string) => {
  const result = normalizeQuery({ rawQuery, routeKind })

  if (result.kind !== "redirect") {
    throw new Error(`Expected redirect, received ${result.kind}`)
  }

  return result
}

const requireNotFound = (routeKind: QueryRouteKind, rawQuery: string) => {
  const result = normalizeQuery({ rawQuery, routeKind })

  if (result.kind !== "not-found") {
    throw new Error(`Expected not-found, received ${result.kind}`)
  }

  return result
}

describe("normalizeQuery route scopes", () => {
  it("publishes the exact per-route allowlists", () => {
    expect(QUERY_ALLOWED_KEYS_BY_ROUTE_KIND).toEqual({
      "account-orders": ["page"],
      "advice-article": [],
      "advice-index": ["page"],
      "brand-detail": [
        "page",
        "sort",
        "status",
        "form",
        "ingredient",
        "price_min",
        "price_max",
      ],
      "brand-index": [],
      "campaign-detail": [
        "page",
        "sort",
        "status",
        "form",
        "brand",
        "ingredient",
        "price_min",
        "price_max",
      ],
      "campaign-index": [],
      "category-detail": [
        "page",
        "sort",
        "status",
        "form",
        "brand",
        "ingredient",
        "price_min",
        "price_max",
      ],
      "category-index": [],
      "collection-detail": [
        "page",
        "sort",
        "status",
        "form",
        "brand",
        "ingredient",
        "price_min",
        "price_max",
      ],
      "collection-index": [],
      homepage: [],
      "information-detail": [],
      "product-detail": ["variant"],
      "product-index": [
        "page",
        "sort",
        "status",
        "form",
        "brand",
        "ingredient",
        "price_min",
        "price_max",
      ],
      search: [
        "page",
        "sort",
        "status",
        "form",
        "brand",
        "ingredient",
        "price_min",
        "price_max",
        "q",
      ],
      "static-page": [],
    })
  })

  it.each(allowedQueryKeyCases)("allows %s to use %s", (routeKind, key) => {
    const valueByKey: Record<string, string> = {
      brand: "pukka",
      form: "tea",
      ingredient: "vitamin-c",
      page: "2",
      price_max: "20.00",
      price_min: "5",
      q: "Herbal Tea",
      sort: "newest",
      status: "sale",
      variant: "SKU-AbC-01",
    }

    requireAccepted(
      routeKind,
      new URLSearchParams([[key, valueByKey[key]]]).toString()
    )
  })

  it.each(
    forbiddenQueryKeyCases
  )("rejects known key %s on the wrong route scope %s", (routeKind, key) => {
    const result = requireNotFound(routeKind, `${key}=value&unknown=strip-me`)

    expect(result.reason).toBe("known-key-not-allowed")
    expect(result.key).toBe(key)
  })
})

describe("normalizeQuery canonical output", () => {
  it("serializes business keys in the binding canonical order", () => {
    const result = requireRedirect(
      "search",
      "q=Herbal+Tea&price_max=20.00&price_min=5&ingredient=vitamin-c&brand=pukka&form=tea&status=sale&sort=newest&page=2"
    )

    expect(result.canonicalRawQuery).toBe(
      "page=2&sort=newest&status=sale&form=tea&brand=pukka&ingredient=vitamin-c&price_min=5&price_max=20.00&q=Herbal+Tea"
    )
    expect(result.redirectRawQuery).toBe(result.canonicalRawQuery)
  })

  it.each(
    canonicalSerializationCases
  )("uses WHATWG serialization for %s", (rawQuery, canonicalRawQuery) => {
    const result = normalizeQuery({ rawQuery, routeKind: "search" })

    expect(result.kind).toBe(
      rawQuery === canonicalRawQuery ? "accept" : "redirect"
    )
    if (result.kind === "not-found") {
      throw new Error("Expected a valid WHATWG serialization fixture")
    }
    expect(result.canonicalRawQuery).toBe(canonicalRawQuery)
  })

  it("keeps an already canonical query without requesting a redirect", () => {
    const result = requireAccepted(
      "product-index",
      "page=2&sort=newest&status=in-stock%2Cnew"
    )

    expect(result.canonicalRawQuery).toBe(
      "page=2&sort=newest&status=in-stock%2Cnew"
    )
  })

  it("strips empty query-pair separators from a business query", () => {
    const trailing = requireRedirect("product-index", "page=2&")
    const repeated = requireRedirect(
      "product-index",
      "&&page=2&&utm_source=Newsletter&"
    )

    expect(trailing.redirectRawQuery).toBe("page=2")
    expect(repeated.redirectRawQuery).toBe("page=2&utm_source=Newsletter")
    expect(
      requireAccepted("homepage", "utm_source=Newsletter&").tracking
    ).toEqual([{ key: "utm_source", value: "Newsletter" }])
  })

  it("strips page 1 and the default sort in one redirect", () => {
    const result = requireRedirect(
      "product-index",
      "sort=recommended&page=1&brand=pukka"
    )

    expect(result.canonicalRawQuery).toBe("brand=pukka")
    expect(result.redirectRawQuery).toBe("brand=pukka")
  })

  it("retains page 2 and applies an optional last-page boundary", () => {
    requireAccepted("product-index", "page=2")
    expect(
      normalizeQuery({
        lastPage: 1,
        rawQuery: "page=2",
        routeKind: "product-index",
      })
    ).toMatchObject({ kind: "not-found", reason: "page-out-of-range" })
  })
})

describe("normalizeQuery validation precedence", () => {
  it.each(invalidPageValues)("rejects invalid page %s", (page) => {
    expect(
      requireNotFound("product-index", `unknown=strip-me&page=${page}`).reason
    ).toBe("invalid-page")
  })

  it("rejects an invalid known value before stripping unknown keys", () => {
    expect(
      requireNotFound("product-index", "unknown=strip-me&page=01").reason
    ).toBe("invalid-page")
  })

  it.each([
    "page=2&page=3",
    "sort=newest&sort=price-asc",
    "status=sale&status=new",
    "form=tea&form=oil",
    "brand=pukka&brand=viridian",
    "ingredient=iron&ingredient=zinc",
    "price_min=1&price_min=2",
    "price_max=2&price_max=3",
  ])("rejects duplicate known keys: %s", (rawQuery) => {
    expect(requireNotFound("product-index", rawQuery).reason).toBe(
      "duplicate-known-key"
    )
  })

  it("rejects duplicate q and variant singleton keys", () => {
    expect(requireNotFound("search", "q=one&q=two").reason).toBe(
      "duplicate-known-key"
    )
    expect(
      requireNotFound("product-detail", "variant=SKU-One&variant=SKU-Two")
        .reason
    ).toBe("duplicate-known-key")
  })

  it("rejects more than 20 query pairs before stripping unknown keys", () => {
    const rawQuery = Array.from(
      { length: 21 },
      (_, index) => `unknown${index}=value`
    ).join("&")

    expect(requireNotFound("homepage", rawQuery).reason).toBe(
      "too-many-parameters"
    )
  })

  it("rejects decoded values over 256 UTF-8 bytes", () => {
    expect(
      requireNotFound("search", `q=${encodeURIComponent("č".repeat(129))}`)
        .reason
    ).toBe("value-too-long")
  })
})

describe("normalizeQuery facets, sort, and price", () => {
  it("trims, removes empties, deduplicates, and lexically sorts CSV", () => {
    const result = requireRedirect(
      "product-index",
      "status=%20sale%2Cnew%2Csale%2C%2Cin-stock%20"
    )

    expect(result.canonicalRawQuery).toBe("status=in-stock%2Cnew%2Csale")
    expect(result.values.status).toEqual(["in-stock", "new", "sale"])
  })

  it("rejects an empty CSV and more than ten normalized facet values", () => {
    expect(requireNotFound("product-index", "brand=%2C%20%2C").reason).toBe(
      "empty-facet"
    )
    expect(
      requireNotFound(
        "product-index",
        `ingredient=${Array.from(
          { length: 11 },
          (_, index) => `item-${index}`
        ).join(",")}`
      ).reason
    ).toBe("too-many-facet-values")
  })

  it("rejects invalid or wrong-case static facet tokens", () => {
    expect(requireNotFound("product-index", "status=SALE").reason).toBe(
      "invalid-facet"
    )
    expect(requireNotFound("product-index", "form=gummies").reason).toBe(
      "invalid-facet"
    )
    expect(requireNotFound("product-index", "brand=Pukka").reason).toBe(
      "invalid-facet"
    )
  })

  it.each(validSortValues)("accepts sort=%s", (sort) => {
    requireAccepted("product-index", `sort=${sort}`)
  })

  it("rejects invalid and wrong-case sort values", () => {
    expect(requireNotFound("product-index", "sort=RECOMMENDED").reason).toBe(
      "invalid-sort"
    )
    expect(requireNotFound("product-index", "sort=popular").reason).toBe(
      "invalid-sort"
    )
  })

  it.each(invalidPriceValues)("rejects invalid price %s", (price) => {
    expect(
      requireNotFound("product-index", `price_min=${encodeURIComponent(price)}`)
        .reason
    ).toBe("invalid-price")
  })

  it("compares decimal price bounds without floating-point coercion", () => {
    expect(
      requireNotFound(
        "product-index",
        "price_min=99999999999999999999.99&price_max=10000000000000000000.00"
      ).reason
    ).toBe("invalid-price-range")
    requireAccepted("product-index", "price_min=0001.50&price_max=00001.50")
  })
})

describe("normalizeQuery search, variant, tracking, and unknown keys", () => {
  it("treats missing and trimmed-empty q as the accepted search landing", () => {
    expect(requireAccepted("search", "").canonicalRawQuery).toBe("")
    expect(requireAccepted("search", "q=+++&utm_source=empty")).toMatchObject({
      canonicalRawQuery: "",
      values: {},
    })
  })

  it("trims q while preserving case and counts Unicode code points", () => {
    const normalized = requireRedirect(
      "search",
      `q=${encodeURIComponent("  Čaj Herbal  ")}`
    )

    expect(normalized.canonicalRawQuery).toBe("q=%C4%8Caj+Herbal")
    expect(normalized.values.q).toBe("Čaj Herbal")
    requireAccepted("search", `q=${"a".repeat(200)}`)
    expect(requireNotFound("search", `q=${"a".repeat(201)}`).reason).toBe(
      "query-too-long"
    )
    expect(
      requireNotFound(
        "search",
        `q=${encodeURIComponent(` ${"a".repeat(200)}`)}`
      ).reason
    ).toBe("query-too-long")
  })

  it("preserves the exact case of opaque variant values", () => {
    const result = requireAccepted(
      "product-detail",
      "variant=SKU-AbC-01%2FBlue"
    )

    expect(result.values.variant).toBe("SKU-AbC-01/Blue")
    expect(result.canonicalRawQuery).toBe("variant=SKU-AbC-01%2FBlue")
  })

  it("strips unknown and uppercase keys while preserving tracking in redirect", () => {
    const result = requireRedirect(
      "product-index",
      "Page=9&page=2&unknown=value&utm_source=Newsletter&gclid=AbC"
    )

    expect(result.canonicalRawQuery).toBe("page=2")
    expect(result.redirectRawQuery).toBe(
      "page=2&utm_source=Newsletter&gclid=AbC"
    )
    expect(result.tracking).toEqual([
      { key: "utm_source", value: "Newsletter" },
      { key: "gclid", value: "AbC" },
    ])
  })

  it("does not redirect a tracking-only request", () => {
    const result = requireAccepted(
      "homepage",
      "utm_source=Newsletter&fbclid=CaseSensitive"
    )

    expect(result.canonicalRawQuery).toBe("")
    expect(result.tracking).toEqual([
      { key: "utm_source", value: "Newsletter" },
      { key: "fbclid", value: "CaseSensitive" },
    ])
  })

  it("rejects more than ten utm pairs", () => {
    const rawQuery = Array.from(
      { length: 11 },
      (_, index) => `utm_source_${index}=value`
    ).join("&")

    expect(requireNotFound("homepage", rawQuery).reason).toBe(
      "too-many-tracking-parameters"
    )
  })
})

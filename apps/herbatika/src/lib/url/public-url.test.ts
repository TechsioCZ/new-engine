import { describe, expect, it } from "vitest"
import {
  buildAbsoluteUrl,
  buildPath,
  resolveNavigationMode,
  withPublicSearchParams,
} from "./public-url"

describe("public URL API", () => {
  it.each([
    ["sk", "/produkty/ashwagandha"],
    ["cz", "/produkty/ashwagandha"],
    ["hu", "/termekek/ashwagandha"],
    ["ro", "/produse/ashwagandha"],
  ] as const)("builds the localized product path for %s", (market, expected) => {
    expect(buildPath({ kind: "product", slug: "ashwagandha" }, market)).toBe(
      expected
    )
  })

  it("builds entity indexes, root-static pages, and private flows", () => {
    expect(buildPath({ kind: "article" }, "sk")).toBe("/blog")
    expect(buildPath({ kind: "static", page: "faq" }, "hu")).toBe(
      "/gyakori-kerdesek"
    )
    expect(
      buildPath({ kind: "account", section: "orders", value: "order 1" }, "ro")
    ).toBe("/cont/comenzi/order%201")
    expect(buildPath({ kind: "checkout", step: "paymentReturn" }, "cz")).toBe(
      "/pokladna/navrat-z-platby"
    )
  })

  it.each([
    ["sk", "dropshipping", "/dropshipping"],
    ["sk", "privateLabel", "/private-label"],
    ["sk", "wholesale", "/velkoobchod"],
    ["cz", "dropshipping", "/dropshipping"],
    ["cz", "privateLabel", "/private-label"],
    ["cz", "wholesale", "/velkoobchod"],
  ] as const)("builds the customer-authoritative %s %s static path", (market, page, expected) => {
    expect(buildPath({ kind: "static", page }, market)).toBe(expected)
  })

  it("preserves opaque checkout confirmation identifiers", () => {
    expect(
      buildPath(
        { kind: "checkout", step: "confirmation", value: "Order_AbC-9" },
        "cz"
      )
    ).toBe("/pokladna/potvrzeni-objednavky/Order_AbC-9")
  })

  it("uses the market canonical origin", () => {
    expect(
      buildAbsoluteUrl({ kind: "category", slug: "doplnky" }, "sk").href
    ).toBe("https://herbatica.sk/kategorie/doplnky")
  })

  it("builds a validated hierarchical static URLR snapshot path", () => {
    expect(
      buildAbsoluteUrl(
        { kind: "staticSnapshot", segments: ["blog", "spanok"] },
        "sk"
      ).href
    ).toBe("https://herbatica.sk/blog/spanok")
    expect(() =>
      buildPath({ kind: "staticSnapshot", segments: ["Not-Canonical"] }, "sk")
    ).toThrow("normalized ASCII")
  })

  it("accepts a customer-authoritative static snapshot segment with consecutive hyphens", () => {
    expect(
      buildPath(
        { kind: "staticSnapshot", segments: ["dropshipping--velkoobchod"] },
        "sk"
      )
    ).toBe("/dropshipping--velkoobchod")
  })

  it("requires document navigation for every public HTML target", () => {
    expect(resolveNavigationMode({ kind: "home" })).toBe("document")
    expect(
      resolveNavigationMode({ kind: "product", slug: "ashwagandha" })
    ).toBe("document")
    expect(resolveNavigationMode({ kind: "account", section: "orders" })).toBe(
      "document"
    )
  })

  it("adds query values without losing an existing canonical query", () => {
    expect(
      withPublicSearchParams("/produkty/a?variant=sku-1", {
        page: 2,
        variant: "sku-2",
      })
    ).toBe("/produkty/a?variant=sku-2&page=2")
  })

  it("rejects runtime title-shaped or reserved entity slugs", () => {
    expect(() =>
      buildPath({ kind: "product", slug: "Invalid title" }, "sk")
    ).toThrow()
    expect(() => buildPath({ kind: "product", slug: "api" }, "sk")).toThrow()
  })
})

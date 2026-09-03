import { describe, expect, it } from "vitest"
import {
  HEADER_ACTION_ITEMS,
  PRIMARY_NAV_ITEMS,
  resolveHeaderCategoryLabel,
} from "./herbatika-header.navigation"

describe("header category navigation", () => {
  it("keeps only stable root handles in the configured navigation order", () => {
    expect(PRIMARY_NAV_ITEMS).toEqual([
      { rootHandle: "trapi-ma" },
      { rootHandle: "prirodna-kozmetika" },
      { rootHandle: "doplnky-vyzivy" },
      { rootHandle: "potraviny-a-napoje" },
      { rootHandle: "eko-domacnost" },
      { rootHandle: "ucinne-zlozky-od-a-po-z" },
      { rootHandle: "novinky" },
    ])
    expect(HEADER_ACTION_ITEMS.every((item) => !("label" in item))).toBe(true)
  })

  it("uses the localized category name supplied by the catalog", () => {
    expect(
      resolveHeaderCategoryLabel(
        "> Localized catalog name",
        "stable-root-handle"
      )
    ).toBe("Localized catalog name")
  })

  it("falls back to the stable handle instead of a Slovak label", () => {
    expect(resolveHeaderCategoryLabel(undefined, "stable-root-handle")).toBe(
      "stable-root-handle"
    )
    expect(resolveHeaderCategoryLabel("  ", "stable-root-handle")).toBe(
      "stable-root-handle"
    )
  })
})

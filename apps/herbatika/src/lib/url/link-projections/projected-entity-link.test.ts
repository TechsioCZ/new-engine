import { describe, expect, it } from "vitest"
import { buildProjectedEntityPath } from "./projected-entity-link"

describe("buildProjectedEntityPath", () => {
  it("builds a localized path from an explicit registry projection", () => {
    expect(
      buildProjectedEntityPath(
        "product",
        { publicSlug: "medvedi-cesnek" },
        "cz"
      )
    ).toBe("/produkty/medvedi-cesnek")
  })

  it("fails closed when the public projection is missing", () => {
    expect(buildProjectedEntityPath("product", undefined, "sk")).toBeNull()
    expect(
      buildProjectedEntityPath("article", { publicSlug: null }, "sk")
    ).toBeNull()
  })

  it("never accepts an empty public slug", () => {
    expect(
      buildProjectedEntityPath("category", { publicSlug: "" }, "hu")
    ).toBeNull()
  })
})

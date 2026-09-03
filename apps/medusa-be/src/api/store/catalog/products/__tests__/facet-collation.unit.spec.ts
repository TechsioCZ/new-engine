import { describe, expect, it } from "vitest"
import { sortFacetCountItems } from "../utils"

const equalCountItems = [
  { id: "chaga", label: "Chaga", count: 1 },
  { id: "mulberry", label: "Dud", count: 1 },
]

describe("catalog facet collation", () => {
  it("uses the supplied Romanian locale", () => {
    expect(
      sortFacetCountItems(equalCountItems, "ro-RO").map((item) => item.id)
    ).toEqual(["chaga", "mulberry"])
  })

  it("preserves the Slovak fallback when no locale is supplied", () => {
    expect(sortFacetCountItems(equalCountItems).map((item) => item.id)).toEqual(
      ["mulberry", "chaga"]
    )
  })
})

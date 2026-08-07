import { describe, expect, it } from "vitest"
import { slugifyProductTitle } from "./product-slug"
import { MAX_SLUG_LENGTH } from "./slug"

describe("slugifyProductTitle", () => {
  it("slugifies a normal title unchanged", () => {
    expect(
      slugifyProductTitle("Befungin - tinktúra s extraktom - 100 ml")
    ).toBe("befungin-tinktura-s-extraktom-100-ml")
  })

  it("truncates an over-long title at a word boundary within the limit", () => {
    const title = `${"slovo ".repeat(40)}koniec`
    const slug = slugifyProductTitle(title)

    expect(slug.length).toBeLessThanOrEqual(MAX_SLUG_LENGTH)
    expect(slug.startsWith("slovo-slovo")).toBe(true)
    expect(slug.endsWith("-")).toBe(false)
  })

  it("keeps a single over-long word bounded without a trailing hyphen", () => {
    const slug = slugifyProductTitle("a".repeat(MAX_SLUG_LENGTH + 25))

    expect(slug.length).toBeLessThanOrEqual(MAX_SLUG_LENGTH)
    expect(slug.endsWith("-")).toBe(false)
  })
})

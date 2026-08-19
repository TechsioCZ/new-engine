import { describe, expect, it } from "vitest"
import { resolveBlogCardPublicSlug } from "./blog-card-projection"

const post = {
  sourceId: "article_42",
} as Parameters<typeof resolveBlogCardPublicSlug>[0]

describe("resolveBlogCardPublicSlug", () => {
  it("resolves an article slug only through its stable source id", () => {
    expect(
      resolveBlogCardPublicSlug(post, {
        article_42: "verejny-clanok",
      })
    ).toBe("verejny-clanok")
  })

  it("fails closed when the complete projection map has no entry", () => {
    expect(resolveBlogCardPublicSlug(post, {})).toBeUndefined()
  })
})

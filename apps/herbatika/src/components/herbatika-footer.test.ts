import { describe, expect, it } from "vitest"
import { resolveFooterNavigationItem } from "./herbatika-footer"

describe("resolveFooterNavigationItem", () => {
  it("accepts a valid internal path for the active market", () => {
    expect(
      resolveFooterNavigationItem(
        {
          href: "/informacie/about-herbatica",
          slot: "about",
          type: "internal",
        },
        "sk"
      )
    ).toEqual({
      href: "/informacie/about-herbatica",
      kind: "internal",
    })
  })

  it("supports application routes independently of their translation slot", () => {
    expect(
      resolveFooterNavigationItem(
        {
          href: "/kategorie/darceky",
          slot: "gift_voucher",
          type: "internal",
        },
        "sk"
      )
    ).toEqual({ href: "/kategorie/darceky", kind: "internal" })
  })

  it("fails closed for an unknown internal route", () => {
    expect(
      resolveFooterNavigationItem(
        {
          href: "/legacy-or-editor-authored-path",
          slot: "about",
          type: "internal",
        },
        "sk"
      )
    ).toBeNull()
  })

  it.each([
    "javascript:alert(1)",
    "//example.com/reviews",
    "https://user:secret@example.com/reviews",
  ])("rejects unsafe external CMS href %s", (href) => {
    expect(
      resolveFooterNavigationItem(
        {
          href,
          slot: "reviews",
          type: "external",
        },
        "sk"
      )
    ).toBeNull()
  })

  it("accepts an explicit HTTP(S) external URL and preserves tab intent", () => {
    expect(
      resolveFooterNavigationItem(
        {
          href: "https://example.com/reviews",
          newTab: false,
          slot: "reviews",
          type: "external",
        },
        "sk"
      )
    ).toEqual({
      href: "https://example.com/reviews",
      kind: "external",
      newTab: false,
    })
  })
})

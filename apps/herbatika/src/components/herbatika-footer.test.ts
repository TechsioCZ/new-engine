import { describe, expect, it } from "vitest"
import { resolveFooterNavigationItem } from "./herbatika-footer"

describe("resolveFooterNavigationItem", () => {
  it("rebuilds known internal slots without trusting the CMS href", () => {
    expect(
      resolveFooterNavigationItem({
        href: "/legacy-or-editor-authored-path",
        slot: "about",
        type: "internal",
      })
    ).toEqual({
      kind: "internal",
      target: { kind: "static", page: "about" },
    })
  })

  it("fails closed when an internal slot has no typed URL target", () => {
    expect(
      resolveFooterNavigationItem({
        href: "/darcekova-poukazka",
        slot: "gift_voucher",
        type: "internal",
      })
    ).toBeNull()
  })

  it.each([
    "javascript:alert(1)",
    "//example.com/reviews",
    "https://user:secret@example.com/reviews",
  ])("rejects unsafe external CMS href %s", (href) => {
    expect(
      resolveFooterNavigationItem({
        href,
        slot: "reviews",
        type: "external",
      })
    ).toBeNull()
  })

  it("accepts an explicit HTTP(S) external URL and preserves tab intent", () => {
    expect(
      resolveFooterNavigationItem({
        href: "https://example.com/reviews",
        newTab: false,
        slot: "reviews",
        type: "external",
      })
    ).toEqual({
      href: "https://example.com/reviews",
      kind: "external",
      newTab: false,
    })
  })
})

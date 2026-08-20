import { describe, expect, it } from "vitest"
import { parsePublicPath } from "@/lib/url/public-route-api"
import { buildPath } from "@/lib/url/public-url"
import type { StaticRootPageKey } from "@/lib/url/types"
import {
  getRoDemoFooterNavigation,
  getRoDemoStaticPage,
  isRoDemoStaticPage,
  RO_DEMO_APPROVAL_MARKER,
} from "./ro-demo-static-pages"

const RO_STATIC_ROUTE_MATRIX = [
  ["contact", "/contact"],
  ["shipping", "/livrare"],
  ["returns", "/retururi"],
  ["terms", "/termeni-si-conditii"],
  ["privacy", "/politica-de-confidentialitate"],
  ["cookies", "/politica-cookies"],
  ["affiliate", "/program-afiliere"],
  ["wholesale", "/vanzare-en-gros"],
  ["dropshipping", "/dropshipping"],
  ["privateLabel", "/marca-proprie"],
  ["giftVoucher", "/voucher-cadou"],
] as const satisfies readonly (readonly [StaticRootPageKey, string])[]

describe("Romanian demo static route matrix", () => {
  it.each(
    RO_STATIC_ROUTE_MATRIX
  )("builds and parses %s at %s", (page, pathname) => {
    expect(buildPath({ kind: "static", page }, "ro")).toBe(pathname)
    expect(
      parsePublicPath({ market: "ro", pathname, rawQuery: "" })
    ).toMatchObject({
      kind: "found",
      target: { kind: "static", page },
    })
  })

  it.each(
    RO_STATIC_ROUTE_MATRIX
  )("provides explicit unreviewed Romanian demo content for %s", (page) => {
    const fallback = getRoDemoStaticPage(page, "ro-RO")

    expect(fallback).not.toBeNull()
    expect(fallback?.id).toBe(`${RO_DEMO_APPROVAL_MARKER}:ro:${page}`)
    expect(fallback?.content).toContain("Conținut demonstrativ neaprobat")
    expect(fallback && isRoDemoStaticPage(fallback)).toBe(true)
  })

  it("never supplies Romanian demo content to another locale", () => {
    expect(getRoDemoStaticPage("terms", "sk-SK")).toBeNull()
    expect(getRoDemoStaticPage("terms", "cs-CZ")).toBeNull()
    expect(getRoDemoStaticPage("terms", "hu-HU")).toBeNull()
  })

  it("does not publish the RO-only demo roots in the SK route space", () => {
    expect(() =>
      buildPath({ kind: "static", page: "affiliate" }, "sk")
    ).toThrow("Static page affiliate is not available for market sk")
  })

  it("does not invent legal terms and links legal pages to official sources", () => {
    expect(getRoDemoStaticPage("terms", "ro-RO")?.content).toContain(
      "https://www.herbatica.ro/termeni-si-conditii/"
    )
    expect(getRoDemoStaticPage("privacy", "ro-RO")?.content).toContain(
      "https://www.herbatica.ro/declaratie-privind-protectia-datelor-cu-caracter-personal/"
    )
    expect(getRoDemoStaticPage("cookies", "ro-RO")?.content).toContain(
      "Textul juridic complet privind cookie-urile nu este inclus"
    )
  })

  it("provides a complete fallback footer without leaking it to SK", () => {
    const navigation = getRoDemoFooterNavigation("ro-RO")
    const items = navigation?.columns.flatMap((column) => column.items) ?? []

    expect(navigation?.columns.map((column) => column.slot)).toEqual([
      "information",
      "important",
      "partners",
    ])
    expect(items.map((item) => item.href)).toEqual(
      expect.arrayContaining(
        RO_STATIC_ROUTE_MATRIX.filter(([page]) => page !== "contact").map(
          ([, pathname]) => pathname
        )
      )
    )
    expect(getRoDemoFooterNavigation("sk-SK")).toBeNull()
  })
})

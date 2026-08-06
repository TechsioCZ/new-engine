import { describe, expect, it } from "vitest"
import { getSegment } from "@/lib/url/segments"
import { MARKETS } from "@/lib/url/types"
import { parsePublicRoute } from "./route-parser"

describe("parsePublicRoute", () => {
  for (const market of MARKETS) {
    it(`parses the localized public matrix for ${market}`, () => {
      expect(parsePublicRoute({ market })).toEqual({ type: "home" })
      expect(
        parsePublicRoute({
          market,
          pathnameSegments: [getSegment(market, "products")],
        })
      ).toEqual({ type: "index", kind: "product" })
      expect(
        parsePublicRoute({
          market,
          pathnameSegments: [getSegment(market, "products"), "wire-product"],
        })
      ).toEqual({ type: "entity", kind: "product", slug: "wire-product" })
      expect(
        parsePublicRoute({
          market,
          pathnameSegments: [
            getSegment(market, "information"),
            getSegment(market, "about"),
          ],
        })
      ).toEqual({
        type: "entity",
        kind: "page",
        slug: getSegment(market, "about"),
      })
      expect(
        parsePublicRoute({
          market,
          pathnameSegments: [
            getSegment(market, "checkout"),
            getSegment(market, "checkout.paymentReturn"),
          ],
        })
      ).toEqual({ type: "checkout", route: "payment-return" })
      expect(
        parsePublicRoute({
          market,
          pathnameSegments: [
            getSegment(market, "account"),
            getSegment(market, "account.orders"),
            "Order-ABC",
          ],
        })
      ).toEqual({ type: "account", orderId: "Order-ABC" })
      expect(
        parsePublicRoute({
          market,
          pathnameSegments: [
            getSegment(market, "reviews"),
            getSegment(market, "reviews.product"),
            "Token-ABC",
          ],
        })
      ).toEqual({ type: "review", token: "Token-ABC" })
    })
  }

  it("rejects root static slugs, uppercase canonical segments, and path separators", () => {
    expect(
      parsePublicRoute({
        market: "sk",
        pathnameSegments: [getSegment("sk", "about")],
      })
    ).toEqual({ type: "not-found" })
    expect(
      parsePublicRoute({
        market: "sk",
        pathnameSegments: ["PRODUKTY", "wire-product"],
      })
    ).toEqual({ type: "not-found" })
    expect(
      parsePublicRoute({
        market: "sk",
        pathnameSegments: ["produkty", "Wire-Product"],
      })
    ).toEqual({ type: "not-found" })
    expect(
      parsePublicRoute({
        market: "sk",
        pathnameSegments: ["recenzie", "produkt", "bad/token"],
      })
    ).toEqual({ type: "not-found" })
  })
})

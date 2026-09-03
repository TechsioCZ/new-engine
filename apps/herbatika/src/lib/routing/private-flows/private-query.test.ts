import type { GetServerSidePropsContext } from "next"
import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import {
  readExactPrivateQuery,
  resolvePrivateFlowPublicPage,
} from "./private-query"

describe("private-flow query handling", () => {
  it.each([
    ["token=Deactivate.Token", ["token"]],
    ["product_id=prod_CASE", ["product_id"]],
    [
      "next=%2Fucet&email=a%40example.com&flow=account-setup",
      ["next", "email", "flow"],
    ],
  ])("accepts exact declared query %s", (query, keys) => {
    expect(readExactPrivateQuery(`/private?${query}`, keys)).not.toBeNull()
  })

  it.each([
    "ot=Guest.Token",
    "token=one&unknown=two",
    "product_id=%E0%A4%A",
    "next=/account&&flow=reset-password",
  ])("rejects duplicate, unknown, or malformed private query %s", (query) => {
    expect(
      readExactPrivateQuery(`/private?${query}`, [
        "email",
        "flow",
        "next",
        "product_id",
        "token",
      ])
    ).toBeNull()
  })

  it("never puts a private query or opaque path into a canonicalization Location", async () => {
    const headers = new Map<string, string>()
    const context = {
      params: { market: "sk" },
      query: { publicOrderId: "order_CASE" },
      req: {
        headers: {
          "x-sf-canonical-origin": "https://herbatika.sk",
          "x-sf-canonicalization-required": "1",
          "x-sf-market": "sk",
          "x-sf-public-path": "/pokladna/potvrdenie-objednavky/order_CASE",
          "x-sf-route-key": "checkout.confirmation",
        },
        url: "/~sf/sk/checkout/confirmation/order_CASE",
      },
      res: {
        getHeader: (name: string) => headers.get(name),
        setHeader: (name: string, value: string) => {
          headers.set(name, value)
        },
      },
    } as unknown as GetServerSidePropsContext

    const result = await resolvePrivateFlowPublicPage(context, {
      expectedRouteKey: "checkout.confirmation",
      loadSource: async () => ({ kind: "missing" }),
      suppressCanonicalization: true,
    })

    expect(result).toEqual({ notFound: true })
    expect(headers.get("Location") ?? "").not.toContain("order_CASE")
  })
})

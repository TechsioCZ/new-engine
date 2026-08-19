import type { GetServerSidePropsContext } from "next"
import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { resolveAccountPrivatePage } from "./account-page.server"
import { resolveCheckoutUiPage } from "./transactional-page.server"

const createContext = (input: {
  publicPath: string
  routeKey: string
}): GetServerSidePropsContext => {
  const headers = new Map<string, string>()
  return {
    params: { market: "sk" },
    query: {},
    req: {
      headers: {
        "x-sf-canonical-origin": "https://herbatica.sk",
        "x-sf-market": "sk",
        "x-sf-public-path": input.publicPath,
        "x-sf-route-key": input.routeKey,
      },
      url: input.publicPath,
    },
    res: {
      getHeader: (name: string) => headers.get(name),
      setHeader: (name: string, value: number | string | readonly string[]) => {
        headers.set(name, String(value))
      },
    },
  } as unknown as GetServerSidePropsContext
}

describe("private Pages SSR decisions", () => {
  it("redirects an unauthenticated account request to localized login with a safe return", async () => {
    const context = createContext({
      publicPath: "/ucet/objednavky",
      routeKey: "account.orders",
    })

    await expect(
      resolveAccountPrivatePage(context, {
        expectedRouteKey: "account.orders",
        loadSource: async () => ({ kind: "found", value: null }),
      })
    ).resolves.toEqual({
      redirect: {
        destination: "/ucet/prihlasenie?next=%2Fucet%2Fobjednavky",
        statusCode: 307,
      },
    })
    expect(context.res.getHeader("Cache-Control")).toContain("no-store")
  })

  it("redirects checkout without a server-readable cart to localized cart", async () => {
    const context = createContext({
      publicPath: "/pokladna",
      routeKey: "checkout",
    })

    await expect(
      resolveCheckoutUiPage(context, { expectedRouteKey: "checkout" })
    ).resolves.toEqual({
      redirect: { destination: "/kosik", statusCode: 307 },
    })
    expect(context.res.getHeader("Cache-Control")).toContain("no-store")
  })

  it("fails closed before any private read when trusted proxy context is absent", async () => {
    const context = createContext({
      publicPath: "/ucet",
      routeKey: "wrong-route",
    })
    const loadSource = vi.fn()

    await expect(
      resolveAccountPrivatePage(context, {
        expectedRouteKey: "account",
        loadSource,
      })
    ).resolves.toEqual({ notFound: true })
    expect(loadSource).not.toHaveBeenCalled()
    expect(context.res.getHeader("X-Robots-Tag")).toBe("noindex, nofollow")
  })
})

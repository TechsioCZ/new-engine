import type { GetServerSidePropsContext } from "next"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  readCheckoutSession: vi.fn(),
  resolveFlowPublicPage: vi.fn(
    async (
      _context: GetServerSidePropsContext,
      input: { loadSource: (market: "sk") => Promise<unknown> }
    ) => ({ props: { page: await input.loadSource("sk") } })
  ),
}))

vi.mock("server-only", () => ({}))
vi.mock("./medusa-transactional-flow-reader", () => ({
  createMedusaTransactionalFlowReader: () => ({
    readCheckoutSession: mocks.readCheckoutSession,
  }),
}))
vi.mock("@/lib/routing/public-page", () => ({
  redirectResult: vi.fn(
    (
      _context: GetServerSidePropsContext,
      destination: string,
      statusCode: number
    ) => ({ redirect: { destination, statusCode } })
  ),
  resolveFlowPublicPage: mocks.resolveFlowPublicPage,
}))

import { resolveCheckoutUiPage } from "./transactional-page.server"

const createContext = (): GetServerSidePropsContext =>
  ({
    params: { market: "sk" },
    query: {},
    req: {
      headers: {
        cookie:
          "herbatika_cart_id=cart_authorized; __Host-herbatika-cart-session=session_authorized",
        "x-sf-canonical-origin": "https://herbatica.sk",
        "x-sf-market": "sk",
        "x-sf-public-path": "/pokladna/udaje",
        "x-sf-route-key": "checkout.contact",
      },
      url: "/pokladna/udaje",
    },
    res: {
      getHeader: vi.fn(),
      setHeader: vi.fn(),
    },
  }) as unknown as GetServerSidePropsContext

describe("checkout cart server authority", () => {
  beforeEach(() => {
    mocks.readCheckoutSession.mockReset()
    mocks.resolveFlowPublicPage.mockClear()
  })

  it("keeps the cart id returned by the authorized checkout projection", async () => {
    mocks.readCheckoutSession.mockResolvedValue({
      kind: "found",
      value: {
        cartId: "cart_authorized",
        defaultStep: "contact",
        reachableSteps: ["contact"],
      },
    })

    await expect(
      resolveCheckoutUiPage(createContext(), {
        expectedRouteKey: "checkout.contact",
        requestedStep: "contact",
      })
    ).resolves.toEqual({
      props: {
        page: {
          kind: "found",
          value: {
            authorizedCartId: "cart_authorized",
            step: "contact",
          },
        },
      },
    })
    expect(mocks.readCheckoutSession).toHaveBeenCalledWith(
      "sk",
      "cart_authorized",
      "session_authorized"
    )
  })
})

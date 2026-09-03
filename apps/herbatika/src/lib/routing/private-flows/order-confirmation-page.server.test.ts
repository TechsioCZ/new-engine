import type { GetServerSidePropsContext } from "next"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ORDER_CONFIRMATION_TOKEN_COOKIE_NAME } from "@/lib/routing/private-flows/request-cookies"

const mocks = vi.hoisted(() => ({
  notFoundResult: vi.fn(() => ({ notFound: true })),
  readOrderConfirmation: vi.fn(),
  resolvePrivateFlowPublicPage: vi.fn(
    async (
      _context: GetServerSidePropsContext,
      input: { loadSource: (market: "cz") => Promise<unknown> }
    ) => ({ props: { page: await input.loadSource("cz") } })
  ),
}))

vi.mock(
  "@/lib/routing/private-flows/private-query",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("@/lib/routing/private-flows/private-query")
    >()),
    resolvePrivateFlowPublicPage: mocks.resolvePrivateFlowPublicPage,
  })
)

vi.mock("@/lib/routing/private-flows/transactional-page.server", () => ({
  transactionalFlowReader: {
    readOrderConfirmation: mocks.readOrderConfirmation,
  },
}))

vi.mock("@/lib/routing/public-page", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/routing/public-page")>()),
  notFoundResult: mocks.notFoundResult,
}))

import { getServerSideProps } from "@/pages/~sf/[market]/checkout/confirmation/[publicOrderId]"

const context = (url: string, cookie?: string): GetServerSidePropsContext =>
  ({
    params: { market: "cz", publicOrderId: "order_Case" },
    query: {},
    req: { headers: cookie ? { cookie } : {}, url },
    res: { setHeader: vi.fn() },
  }) as unknown as GetServerSidePropsContext

describe("order confirmation server authority", () => {
  beforeEach(() => {
    mocks.notFoundResult.mockClear()
    mocks.readOrderConfirmation.mockReset()
    mocks.resolvePrivateFlowPublicPage.mockClear()
  })

  it("reads guest authority from the HttpOnly handoff cookie", async () => {
    mocks.readOrderConfirmation.mockResolvedValue({ kind: "found", value: {} })

    await getServerSideProps(
      context(
        "/~sf/cz/checkout/confirmation/order_Case",
        `${ORDER_CONFIRMATION_TOKEN_COOKIE_NAME}=Guest.Cookie.Token`
      )
    )

    expect(mocks.readOrderConfirmation).toHaveBeenCalledWith("cz", {
      orderId: "order_Case",
      orderToken: "Guest.Cookie.Token",
    })
  })

  it("prefers the registered customer session over a stale guest cookie", async () => {
    mocks.readOrderConfirmation.mockResolvedValue({ kind: "found", value: {} })

    await getServerSideProps(
      context(
        "/~sf/cz/checkout/confirmation/order_Case",
        `herbatika_auth_session_token=Customer.JWT; ${ORDER_CONFIRMATION_TOKEN_COOKIE_NAME}=Stale.Guest.Token`
      )
    )

    expect(mocks.readOrderConfirmation).toHaveBeenCalledWith("cz", {
      customerToken: "Customer.JWT",
      orderId: "order_Case",
    })
  })

  it("rejects the legacy URL bearer before resolving the order", async () => {
    await expect(
      getServerSideProps(
        context("/~sf/cz/checkout/confirmation/order_Case?ot=Leaked.Token")
      )
    ).resolves.toEqual({ notFound: true })

    expect(mocks.readOrderConfirmation).not.toHaveBeenCalled()
    expect(mocks.resolvePrivateFlowPublicPage).not.toHaveBeenCalled()
  })
})

import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  isAuthenticated: false,
  useQuery: vi.fn(),
}))

vi.mock("@tanstack/react-query", () => ({
  useQuery: mocks.useQuery,
}))
vi.mock("@techsio/ui-kit/atoms/link-button", () => ({
  LinkButton: ({ children }: { children: React.ReactNode }) => (
    <a href="/">{children}</a>
  ),
}))
vi.mock("@techsio/ui-kit/atoms/status-text", () => ({
  StatusText: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
}))
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))
vi.mock("@/components/storefront-link", () => ({
  StorefrontLink: ({ children }: { children: React.ReactNode }) => (
    <a href="/">{children}</a>
  ),
}))
vi.mock("@/components/text/supporting-text", () => ({
  SupportingText: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
}))
vi.mock("@/lib/storefront/auth", () => ({
  useAuth: () => ({ isAuthenticated: mocks.isAuthenticated }),
}))
vi.mock("@/lib/storefront/market-context-provider", () => ({
  useMarketContext: () => ({ code: "cz", locale: "cs-CZ" }),
}))
vi.mock("@/lib/url/public-url", () => ({
  buildPath: () => "/",
}))

import { CheckoutCompletedOrderSection } from "./checkout-completed-order-section"

describe("CheckoutCompletedOrderSection QR ownership", () => {
  beforeEach(() => {
    mocks.isAuthenticated = false
    mocks.useQuery.mockReset()
    mocks.useQuery.mockReturnValue({
      data: undefined,
      isError: false,
      isFetching: false,
    })
  })

  it("keeps QR lookup disabled for a guest without signed order access", () => {
    renderToStaticMarkup(
      <CheckoutCompletedOrderSection completedOrderId="order_Case" />
    )

    expect(mocks.useQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false })
    )
  })

  it("enables QR lookup for exact signed guest order access", () => {
    renderToStaticMarkup(
      <CheckoutCompletedOrderSection
        completedOrderId="order_Case"
        orderToken="Guest.Token-Exact"
      />
    )

    expect(mocks.useQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true })
    )
  })

  it("enables QR lookup for an authenticated customer cookie session", () => {
    mocks.isAuthenticated = true

    renderToStaticMarkup(
      <CheckoutCompletedOrderSection completedOrderId="order_Case" />
    )

    expect(mocks.useQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true })
    )
  })
})

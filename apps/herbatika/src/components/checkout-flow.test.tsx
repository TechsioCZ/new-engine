import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  useCheckoutController: vi.fn(),
}))

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))
vi.mock("@/components/checkout/use-checkout-controller", () => ({
  useCheckoutController: mocks.useCheckoutController,
}))
vi.mock("@/lib/storefront/market-context-provider", () => ({
  useMarketContext: () => ({ code: "ro" }),
}))
vi.mock("@/components/checkout/checkout-step-content", () => ({
  CheckoutStepContent: () => <div data-testid="step-content" />,
}))
vi.mock(
  "@/components/checkout/sections/checkout-completed-order-section",
  () => ({
    CheckoutCompletedOrderSection: () => <div data-testid="completed-order" />,
  })
)
vi.mock("@/components/checkout/sections/checkout-empty-cart-section", () => ({
  CheckoutEmptyCartSection: () => <div data-testid="empty-cart" />,
}))
vi.mock("@/components/checkout/sections/checkout-feedback-section", () => ({
  CheckoutFeedbackSection: () => null,
}))
vi.mock("@/components/checkout/sections/checkout-steps-section", () => ({
  CheckoutStepsSection: () => null,
}))

import { CheckoutFlow } from "./checkout-flow"

const controller = (cartQuery: {
  cart: null | undefined
  isFetching: boolean
  isLoading: boolean
}) => ({
  cartQuery: { ...cartQuery, error: null },
  checkoutError: null,
  completedOrderId: null,
  hasItems: false,
  hasPayment: false,
  hasShipping: false,
  hasStoredAddress: false,
})

describe("CheckoutFlow cart authority", () => {
  beforeEach(() => {
    mocks.useCheckoutController.mockReset()
  })

  it("threads the authorized cart and hides the false empty state while it loads", () => {
    mocks.useCheckoutController.mockReturnValue(
      controller({ cart: undefined, isFetching: false, isLoading: true })
    )

    const html = renderToStaticMarkup(
      <CheckoutFlow activeStep="udaje" authorizedCartId="cart_authorized" />
    )

    expect(mocks.useCheckoutController).toHaveBeenCalledWith({
      authorizedCartId: "cart_authorized",
    })
    expect(html).not.toContain("empty-cart")
  })

  it("shows the empty state only after the cart read resolves", () => {
    mocks.useCheckoutController.mockReturnValue(
      controller({ cart: null, isFetching: false, isLoading: false })
    )

    const html = renderToStaticMarkup(<CheckoutFlow activeStep="kosik" />)

    expect(mocks.useCheckoutController).toHaveBeenCalledWith({
      authorizedCartId: undefined,
    })
    expect(html).toContain("empty-cart")
  })
})

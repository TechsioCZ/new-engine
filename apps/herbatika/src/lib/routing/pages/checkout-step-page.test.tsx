import { NextIntlClientProvider } from "next-intl"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/components/checkout-flow", () => ({
  CheckoutFlow: (props: { activeStep: string; authorizedCartId?: string }) => (
    <output>{JSON.stringify(props)}</output>
  ),
}))
vi.mock("@/lib/routing/private-flows/transactional-page.server", () => ({
  resolveCheckoutUiPage: vi.fn(),
}))
vi.mock("@/lib/routing/public-page", () => ({
  notFoundResult: vi.fn(),
}))

import CheckoutStepPage from "@/pages/~sf/[market]/checkout/[step]"

const renderCheckoutStepPage = (
  props: Parameters<typeof CheckoutStepPage>[0]
) =>
  renderToStaticMarkup(
    <NextIntlClientProvider
      locale="ro-RO"
      messages={{
        checkout: {
          page_unavailable:
            "Finalizarea comenzii nu este disponibilă momentan.",
        },
      }}
    >
      <CheckoutStepPage {...props} />
    </NextIntlClientProvider>
  )

describe("CheckoutStepPage", () => {
  it("passes the server-authorized cart to the checkout flow", () => {
    const html = renderCheckoutStepPage({
      page: {
        kind: "found",
        value: {
          authorizedCartId: "cart_authorized",
          step: "contact",
        },
      },
    } as Parameters<typeof CheckoutStepPage>[0])

    expect(html).toContain(
      "{&quot;activeStep&quot;:&quot;udaje&quot;,&quot;authorizedCartId&quot;:&quot;cart_authorized&quot;}"
    )
  })

  it("renders the checkout error shell from the active locale", () => {
    const html = renderCheckoutStepPage({
      page: {
        kind: "error",
        status: 503,
      },
    } as Parameters<typeof CheckoutStepPage>[0])

    expect(html).toContain("Finalizarea comenzii nu este disponibilă momentan.")
    expect(html).not.toContain("Checkout unavailable")
  })
})

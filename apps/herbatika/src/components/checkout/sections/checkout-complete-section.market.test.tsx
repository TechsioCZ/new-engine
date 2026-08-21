import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

const testContext = vi.hoisted(() => ({
  market: { code: "sk", locale: "sk-SK" },
}))

vi.mock("@techsio/ui-kit/atoms/button", () => ({
  Button: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
}))
vi.mock("@techsio/ui-kit/atoms/icon", () => ({
  Icon: () => <span aria-hidden="true" />,
}))
vi.mock("@techsio/ui-kit/atoms/link-button", () => ({
  LinkButton: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}))
vi.mock("@techsio/ui-kit/molecules/form-checkbox", () => ({
  FormCheckbox: ({ label }: { label: string }) => <span>{label}</span>,
}))
vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => {
    const translate = (key: string) => `${namespace}.${key}`
    translate.rich = (key: string) => `${namespace}.${key}`
    return translate
  },
}))
vi.mock("@/components/checkout/checkout-display.utils", () => ({
  resolveCountryLabel: (countryCode: string) => countryCode,
  resolvePaymentIcon: () => "token-icon-wallet",
  resolveShippingIcon: () => "token-icon-truck",
}))
vi.mock("@/components/storefront-link", () => ({
  StorefrontLink: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}))
vi.mock("@/components/text/supporting-text", () => ({
  SupportingText: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}))
vi.mock("@/lib/storefront/market-context-provider", () => ({
  useMarketContext: () => testContext.market,
}))
vi.mock("@/lib/storefront/price-format", () => ({
  formatCurrencyAmount: (amount: number, currency: string) =>
    `${amount} ${currency}`,
}))
vi.mock("@/lib/url/public-url", () => ({
  buildPath: () => "/",
}))

import { CheckoutCompleteSection } from "./checkout-complete-section"

const shippingAddressForm = {
  email: "demo@example.com",
  firstName: "Demo",
  lastName: "Customer",
  phone: "+421000000000",
  company: "",
  companyId: "",
  taxId: "",
  vatId: "",
  address1: "Demo 1",
  address2: "",
  city: "Bratislava",
  postalCode: "81101",
  countryCode: "sk",
  customerNote: "",
}

const renderSection = () =>
  renderToStaticMarkup(
    <CheckoutCompleteSection
      canCompleteOrder
      cartTaxAmount={20}
      cartTotalAmount={120}
      cartTotalWithoutTaxAmount={100}
      currencyCode="EUR"
      detailsStepHref="/details"
      hasPayment
      hasShipping
      hasStoredAddress
      heurekaConsent={false}
      isCompletingOrder={false}
      marketingConsent={false}
      onCompleteOrder={vi.fn().mockResolvedValue(undefined)}
      onHeurekaConsentChange={vi.fn()}
      onMarketingConsentChange={vi.fn()}
      shippingAddressForm={shippingAddressForm}
      shippingStepHref="/shipping"
    />
  )

describe("CheckoutCompleteSection external review consent", () => {
  it.each([
    ["sk", "sk-SK", true],
    ["cz", "cs-CZ", false],
    ["hu", "hu-HU", false],
    ["ro", "ro-RO", false],
  ] as const)("renders approved optional purposes for %s", (code, locale, supportsHeureka) => {
    testContext.market = { code, locale }

    const markup = renderSection()

    expect(markup).toContain("checkout.review_marketing_consent")
    expect(markup.includes("checkout.review_heureka_consent")).toBe(
      supportsHeureka
    )
  })
})

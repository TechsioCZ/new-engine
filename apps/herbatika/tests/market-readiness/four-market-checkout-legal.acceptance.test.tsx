import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { CheckoutCompleteSection } from "@/components/checkout/sections/checkout-complete-section"
import { FOUR_MARKET_CHECKOUT_FIXTURES } from "./four-market-checkout-fixture"

const testContext = vi.hoisted(() => ({
  market: { code: "sk", locale: "sk-SK" },
}))

vi.mock("@techsio/ui-kit/atoms/button", () => ({
  Button: ({
    children,
    disabled,
  }: {
    children: React.ReactNode
    disabled?: boolean
  }) => (
    <button data-disabled={String(Boolean(disabled))} type="button">
      {children}
    </button>
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
  FormCheckbox: ({
    checked,
    label,
    required,
  }: {
    checked?: boolean
    label: React.ReactNode
    required?: boolean
  }) => (
    <span
      data-checked={String(Boolean(checked))}
      data-required={String(Boolean(required))}
    >
      {label}
    </span>
  ),
}))
vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => {
    const translate = (key: string) => `${namespace}.${key}`
    translate.rich = (
      key: string,
      values: Record<string, (chunks: React.ReactNode) => React.ReactNode>
    ) => (
      <>
        {`${namespace}.${key}`} {values.terms("terms")}{" "}
        {values.privacy("privacy")}
      </>
    )
    return translate
  },
}))
vi.mock("@/components/checkout/checkout-display.utils", () => ({
  resolveCountryLabel: (countryCode: string) => countryCode,
  resolvePaymentIcon: () => "token-icon-wallet",
  resolveShippingIcon: () => "token-icon-truck",
}))
vi.mock("@/components/storefront-link", () => ({
  StorefrontLink: ({
    children,
    href,
  }: {
    children: React.ReactNode
    href: string
  }) => <a href={href}>{children}</a>,
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

const shippingAddressForm = {
  address1: "Demo 1",
  address2: "",
  city: "Demo",
  company: "",
  companyId: "",
  countryCode: "sk",
  customerNote: "",
  email: "demo@example.test",
  firstName: "Demo",
  lastName: "Customer",
  phone: "+421000000000",
  postalCode: "81101",
  taxId: "",
  vatId: "",
}

const renderSection = (canCompleteOrder: boolean, currencyCode: string) =>
  renderToStaticMarkup(
    <CheckoutCompleteSection
      canCompleteOrder={canCompleteOrder}
      cartTaxAmount={20}
      cartTotalAmount={120}
      cartTotalWithoutTaxAmount={100}
      currencyCode={currencyCode}
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
      onPurchaseAcceptanceChange={vi.fn()}
      purchaseAcceptanceGranted={canCompleteOrder}
      shippingAddressForm={shippingAddressForm}
      shippingStepHref="/shipping"
    />
  )

describe("four-market checkout mandatory legal acceptance", () => {
  it.each(
    FOUR_MARKET_CHECKOUT_FIXTURES
  )("$market keeps completion gated and links its exact terms and privacy paths", (fixture) => {
    testContext.market = { code: fixture.market, locale: fixture.locale }

    const blockedMarkup = renderSection(false, fixture.currencyCode)
    expect(blockedMarkup).toContain("checkout.review_legal_confirmation")
    expect(blockedMarkup).toContain(`href="${fixture.termsPath}"`)
    expect(blockedMarkup).toContain(`href="${fixture.privacyPath}"`)
    expect(blockedMarkup).toContain('data-disabled="true"')
    expect(blockedMarkup).toContain('data-checked="false"')
    expect(blockedMarkup).toContain('data-required="true"')

    const allowedMarkup = renderSection(true, fixture.currencyCode)
    expect(allowedMarkup).toContain('data-disabled="false"')
    expect(allowedMarkup).toContain('data-checked="true"')
  })
})

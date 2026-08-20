import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { NextIntlClientProvider } from "next-intl"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("@techsio/ui-kit/atoms/icon", () => ({
  Icon: () => <span aria-hidden="true" />,
}))
vi.mock("@techsio/ui-kit/atoms/link", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))
vi.mock("@techsio/ui-kit/atoms/link-button", () => ({
  LinkButton: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}))
vi.mock("@/components/herbatika-logo", () => ({
  HerbatikaLogo: () => <span>Herbatika</span>,
}))
vi.mock("@/components/storefront-link", () => ({
  StorefrontLink: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}))
vi.mock("@/lib/storefront/auth", () => ({
  useAuth: () => ({ isAuthenticated: true }),
}))
vi.mock("@/lib/storefront/market-context-provider", () => ({
  useMarketContext: () => ({ code: "sk" }),
}))
vi.mock("@/lib/url/public-url", () => ({
  buildPath: () => "/",
}))

import { CheckoutHeader } from "./checkout/checkout-header"

const checkoutHeaderSource = readFileSync(
  resolve(process.cwd(), "src/components/checkout/checkout-header.tsx"),
  "utf8"
)
const productMediaColumnSource = readFileSync(
  resolve(
    process.cwd(),
    "src/components/product-detail/sections/product-detail-media-column.tsx"
  ),
  "utf8"
)

const messagesForLocale = (locale: "ro-RO" | "sk-SK") =>
  JSON.parse(
    readFileSync(
      resolve(
        process.cwd(),
        `../medusa-be/src/modules/storefront-text/messages/${locale}.json`
      ),
      "utf8"
    )
  )

const renderCheckoutHeader = (locale: "ro-RO" | "sk-SK") =>
  renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={messagesForLocale(locale)}
    >
      <CheckoutHeader />
    </NextIntlClientProvider>
  )

describe("localized contact phone", () => {
  it.each([
    ["sk-SK", "tel:+421232112345", "+421 2/321 123 45"],
    ["ro-RO", "tel:+40(31)2295431", "+40 (31) 2295431"],
  ] as const)("renders the %s storefront-text contact in checkout", (locale, phoneHref, phoneDisplay) => {
    const html = renderCheckoutHeader(locale)

    expect(html).toContain(`href="${phoneHref}"`)
    expect(html).toContain(phoneDisplay)
  })

  it.each([
    ["checkout header", checkoutHeaderSource],
    ["product media column", productMediaColumnSource],
  ])("keeps the %s contact wired to navigation storefront text", (_, source) => {
    expect(source).toContain('useTranslations("navigation")')
    expect(source).toContain('tNavigation("contact.phone_href")')
    expect(source).toContain('tNavigation("contact.phone_display")')
    expect(source).not.toContain("tel:+421")
    expect(source).not.toContain("+421 2/321")
  })
})

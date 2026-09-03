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

type TestLocale = "cs-CZ" | "hu-HU" | "ro-RO" | "sk-SK"

const messagesForLocale = (locale: TestLocale) =>
  JSON.parse(
    readFileSync(
      resolve(
        process.cwd(),
        `../medusa-be/src/modules/storefront-text/messages/${locale}.json`
      ),
      "utf8"
    )
  )

const unavailableByLocale = {
  "cs-CZ": "Kontaktní údaje nejsou momentálně dostupné.",
  "hu-HU": "Az elérhetőségek jelenleg nem állnak rendelkezésre.",
  "ro-RO": "Datele de contact nu sunt disponibile momentan.",
} as const

const authorizedMessagesForLocale = (locale: TestLocale) => {
  const messages = messagesForLocale(locale)
  if (locale === "sk-SK") {
    messages.navigation.contact.authority_status = "available"
    messages.navigation.contact.authority_source = "sk-existing"
    messages.navigation.contact.social_links = "[]"
    messages.navigation.contact.unavailable =
      "Kontaktné údaje momentálne nie sú dostupné."
    return messages
  }

  messages.navigation.contact = {
    authority_status: "unavailable",
    authority_source: "unavailable",
    email_display: "",
    email_href: "",
    hours: "",
    phone_display: "",
    phone_href: "",
    social_links: "[]",
    unavailable: unavailableByLocale[locale],
  }
  return messages
}

const renderCheckoutHeader = (locale: TestLocale) =>
  renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={authorizedMessagesForLocale(locale)}
    >
      <CheckoutHeader />
    </NextIntlClientProvider>
  )

describe("localized contact phone", () => {
  it("keeps the validated Slovak contact actionable", () => {
    const html = renderCheckoutHeader("sk-SK")

    expect(html).toContain('href="tel:+421232112345"')
    expect(html).toContain("+421 2/321 123 45")
  })

  it.each([
    ["cs-CZ", unavailableByLocale["cs-CZ"]],
    ["hu-HU", unavailableByLocale["hu-HU"]],
    ["ro-RO", unavailableByLocale["ro-RO"]],
  ] as const)("hides all contact actions for %s without reviewed authority", (locale, unavailable) => {
    const html = renderCheckoutHeader(locale)

    expect(html).toContain(unavailable)
    expect(html).not.toContain('href="tel:')
    expect(html).not.toContain("+421 2/321 123 45")
    expect(html).not.toContain("+40 (31) 2295431")
  })

  it.each([
    ["checkout header", checkoutHeaderSource],
    ["product media column", productMediaColumnSource],
  ])("keeps the %s contact wired to the authority hook", (_, source) => {
    expect(source).toContain("useOperatorContact()")
    expect(source).toContain("operatorContact.phoneHref")
    expect(source).toContain("operatorContact.phoneDisplay")
    expect(source).toContain("operatorContact.unavailable")
    expect(source).not.toContain("tel:+421")
    expect(source).not.toContain("+421 2/321")
  })
})

import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))
vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => (
    <span data-image-alt={alt}>{alt}</span>
  ),
}))
vi.mock("@/components/herbatika-breadcrumb", () => ({
  HerbatikaBreadcrumb: () => null,
}))
vi.mock("@/components/reviews/review-trust-badges", () => ({
  ReviewTrustBadges: () => null,
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
vi.mock("@/lib/storefront/market-context-provider", () => ({
  useMarketContext: () => ({ code: "ro", locale: "ro-RO" }),
}))

import { AboutPage } from "./about-page"

describe("AboutPage locale selection", () => {
  it("renders the complete Romanian page and official Romanian contact", () => {
    const markup = renderToStaticMarkup(
      <AboutPage locale="ro-RO" reviewTrustSources={[]} />
    )

    expect(markup).toContain("Despre echipa noastră")
    expect(markup).toContain("Începuturile brandului Herbatica")
    expect(markup).toContain("Momente importante din istoria noastră")
    expect(markup).toContain("Operatorul magazinului online")
    expect(markup).toContain("salut@herbatica.ro")
    expect(markup).toContain("+40 (31) 2295431")
    expect(markup).not.toContain("O našom tíme")
    expect(markup).not.toContain("Prevádzkovateľ internetového obchodu")
  })

  it("preserves the Slovak page for the Slovak locale", () => {
    const markup = renderToStaticMarkup(
      <AboutPage locale="sk-SK" reviewTrustSources={[]} />
    )

    expect(markup).toContain("O našom tíme")
    expect(markup).toContain("Kľúčové míľniky našej histórie")
    expect(markup).toContain("Prevádzkovateľ internetového obchodu")
    expect(markup).not.toContain("Despre echipa noastră")
  })

  it.each([
    ["cs-CZ", "O našem týmu", "Kontakt pro český trh"],
    ["hu-HU", "Csapatunkról", "Kapcsolat a magyar piachoz"],
  ] as const)("renders approved %s page copy", (locale, title, contactTitle) => {
    const markup = renderToStaticMarkup(
      <AboutPage locale={locale} reviewTrustSources={[]} />
    )

    expect(markup).toContain(title)
    expect(markup).toContain(contactTitle)
    expect(markup).not.toContain("salut@herbatica.ro")
    expect(markup).not.toContain("Prevádzkovateľ internetového obchodu")
  })

  it("renders no content for an unsupported locale", () => {
    expect(
      renderToStaticMarkup(
        <AboutPage locale={"en-GB" as never} reviewTrustSources={[]} />
      )
    ).toBe("")
  })
})

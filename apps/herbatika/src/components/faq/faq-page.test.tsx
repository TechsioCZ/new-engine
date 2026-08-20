import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

const testContext = vi.hoisted(() => ({
  market: {
    code: "ro",
    locale: "ro-RO",
  },
}))

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: { count?: number }) =>
    values?.count == null ? key : `${key}:${values.count}`,
}))
vi.mock("@/components/herbatika-breadcrumb", () => ({
  HerbatikaBreadcrumb: () => null,
}))
vi.mock("@/lib/storefront/market-context-provider", () => ({
  useMarketContext: () => testContext.market,
}))
vi.mock("./faq-accordion", () => ({
  FaqAccordion: ({ items }: { items: { question: string }[] }) => (
    <output>{items.map(({ question }) => question).join("|")}</output>
  ),
}))

import { FaqPage } from "./faq-page"

describe("FaqPage locale selection", () => {
  it("renders Romanian page copy and Romanian FAQ items for the RO market", () => {
    const markup = renderToStaticMarkup(<FaqPage />)

    expect(markup).toContain("Întrebări frecvente")
    expect(markup).toContain("În ce stadiu se află comanda dumneavoastră?")
    expect(markup).toContain("faq.item_count:10")
    expect(markup).not.toContain("Často kladené otázky")
  })

  it("renders the original Slovak page only for the SK market", () => {
    testContext.market = { code: "sk", locale: "sk-SK" }

    const markup = renderToStaticMarkup(<FaqPage />)

    expect(markup).toContain("Často kladené otázky")
    expect(markup).toContain("V akom stave je Vaša objednávka?")
    expect(markup).not.toContain("Întrebări frecvente")
  })

  it("renders no FAQ content for an unsupported locale", () => {
    testContext.market = { code: "cz", locale: "cs-CZ" }

    expect(renderToStaticMarkup(<FaqPage />)).toBe("")
  })
})

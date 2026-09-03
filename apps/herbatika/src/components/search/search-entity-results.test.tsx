import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { NextIntlClientProvider } from "next-intl"
import type { ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import type { SearchAutocompleteSuggestion } from "@/lib/search-autocomplete/search-autocomplete-types"

vi.mock("@techsio/ui-kit/atoms/link", () => ({
  Link: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

vi.mock("@/components/search/search-autocomplete-media", () => ({
  SearchAutocompleteMedia: () => null,
}))

import { SearchEntityResults } from "./search-entity-results"

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

const suggestion = (
  id: string,
  type: SearchAutocompleteSuggestion["type"]
): SearchAutocompleteSuggestion => ({
  href: `/rezultat/${id}`,
  id,
  title: id,
  type,
})

const componentSource = readFileSync(
  resolve(process.cwd(), "src/components/search/search-entity-results.tsx"),
  "utf8"
)
const LOCALIZED_ENTITY_LABELS =
  /Súvisiace výsledky|Související výsledky|Kapcsolódó találatok|Rezultate asociate/

const SEARCH_CASES = [
  {
    foreignCanaries: [
      "Související výsledky",
      "Kapcsolódó találatok",
      "Rezultate asociate",
    ],
    locale: "sk-SK",
    related: "Súvisiace výsledky",
    sections: {
      brands: "Značky",
      categories: "Kategórie",
      content: "Obsah",
      products: "Produkty",
    },
  },
  {
    foreignCanaries: [
      "Súvisiace výsledky",
      "Kapcsolódó találatok",
      "Rezultate asociate",
    ],
    locale: "cs-CZ",
    related: "Související výsledky",
    sections: {
      brands: "Značky",
      categories: "Kategorie",
      content: "Obsah",
      products: "Produkty",
    },
  },
  {
    foreignCanaries: [
      "Súvisiace výsledky",
      "Související výsledky",
      "Rezultate asociate",
    ],
    locale: "hu-HU",
    related: "Kapcsolódó találatok",
    sections: {
      brands: "Márkák",
      categories: "Kategóriák",
      content: "Tartalom",
      products: "Termékek",
    },
  },
  {
    foreignCanaries: [
      "Súvisiace výsledky",
      "Související výsledky",
      "Kapcsolódó találatok",
    ],
    locale: "ro-RO",
    related: "Rezultate asociate",
    sections: {
      brands: "Mărci",
      categories: "Categorii",
      content: "Conținut",
      products: "Produse",
    },
  },
] as const

describe("search entity result localization", () => {
  it.each(
    SEARCH_CASES
  )("renders every $locale public entity label without cross-market copy", ({
    foreignCanaries,
    locale,
    related,
    sections,
  }) => {
    const html = renderToStaticMarkup(
      <NextIntlClientProvider
        locale={locale}
        messages={messagesForLocale(locale)}
      >
        <SearchEntityResults
          brands={[suggestion("brand", "brand")]}
          categories={[suggestion("category", "category")]}
          content={[suggestion("article", "content")]}
        />
      </NextIntlClientProvider>
    )

    expect(html).toContain(related)
    expect(html).toContain(sections.categories)
    expect(html).toContain(sections.brands)
    expect(html).toContain(sections.content)
    for (const foreignCanary of foreignCanaries) {
      expect(html).not.toContain(foreignCanary)
    }
  })

  it("keeps the reachable component source free of hardcoded market labels", () => {
    expect(componentSource).toContain('useTranslations("search")')
    expect(componentSource).not.toMatch(LOCALIZED_ENTITY_LABELS)
  })

  it.each(
    SEARCH_CASES
  )("publishes the exact $locale search catalog without foreign canaries", ({
    foreignCanaries,
    locale,
    related,
    sections,
  }) => {
    const search = messagesForLocale(locale).search

    expect(search.results.related).toBe(related)
    expect(search.autocomplete.sections).toEqual(sections)
    for (const foreignCanary of foreignCanaries) {
      expect(JSON.stringify(search)).not.toContain(foreignCanary)
    }
  })
})

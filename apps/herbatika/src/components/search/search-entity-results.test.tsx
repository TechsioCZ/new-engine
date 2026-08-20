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
const SLOVAK_ENTITY_LABELS = /Súvisiace výsledky|Kategórie|Výrobcovia|Obsah/

describe("search entity result localization", () => {
  it("renders every public entity label in Romanian", () => {
    const html = renderToStaticMarkup(
      <NextIntlClientProvider
        locale="ro-RO"
        messages={messagesForLocale("ro-RO")}
      >
        <SearchEntityResults
          brands={[suggestion("brand", "brand")]}
          categories={[suggestion("category", "category")]}
          content={[suggestion("article", "content")]}
        />
      </NextIntlClientProvider>
    )

    expect(html).toContain("Rezultate asociate")
    expect(html).toContain("Categorii")
    expect(html).toContain("Mărci")
    expect(html).toContain("Conținut")
    expect(html).not.toMatch(SLOVAK_ENTITY_LABELS)
  })

  it("keeps the reachable component source free of hardcoded Slovak labels", () => {
    expect(componentSource).toContain('useTranslations("search")')
    expect(componentSource).not.toMatch(SLOVAK_ENTITY_LABELS)
  })

  it("publishes Romanian entity labels distinct from Slovak", () => {
    const romanian = messagesForLocale("ro-RO").search
    const slovak = messagesForLocale("sk-SK").search

    expect(romanian.results.related).toBe("Rezultate asociate")
    expect(romanian.autocomplete.sections).toEqual({
      brands: "Mărci",
      categories: "Categorii",
      content: "Conținut",
      products: "Produse",
    })
    expect(romanian.results.related).not.toBe(slovak.results.related)
    expect(romanian.autocomplete.sections).not.toEqual(
      slovak.autocomplete.sections
    )
  })
})

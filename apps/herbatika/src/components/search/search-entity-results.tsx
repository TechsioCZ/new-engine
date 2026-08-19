"use client"

import { Link } from "@techsio/ui-kit/atoms/link"
import { StorefrontLink } from "@/components/storefront-link"
import type {
  SearchAutocompleteResponse,
  SearchAutocompleteSuggestion,
} from "@/lib/search-autocomplete/search-autocomplete-types"
import { SearchAutocompleteMedia } from "./search-autocomplete-media"

type SearchEntityResultSectionProps = {
  items: SearchAutocompleteSuggestion[]
  title: string
}

type SearchEntityResultsProps = Pick<
  SearchAutocompleteResponse,
  "brands" | "categories" | "content"
>

function SearchEntityResultSection({
  items,
  title,
}: SearchEntityResultSectionProps) {
  if (items.length === 0) {
    return null
  }

  return (
    <section className="space-y-200">
      <h3 className="font-semibold text-fg-primary text-lg">{title}</h3>

      <ul className="grid gap-300 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <li key={`${item.type}-${item.id}`}>
            <Link
              as={StorefrontLink}
              className="group flex h-full min-w-0 items-center gap-300 rounded-lg border border-border-secondary bg-surface px-400 py-250 text-fg-primary shadow-sm transition-colors hover:border-primary/30 hover:bg-fill-secondary"
              href={item.href}
            >
              <SearchAutocompleteMedia item={item} />

              <span className="min-w-0">
                <span className="block truncate font-semibold text-sm">
                  {item.title}
                </span>

                {item.subtitle ? (
                  <span className="block truncate text-fg-secondary text-xs">
                    {item.subtitle}
                  </span>
                ) : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function SearchEntityResults({
  brands,
  categories,
  content,
}: SearchEntityResultsProps) {
  if (brands.length + categories.length + content.length === 0) {
    return null
  }

  return (
    <section
      aria-labelledby="search-related-results-heading"
      className="space-y-400 rounded-lg border border-border-secondary bg-base p-400"
    >
      <h2
        className="font-bold text-2xl text-fg-primary"
        id="search-related-results-heading"
      >
        Súvisiace výsledky
      </h2>

      <SearchEntityResultSection items={categories} title="Kategórie" />

      <SearchEntityResultSection items={brands} title="Výrobcovia" />

      <SearchEntityResultSection items={content} title="Obsah" />
    </section>
  )
}

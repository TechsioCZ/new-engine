"use client"

import type { ComboboxApi } from "@techsio/ui-kit/molecules/combobox"
import { useTranslations } from "next-intl"

import type {
  SearchAutocompleteStatus,
  SearchAutocompleteSuggestion,
} from "@/lib/search-autocomplete/search-autocomplete-types"

import { SearchAutocompleteRow } from "./search-autocomplete-row"
import type { SearchAutocompletePanelSection } from "./search-autocomplete-sections"

interface SearchAutocompletePanelProps {
  api: ComboboxApi<SearchAutocompleteSuggestion>
  degraded: boolean
  query: string
  sections: SearchAutocompletePanelSection[]
  status: SearchAutocompleteStatus
}

const PANEL_CLASS_NAME =
  "absolute left-0 right-0 top-full z-50 mt-100 max-h-screen overflow-y-auto rounded-xs border border-border-secondary bg-surface py-200 shadow-md"

export const SearchAutocompletePanel = ({
  api,
  degraded,
  query,
  sections,
  status,
}: SearchAutocompletePanelProps) => {
  const t = useTranslations("search")
  const hasItems = sections.some((section) => section.items.length > 0)
  let statusMessage = t("autocomplete.empty", { query })

  if (status === "loading") {
    statusMessage = t("autocomplete.loading")
  } else if (status === "error") {
    statusMessage = t("autocomplete.load_failed")
  } else if (degraded) {
    statusMessage = t("autocomplete.degraded")
  }

  if (!hasItems) {
    return (
      <div {...api.getContentProps()} className={PANEL_CLASS_NAME}>
        <output
          className={`block px-300 py-250 text-sm ${status === "error" ? "text-danger" : "text-fg-secondary"}`}
        >
          {statusMessage}
        </output>
      </div>
    )
  }

  return (
    <div {...api.getContentProps()} className={PANEL_CLASS_NAME}>
      {degraded ? (
        <output className="block px-300 py-200 text-fg-secondary text-xs">
          {t("autocomplete.degraded")}
        </output>
      ) : null}
      <div
        {...api.getListProps()}
        aria-busy={status === "loading" ? true : undefined}
      >
        {sections.map((section) =>
          section.items.length > 0 ? (
            <div
              {...api.getItemGroupProps({ id: section.key })}
              className="border-border-secondary border-b py-100 last:border-b-0"
              key={section.key}
            >
              <div
                {...api.getItemGroupLabelProps({ htmlFor: section.key })}
                className="px-300 py-100 font-semibold text-fg-secondary text-xs uppercase tracking-normal"
              >
                {section.title}
              </div>
              {section.items.map((item) => (
                <SearchAutocompleteRow
                  api={api}
                  item={item}
                  key={`${item.type}-${item.id}`}
                />
              ))}
            </div>
          ) : null,
        )}
      </div>
    </div>
  )
}

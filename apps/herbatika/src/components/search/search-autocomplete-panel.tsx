"use client"

import type { ComboboxApi } from "@techsio/ui-kit/molecules/combobox"
import { useTranslations } from "next-intl"

import NextLink from "@/components/app-link"
import type {
  SearchAutocompleteStatus,
  SearchAutocompleteSuggestion,
} from "@/lib/search-autocomplete/search-autocomplete-types"

import { SearchAutocompleteMedia } from "./search-autocomplete-media"
import { toSearchComboboxItem } from "./search-autocomplete-sections"
import type { SearchAutocompletePanelSection } from "./search-autocomplete-sections"

interface SearchAutocompletePanelProps {
  api: ComboboxApi<SearchAutocompleteSuggestion>
  query: string
  sections: SearchAutocompletePanelSection[]
  status: SearchAutocompleteStatus
}

const PANEL_CLASS_NAME =
  "absolute left-0 right-0 top-full z-50 mt-100 max-h-screen overflow-y-auto rounded-xs border border-border-secondary bg-surface py-200 shadow-md"

type SearchTranslator = ReturnType<typeof useTranslations<"search">>

const resolveSearchAutocompleteSubtitle = (
  item: SearchAutocompleteSuggestion,
  translate: SearchTranslator,
): string | undefined => {
  if (item.subtitle !== undefined && item.subtitle !== "") {
    return item.subtitle
  }

  if (item.type === "category") {
    return translate("autocomplete.types.category")
  }

  if (item.type === "brand") {
    return translate("autocomplete.types.brand")
  }

  return undefined
}

const SearchAutocompleteMeta = ({
  inStockLabel,
  item,
  outOfStockLabel,
}: {
  inStockLabel: string
  item: SearchAutocompleteSuggestion
  outOfStockLabel: string
}) => {
  const hasAvailability = typeof item.inStock === "boolean"
  const hasPrice = item.priceLabel !== undefined && item.priceLabel !== ""

  if (!hasPrice && !hasAvailability) {
    return null
  }

  return (
    <span className="shrink-0 text-right text-xs leading-snug">
      {hasPrice ? (
        <span className="block font-bold text-primary">{item.priceLabel}</span>
      ) : null}
      {hasAvailability ? (
        <span
          className={
            item.inStock === true ? "text-success" : "text-fg-secondary"
          }
        >
          {item.inStock === true ? inStockLabel : outOfStockLabel}
        </span>
      ) : null}
    </span>
  )
}

const SearchAutocompleteRow = ({
  api,
  item,
}: Pick<SearchAutocompletePanelProps, "api"> & {
  item: SearchAutocompleteSuggestion
}) => {
  const t = useTranslations("search")
  const subtitle = resolveSearchAutocompleteSubtitle(item, t)
  const comboboxItem = toSearchComboboxItem(item)
  const { onClick, onMouseEnter, onTouchStart, ...itemProps } =
    api.getItemProps({ item: comboboxItem })

  return (
    <NextLink
      {...itemProps}
      className="flex min-w-0 items-center gap-300 px-300 py-200 text-fg-primary transition-colors hover:bg-fill-secondary data-[highlighted]:bg-fill-secondary"
      href={item.href}
      onClick={(event) => {
        onClick?.(event)
      }}
      onMouseEnter={(event) => {
        onMouseEnter?.(event)
      }}
      onTouchStart={(event) => {
        onTouchStart?.(event)
      }}
    >
      <SearchAutocompleteMedia item={item} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-sm leading-snug">
          {item.title}
        </span>
        {subtitle !== undefined && subtitle !== "" ? (
          <span className="block truncate text-fg-secondary text-xs leading-snug">
            {subtitle}
          </span>
        ) : null}
      </span>
      <SearchAutocompleteMeta
        inStockLabel={t("availability.in_stock")}
        item={item}
        outOfStockLabel={t("availability.out_of_stock")}
      />
    </NextLink>
  )
}

export const SearchAutocompletePanel = ({
  api,
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

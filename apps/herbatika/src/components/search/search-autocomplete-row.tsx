"use client"

import type { ComboboxApi } from "@techsio/ui-kit/molecules/combobox"
import { useTranslations } from "next-intl"

import NextLink from "@/components/app-link"
import type { SearchAutocompleteSuggestion } from "@/lib/search-autocomplete/search-autocomplete-types"

import { SearchAutocompleteMedia } from "./search-autocomplete-media"
import { toSearchComboboxItem } from "./search-autocomplete-sections"

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

export const SearchAutocompleteRow = ({
  api,
  item,
}: {
  api: ComboboxApi<SearchAutocompleteSuggestion>
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

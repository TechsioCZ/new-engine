"use client"

import { useTranslations } from "next-intl"
import NextLink from "next/link"
import type { MouseEvent } from "react"

import NextLink from "@/components/app-link"
import type {
  SearchAutocompleteStatus,
  SearchAutocompleteSuggestion,
  SearchAutocompleteSuggestionType,
} from "@/lib/search-autocomplete/search-autocomplete-types"

import { SearchAutocompleteMedia } from "./search-autocomplete-media"

export type SearchAutocompletePanelSection = {
  key: SearchAutocompleteSuggestionType
  title: string
  items: SearchAutocompleteSuggestion[]
}

type SearchAutocompletePanelProps = {
  activeItemId?: string
  id: string
  onItemClick: () => void
  onItemMouseEnter: (item: SearchAutocompleteSuggestion) => void
  onMouseDown: (event: MouseEvent<HTMLDivElement>) => void
  query: string
  sections: SearchAutocompletePanelSection[]
  status: SearchAutocompleteStatus
}

const PANEL_CLASS_NAME =
  "absolute left-0 right-0 top-full z-50 mt-100 max-h-screen overflow-y-auto rounded-xs border border-border-secondary bg-surface py-200 shadow-md"

const joinClassNames = (...classNames: Array<string | false | undefined>) =>
  classNames.filter(Boolean).join(" ")

type SearchTranslator = ReturnType<typeof useTranslations<"search">>

export const getSearchAutocompleteOptionId = (
  panelId: string,
  item: SearchAutocompleteSuggestion
) => `${panelId}-${item.type}-${item.id}`

const resolveSearchAutocompleteSubtitle = (
  item: SearchAutocompleteSuggestion,
  translate: SearchTranslator
) => {
  if (item.subtitle) {
    return item.subtitle
  }

  if (item.type === "category") {
    return translate("autocomplete.types.category")
  }

  if (item.type === "brand") {
    return translate("autocomplete.types.brand")
  }

  return
}

function SearchAutocompleteMeta({
  inStockLabel,
  item,
  outOfStockLabel,
}: {
  inStockLabel: string
  item: SearchAutocompleteSuggestion
  outOfStockLabel: string
}) {
  const hasAvailability = typeof item.inStock === "boolean"

  if (!(item.priceLabel || hasAvailability)) {
    return null
  }

  return (
    <span className="shrink-0 text-right text-xs leading-snug">
      {item.priceLabel ? (
        <span className="block font-bold text-primary">{item.priceLabel}</span>
      ) : null}
      {hasAvailability ? (
        <span className={item.inStock ? "text-success" : "text-fg-secondary"}>
          {item.inStock ? inStockLabel : outOfStockLabel}
        </span>
      ) : null}
    </span>
  )
}

function SearchAutocompleteRow({
  activeItemId,
  item,
  onItemClick,
  onItemMouseEnter,
  panelId,
}: Pick<
  SearchAutocompletePanelProps,
  "activeItemId" | "onItemClick" | "onItemMouseEnter"
> & {
  item: SearchAutocompleteSuggestion
  panelId: string
}) {
  const t = useTranslations("search")
  const optionId = getSearchAutocompleteOptionId(panelId, item)
  const isActive = activeItemId === optionId
  const subtitle = resolveSearchAutocompleteSubtitle(item, t)

  return (
    <li role="presentation">
      <NextLink
        aria-selected={isActive}
        className={joinClassNames(
          "flex min-w-0 items-center gap-300 px-300 py-200 text-fg-primary transition-colors",
          isActive ? "bg-fill-secondary" : "hover:bg-fill-secondary"
        )}
        href={item.href}
        id={optionId}
        onClick={onItemClick}
        onMouseEnter={() => onItemMouseEnter(item)}
        role="option"
      >
        <SearchAutocompleteMedia item={item} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-sm leading-snug">
            {item.title}
          </span>
          {subtitle ? (
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
    </li>
  )
}

export function SearchAutocompletePanel({
  activeItemId,
  id,
  onItemClick,
  onItemMouseEnter,
  onMouseDown,
  query,
  sections,
  status,
}: SearchAutocompletePanelProps) {
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
      // biome-ignore lint/a11y/noNoninteractiveElementInteractions: Mouse down keeps the combobox input focused while the suggestion panel handles status feedback.
      // biome-ignore lint/a11y/noStaticElementInteractions: This handler does not activate panel content; it only preserves combobox focus behavior.
      <div className={PANEL_CLASS_NAME} onMouseDown={onMouseDown}>
        <output
          className={`block px-300 py-250 text-sm ${status === "error" ? "text-danger" : "text-fg-secondary"}`}
          id={id}
        >
          {statusMessage}
        </output>
      </div>
    )
  }

  return (
    <div
      aria-busy={status === "loading" ? true : undefined}
      className={PANEL_CLASS_NAME}
      id={id}
      onMouseDown={onMouseDown}
      role="listbox"
    >
      {sections.map((section) =>
        section.items.length > 0 ? (
          <div
            className="border-border-secondary border-b py-100 last:border-b-0"
            key={section.key}
          >
            <div className="px-300 py-100 font-semibold text-fg-secondary text-xs uppercase tracking-normal">
              {section.title}
            </div>
            <ul aria-label={section.title}>
              {section.items.map((item) => (
                <SearchAutocompleteRow
                  {...(activeItemId === undefined
                    ? {}
                    : { activeItemId: activeItemId })}
                  item={item}
                  key={`${item.type}-${item.id}`}
                  onItemClick={onItemClick}
                  onItemMouseEnter={onItemMouseEnter}
                  panelId={id}
                />
              ))}
            </ul>
          </div>
        ) : null
      )}
    </div>
  )
}

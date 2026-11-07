/**
 * SearchSuggestions - @techsio/ui-kit template.
 *
 * @component SearchSuggestions
 * @componentVersion v1.0.5
 * @skill search-suggestions-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 */
import type { ReactNode } from "react"
import {
  Combobox,
  type ComboboxItem,
  type ComboboxItemGroup,
  type ComboboxProps,
} from "../molecules/combobox"
import { tv } from "../utils"

export const searchSuggestionsResultVariants = tv({
  slots: {
    row: "flex min-w-0 flex-1 items-center gap-search-suggestions-result",
    image: "size-search-suggestions-result-image shrink-0 object-cover",
    body: "flex min-w-0 flex-1 flex-col",
    title: "wrap-anywhere whitespace-normal font-search-suggestions-title",
    subtitle: "search-suggestions-result-subtitle",
    price: "shrink-0 whitespace-nowrap",
  },
})

const searchSuggestionsVariants = tv({
  base: "search-suggestions-result-scope flex min-w-0 flex-1",
})

export type SearchSuggestionItem<T = unknown> = ComboboxItem<T> & {
  href: string
}

export type SearchSuggestionGroup<T = unknown> = Omit<
  ComboboxItemGroup<T>,
  "items"
> & {
  items: SearchSuggestionItem<T>[]
}

export type SearchSuggestionsProps<T = unknown> = Omit<
  ComboboxProps<T>,
  | "items"
  | "groups"
  | "renderItem"
  | "footer"
  | "mode"
  | "multiple"
  | "value"
  | "defaultValue"
  | "onChange"
  | "name"
  | "selectionBehavior"
  | "allowCustomValue"
> & {
  groups: SearchSuggestionGroup<T>[]
  resultSlot?: ComboboxProps<T>["renderItem"]
  allResultsLink?: ReactNode
}

export function SearchSuggestions<T = unknown>({
  resultSlot,
  allResultsLink,
  filterBehavior = "external",
  inputBehavior = "none",
  portalled = false,
  size = "md",
  ...props
}: SearchSuggestionsProps<T>) {
  return (
    <Combobox
      {...props}
      filterBehavior={filterBehavior}
      footer={allResultsLink}
      inputBehavior={inputBehavior}
      mode="navigation"
      portalled={portalled}
      renderItem={(item) => (
        <span className={searchSuggestionsVariants()} data-size={size}>
          {resultSlot ? resultSlot(item) : item.label}
        </span>
      )}
      size={size}
    />
  )
}

/**
 * SearchSuggestions - @techsio/ui-kit template.
 *
 * @component SearchSuggestions
 * @componentVersion v1.0.0
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
      renderItem={resultSlot}
    />
  )
}

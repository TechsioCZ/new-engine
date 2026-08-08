"use client"

import { useCombobox } from "@techsio/ui-kit/molecules/combobox"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { useId, useState } from "react"
import type { SubmitEvent } from "react"

import { appHref } from "@/lib/routing"
import { SEARCH_AUTOCOMPLETE_MIN_QUERY_LENGTH } from "@/lib/search-autocomplete/search-autocomplete-types"

import {
  createSearchAutocompleteSections,
  toSearchComboboxItem,
} from "./search-autocomplete-sections"
import { useSearchAutocomplete } from "./use-search-autocomplete"

interface UseSearchAutocompleteControllerInput {
  countryCode?: string
  currencyCode: string
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void
  regionId?: string
}

export const useSearchAutocompleteController = ({
  countryCode,
  currencyCode,
  onSubmit,
  regionId,
}: UseSearchAutocompleteControllerInput) => {
  const router = useRouter()
  const t = useTranslations("search")
  const generatedId = useId()
  const [value, setValue] = useState("")
  const [requestedOpen, setRequestedOpen] = useState(false)
  const { data: autocompleteData, status: autocompleteStatus } =
    useSearchAutocomplete({
      ...(countryCode === undefined ? {} : { countryCode }),
      currencyCode,
      enabled: requestedOpen,
      query: value,
      ...(regionId === undefined ? {} : { regionId }),
    })
  const normalizedQuery = value.trim()
  const hasSearchableQuery =
    normalizedQuery.length === 0 ||
    normalizedQuery.length >= SEARCH_AUTOCOMPLETE_MIN_QUERY_LENGTH
  const sections = createSearchAutocompleteSections(autocompleteData, {
    brands: t("autocomplete.sections.brands"),
    categories: t("autocomplete.sections.categories"),
    content: t("autocomplete.sections.content"),
    products: t("autocomplete.sections.products"),
  })
  const items = sections.flatMap((section) =>
    section.items.map(toSearchComboboxItem),
  )
  const canOpen = hasSearchableQuery && autocompleteStatus !== "idle"
  const handleValueChange = (nextValue: string) => {
    setValue(nextValue)
    const { length } = nextValue.trim()
    setRequestedOpen(
      length === 0 || length >= SEARCH_AUTOCOMPLETE_MIN_QUERY_LENGTH,
    )
  }
  const open = requestedOpen && canOpen
  const { api } = useCombobox({
    allowCustomValue: true,
    closeOnSelect: true,
    filterItems: false,
    id: `${generatedId}-search-autocomplete`,
    inputBehavior: "none",
    inputValue: value,
    items,
    loopFocus: true,
    navigate: ({ value: selectedValue }) => {
      const selectedItem = items.find((item) => item.value === selectedValue)
      const suggestion = selectedItem?.data
      if (suggestion !== undefined) {
        router.push(appHref(suggestion.href))
      }
    },
    onInputValueChange: handleValueChange,
    onOpenChange: setRequestedOpen,
    open,
    openOnChange: true,
    selectionBehavior: "preserve",
  })

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    api.setOpen(false)
    onSubmit(event)
  }

  return {
    api,
    degraded: autocompleteData.degraded,
    handleSubmit,
    handleValueChange,
    hasItems: items.length > 0,
    normalizedQuery,
    sections,
    shouldShowPanel: api.open && canOpen,
    status: autocompleteStatus,
    value,
  }
}

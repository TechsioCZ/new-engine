"use client"

import { useRouter } from "next/navigation"
import {
  type FocusEvent,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
  useId,
  useState,
} from "react"
import {
  SEARCH_AUTOCOMPLETE_MIN_QUERY_LENGTH,
  type SearchAutocompleteSuggestion,
} from "@/lib/search-autocomplete/search-autocomplete-types"
import { getSearchAutocompleteOptionId } from "./search-autocomplete-panel"
import {
  clampSearchAutocompleteIndex,
  createSearchAutocompleteSections,
} from "./search-autocomplete-sections"
import { useSearchAutocomplete } from "./use-search-autocomplete"

type UseSearchAutocompleteControllerInput = {
  countryCode?: string
  currencyCode: string
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  regionId?: string
}

export function useSearchAutocompleteController({
  countryCode,
  currencyCode,
  onSubmit,
  regionId,
}: UseSearchAutocompleteControllerInput) {
  const router = useRouter()
  const panelId = `${useId()}-search-autocomplete`
  const [value, setValue] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const autocomplete = useSearchAutocomplete({
    countryCode,
    currencyCode,
    query: value,
    regionId,
  })
  const normalizedQuery = value.trim()
  const sections = createSearchAutocompleteSections(autocomplete.data)
  const flatItems = sections.flatMap((section) => section.items)
  const activeItem = flatItems[activeIndex] ?? null
  const shouldShowPanel =
    isFocused &&
    !isDismissed &&
    normalizedQuery.length >= SEARCH_AUTOCOMPLETE_MIN_QUERY_LENGTH &&
    autocomplete.status !== "idle"
  const activeItemId =
    shouldShowPanel && activeItem
      ? getSearchAutocompleteOptionId(panelId, activeItem)
      : undefined
  const hasItems = flatItems.length > 0

  const closePanel = () => {
    setIsDismissed(true)
    setActiveIndex(-1)
  }

  const resetPanel = () => {
    setIsDismissed(false)
    setActiveIndex(-1)
  }

  const handleFocus = () => {
    setIsFocused(true)
    setIsDismissed(false)
  }

  const handleValueChange = (nextValue: string) => {
    setValue(nextValue)
    resetPanel()
  }

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    const nextFocusedElement = event.relatedTarget
    if (
      nextFocusedElement instanceof Node &&
      event.currentTarget.contains(nextFocusedElement)
    ) {
      return
    }

    setIsFocused(false)
    resetPanel()
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    closePanel()
    onSubmit(event)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setIsDismissed(true)
      setActiveIndex(-1)
      return
    }

    if (!(shouldShowPanel && hasItems)) {
      return
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      setActiveIndex((currentIndex) =>
        clampSearchAutocompleteIndex(
          event.key === "ArrowDown" ? currentIndex + 1 : currentIndex - 1,
          flatItems.length
        )
      )
      return
    }

    if (event.key === "Enter" && activeItem) {
      event.preventDefault()
      router.push(activeItem.href)
      closePanel()
    }
  }

  const handleItemMouseEnter = (item: SearchAutocompleteSuggestion) => {
    setActiveIndex(
      flatItems.findIndex(
        (candidate) => candidate.id === item.id && candidate.type === item.type
      )
    )
  }

  const handlePanelMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault()
  }

  return {
    activeItemId,
    closePanel,
    handleFocus,
    handleBlur,
    handleItemMouseEnter,
    handleKeyDown,
    handlePanelMouseDown,
    handleSubmit,
    handleValueChange,
    normalizedQuery,
    panelId,
    sections,
    hasItems,
    shouldShowPanel,
    status: autocomplete.status,
    value,
  }
}

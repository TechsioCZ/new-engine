"use client"

import { SearchForm } from "@techsio/ui-kit/molecules/search-form"
import type { FormEvent } from "react"
import { SEARCH_AUTOCOMPLETE_MAX_QUERY_LENGTH } from "@/lib/search-autocomplete/search-autocomplete-types"
import { SearchAutocompletePanel } from "./search-autocomplete-panel"
import { useSearchAutocompleteController } from "./use-search-autocomplete-controller"

type SearchAutocompleteProps = {
  countryCode?: string
  currencyCode: string
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  regionId?: string
  variant: "desktop" | "mobile"
}

export function SearchAutocomplete({
  countryCode,
  currencyCode,
  onSubmit,
  regionId,
  variant,
}: SearchAutocompleteProps) {
  const isMobile = variant === "mobile"
  const controller = useSearchAutocompleteController({
    countryCode,
    currencyCode,
    onSubmit,
    regionId,
  })

  return (
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: Blur on the combobox wrapper closes the suggestion panel when focus leaves the whole search control.
    // biome-ignore lint/a11y/noStaticElementInteractions: This wrapper manages composite combobox focus rather than acting as an interactive control.
    <div className="relative w-full" onBlur={controller.handleBlur}>
      <SearchForm
        className="w-full"
        onSubmit={controller.handleSubmit}
        onValueChange={controller.handleValueChange}
        value={controller.value}
      >
        {/*
        border border-border-search overflow-hidden
        */}
        <SearchForm.Control className="h-search-form rounded-base bg-fill-secondary">
          <SearchForm.Input
            aria-activedescendant={controller.activeItemId}
            aria-autocomplete="list"
            aria-controls={controller.hasItems ? controller.panelId : undefined}
            aria-expanded={controller.shouldShowPanel}
            aria-haspopup="listbox"
            className={`${isMobile ? "px-350 text-sm" : "px-400"}
              border-none h-full font-verdana
             -outline-offset-1 outline outline-border-search
             focus-visible:outline-offset-0 focus-visible:outline-search-form-focused
            
            `}
            maxLength={SEARCH_AUTOCOMPLETE_MAX_QUERY_LENGTH}
            name="q"
            onFocus={controller.handleFocus}
            onKeyDown={controller.handleKeyDown}
            placeholder="Napíšte, čo hľadáte..."
            role="combobox"
          />
          <SearchForm.Button
            aria-label="Hľadať"
            className="rounded-none rounded-r-base h-full focus-visible:bg-success focus-visible:outline-offset-0 focus-visible:outline-search-form-focused"
            iconSize={isMobile ? "lg" : "xl"}
            showSearchIcon
          />
          <SearchForm.ClearButton
            aria-label="Vymazať vyhľadávanie"
            className="text-fg-secondary hover:text-fg-primary right-0"
          />
        </SearchForm.Control>

        {controller.shouldShowPanel ? (
          <SearchAutocompletePanel
            activeItemId={controller.activeItemId}
            id={controller.panelId}
            onItemClick={controller.closePanel}
            onItemMouseEnter={controller.handleItemMouseEnter}
            onMouseDown={controller.handlePanelMouseDown}
            query={controller.normalizedQuery}
            sections={controller.sections}
            status={controller.status}
          />
        ) : null}
      </SearchForm>
    </div>
  )
}

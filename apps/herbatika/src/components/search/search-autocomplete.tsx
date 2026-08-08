"use client"

import { SearchForm } from "@techsio/ui-kit/molecules/search-form"
import { useTranslations } from "next-intl"
import type { SubmitEvent } from "react"

import { SEARCH_AUTOCOMPLETE_MAX_QUERY_LENGTH } from "@/lib/search-autocomplete/search-autocomplete-types"

import { SearchAutocompletePanel } from "./search-autocomplete-panel"
import { useSearchAutocompleteController } from "./use-search-autocomplete-controller"

interface SearchAutocompleteProps {
  countryCode?: string
  currencyCode: string
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void
  regionId?: string
  variant: "desktop" | "mobile"
}

export const SearchAutocomplete = ({
  countryCode,
  currencyCode,
  onSubmit,
  regionId,
  variant,
}: SearchAutocompleteProps) => {
  const t = useTranslations("search")
  const isMobile = variant === "mobile"
  const inputClassName = isMobile ? "px-350 text-sm" : "px-400"
  const controller = useSearchAutocompleteController({
    ...(countryCode === undefined ? {} : { countryCode }),
    currencyCode,
    onSubmit,
    ...(regionId === undefined ? {} : { regionId }),
  })

  return (
    <div className="relative w-full">
      <SearchForm
        className="w-full"
        onSubmit={controller.handleSubmit}
        onValueChange={controller.handleValueChange}
        value={controller.value}
      >
        <SearchForm.Control className="h-search-form rounded-base bg-fill-secondary">
          <SearchForm.Input
            {...controller.api.getInputProps()}
            aria-label={t("input_aria")}
            className={`${inputClassName} -outline-offset-1 h-full border-none font-verdana outline outline-border-search focus-visible:outline-search-form-border-focused focus-visible:outline-offset-0`}
            maxLength={SEARCH_AUTOCOMPLETE_MAX_QUERY_LENGTH}
            name="q"
            placeholder={t("input_placeholder")}
          />
          <SearchForm.Button
            aria-label={t("submit_aria")}
            className="h-full rounded-none rounded-r-base focus-visible:bg-search-form-bg-focused focus-visible:outline-search-form-border-focused focus-visible:outline-offset-0"
            iconSize={isMobile ? "lg" : "xl"}
            showSearchIcon
          />
          <SearchForm.ClearButton
            {...controller.api.getClearTriggerProps()}
            aria-label={t("clear_aria")}
            className="right-0 text-fg-secondary hover:text-fg-primary"
          />
        </SearchForm.Control>

        {controller.shouldShowPanel ? (
          <SearchAutocompletePanel
            api={controller.api}
            degraded={controller.degraded}
            query={controller.normalizedQuery}
            sections={controller.sections}
            status={controller.status}
          />
        ) : null}
      </SearchForm>
    </div>
  )
}

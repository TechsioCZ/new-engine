"use client";

import { SearchForm } from "@techsio/ui-kit/molecules/search-form";
import type { FormEvent } from "react";
import { SEARCH_AUTOCOMPLETE_MAX_QUERY_LENGTH } from "@/lib/search-autocomplete/search-autocomplete-types";
import { SearchAutocompletePanel } from "./search-autocomplete-panel";
import { useSearchAutocompleteController } from "./use-search-autocomplete-controller";

type SearchAutocompleteProps = {
  countryCode?: string;
  currencyCode: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  regionId?: string;
  variant: "desktop" | "mobile";
};

export function SearchAutocomplete({
  countryCode,
  currencyCode,
  onSubmit,
  regionId,
  variant,
}: SearchAutocompleteProps) {
  const isMobile = variant === "mobile";
  const controller = useSearchAutocompleteController({
    countryCode,
    currencyCode,
    onSubmit,
    regionId,
  });

  return (
    <div className="relative w-full" onBlur={controller.handleBlur}>
      <SearchForm
        className="w-full"
        onSubmit={controller.handleSubmit}
        onValueChange={controller.handleValueChange}
        value={controller.value}
      >
        <SearchForm.Control className="h-search-form border border-border-search bg-fill-secondary">
          <SearchForm.Input
            aria-activedescendant={controller.activeItemId}
            aria-autocomplete="list"
            aria-controls={
              controller.hasItems ? controller.panelId : undefined
            }
            aria-expanded={controller.shouldShowPanel}
            aria-haspopup="listbox"
            className={`${isMobile ? "px-350 text-sm" : "px-400"} h-full font-verdana`}
            maxLength={SEARCH_AUTOCOMPLETE_MAX_QUERY_LENGTH}
            name="q"
            onFocus={controller.handleFocus}
            onKeyDown={controller.handleKeyDown}
            placeholder="Napíšte, čo hľadáte..."
            role="combobox"
          />
          <SearchForm.ClearButton
            aria-label="Vymazať vyhľadávanie"
            className="text-fg-secondary hover:text-fg-primary"
          />
          <SearchForm.Button
            aria-label="Hľadať"
            className="rounded-none"
            iconSize={isMobile ? "lg" : "xl"}
            showSearchIcon
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
  );
}

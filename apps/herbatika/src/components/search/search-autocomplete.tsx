"use client";

import { SearchForm } from "@techsio/ui-kit/molecules/search-form";
import { useRouter } from "next/navigation";
import {
  useId,
  useMemo,
  useState,
  type FocusEvent,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import {
  SEARCH_AUTOCOMPLETE_MIN_QUERY_LENGTH,
  type SearchAutocompleteSuggestion,
} from "@/lib/search-autocomplete/search-autocomplete-types";
import {
  getSearchAutocompleteOptionId,
  SearchAutocompletePanel,
} from "./search-autocomplete-panel";
import {
  clampSearchAutocompleteIndex,
  createSearchAutocompleteSections,
} from "./search-autocomplete-sections";
import { useSearchAutocomplete } from "./use-search-autocomplete";

type SearchAutocompleteProps = {
  currencyCode: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  variant: "desktop" | "mobile";
};

export function SearchAutocomplete({
  currencyCode,
  onSubmit,
  variant,
}: SearchAutocompleteProps) {
  const router = useRouter();
  const generatedId = useId();
  const panelId = `${generatedId}-search-autocomplete`;
  const isMobile = variant === "mobile";
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const autocomplete = useSearchAutocomplete({ query: value, currencyCode });
  const normalizedQuery = value.trim();
  const sections = useMemo(
    () => createSearchAutocompleteSections(autocomplete.data),
    [autocomplete.data],
  );
  const flatItems = useMemo(
    () => sections.flatMap((section) => section.items),
    [sections],
  );
  const activeItem = flatItems[activeIndex] ?? null;
  const shouldShowPanel =
    isFocused &&
    normalizedQuery.length >= SEARCH_AUTOCOMPLETE_MIN_QUERY_LENGTH &&
    autocomplete.status !== "idle";
  const activeItemId =
    shouldShowPanel && activeItem
      ? getSearchAutocompleteOptionId(panelId, activeItem)
      : undefined;

  const closePanel = () => {
    setIsFocused(false);
    setActiveIndex(-1);
  };

  const handleValueChange = (nextValue: string) => {
    setValue(nextValue);
    setActiveIndex(-1);
  };

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    const nextFocusedElement = event.relatedTarget;
    if (
      nextFocusedElement instanceof Node &&
      event.currentTarget.contains(nextFocusedElement)
    ) {
      return;
    }

    closePanel();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      closePanel();
      return;
    }

    if (!shouldShowPanel || flatItems.length === 0) {
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((currentIndex) =>
        clampSearchAutocompleteIndex(
          event.key === "ArrowDown" ? currentIndex + 1 : currentIndex - 1,
          flatItems.length,
        ),
      );
      return;
    }

    if (event.key === "Enter" && activeItem) {
      event.preventDefault();
      router.push(activeItem.href);
      closePanel();
    }
  };

  const handleItemMouseEnter = (item: SearchAutocompleteSuggestion) => {
    setActiveIndex(
      flatItems.findIndex(
        (candidate) => candidate.id === item.id && candidate.type === item.type,
      ),
    );
  };

  const handlePanelMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  return (
    <div className="relative w-full" onBlur={handleBlur}>
      <SearchForm
        className="w-full"
        onSubmit={onSubmit}
        onValueChange={handleValueChange}
        value={value}
      >
        <SearchForm.Control className="h-search-form border border-border-search bg-fill-secondary">
          <SearchForm.Input
            aria-activedescendant={activeItemId}
            aria-autocomplete="list"
            aria-controls={shouldShowPanel ? panelId : undefined}
            aria-expanded={shouldShowPanel}
            aria-haspopup="listbox"
            className={`${isMobile ? "px-350 text-sm" : "px-400"} h-full font-verdana`}
            name="q"
            onFocus={() => setIsFocused(true)}
            onKeyDown={handleKeyDown}
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

        {shouldShowPanel ? (
          <SearchAutocompletePanel
            activeItemId={activeItemId}
            id={panelId}
            onItemClick={closePanel}
            onItemMouseEnter={handleItemMouseEnter}
            onMouseDown={handlePanelMouseDown}
            query={normalizedQuery}
            sections={sections}
            status={autocomplete.status}
          />
        ) : null}
      </SearchForm>
    </div>
  );
}

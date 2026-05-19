"use client";

import { Link } from "@techsio/ui-kit/atoms/link";
import NextLink from "next/link";
import type { MouseEvent } from "react";
import type {
  SearchAutocompleteSuggestion,
  SearchAutocompleteSuggestionType,
} from "@/lib/search-autocomplete/search-autocomplete-types";
import { SearchAutocompleteMedia } from "./search-autocomplete-media";

export type SearchAutocompletePanelSection = {
  key: SearchAutocompleteSuggestionType;
  title: string;
  items: SearchAutocompleteSuggestion[];
};

type SearchAutocompletePanelProps = {
  activeItemId?: string;
  id: string;
  onItemClick: () => void;
  onItemMouseEnter: (item: SearchAutocompleteSuggestion) => void;
  onMouseDown: (event: MouseEvent<HTMLDivElement>) => void;
  query: string;
  sections: SearchAutocompletePanelSection[];
  status: "idle" | "loading" | "success" | "error";
};

const joinClassNames = (...classNames: Array<string | false | undefined>) =>
  classNames.filter(Boolean).join(" ");

export const getSearchAutocompleteOptionId = (
  panelId: string,
  item: SearchAutocompleteSuggestion,
) => `${panelId}-${item.type}-${item.id}`;

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
  item: SearchAutocompleteSuggestion;
  panelId: string;
}) {
  const optionId = getSearchAutocompleteOptionId(panelId, item);
  const isActive = activeItemId === optionId;

  return (
    <li role="presentation">
      <Link
        aria-selected={isActive}
        as={NextLink}
        className={joinClassNames(
          "flex min-w-0 items-center gap-300 px-300 py-200 text-fg-primary transition-colors",
          isActive ? "bg-fill-secondary" : "hover:bg-fill-secondary",
        )}
        href={item.href}
        id={optionId}
        onClick={onItemClick}
        onMouseEnter={() => onItemMouseEnter(item)}
        role="option"
      >
        <SearchAutocompleteMedia item={item} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold leading-snug">
            {item.title}
          </span>
          {item.subtitle ? (
            <span className="block truncate text-xs leading-snug text-fg-secondary">
              {item.subtitle}
            </span>
          ) : null}
        </span>
        {item.priceLabel || typeof item.inStock === "boolean" ? (
          <span className="shrink-0 text-right text-xs leading-snug">
            {item.priceLabel ? (
              <span className="block font-bold text-primary">
                {item.priceLabel}
              </span>
            ) : null}
            {typeof item.inStock === "boolean" ? (
              <span
                className={item.inStock ? "text-success" : "text-fg-secondary"}
              >
                {item.inStock ? "Skladom" : "Vypredané"}
              </span>
            ) : null}
          </span>
        ) : null}
      </Link>
    </li>
  );
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
  const hasItems = sections.some((section) => section.items.length > 0);

  return (
    <div
      className="absolute left-0 right-0 top-full z-50 mt-100 max-h-screen overflow-y-auto rounded-xs border border-border-secondary bg-surface py-200 shadow-md"
      id={id}
      onMouseDown={onMouseDown}
      role="listbox"
    >
      {status === "loading" && !hasItems ? (
        <p className="px-300 py-250 text-sm text-fg-secondary">
          Hľadáme návrhy...
        </p>
      ) : null}

      {status === "error" ? (
        <p className="px-300 py-250 text-sm text-danger">
          Návrhy sa nepodarilo načítať.
        </p>
      ) : null}

      {status === "success" && !hasItems ? (
        <p className="px-300 py-250 text-sm text-fg-secondary">
          Pre výraz "{query}" nemáme rýchle návrhy.
        </p>
      ) : null}

      {sections.map((section) =>
        section.items.length > 0 ? (
          <div className="border-b border-border-secondary py-100 last:border-b-0" key={section.key}>
            <div className="px-300 py-100 text-xs font-semibold uppercase tracking-normal text-fg-secondary">
              {section.title}
            </div>
            <ul aria-label={section.title} role="group">
              {section.items.map((item) => (
                <SearchAutocompleteRow
                  activeItemId={activeItemId}
                  item={item}
                  key={`${item.type}-${item.id}`}
                  onItemClick={onItemClick}
                  onItemMouseEnter={onItemMouseEnter}
                  panelId={id}
                />
              ))}
            </ul>
          </div>
        ) : null,
      )}
    </div>
  );
}

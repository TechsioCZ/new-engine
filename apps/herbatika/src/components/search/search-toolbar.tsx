"use client";

import { Badge } from "@techsio/ui-kit/atoms/badge";
import { SearchForm } from "@techsio/ui-kit/molecules/search-form";

type SearchToolbarProps = {
  query: string;
  searchDraft: string;
  onSearchDraftChange: (value: string) => void;
  onSearchSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  estimatedTotalHits: number;
  hitsCount: number;
  pageBadgeLabel: string;
};

export function SearchToolbar({
  query,
  searchDraft,
  onSearchDraftChange,
  onSearchSubmit,
  estimatedTotalHits,
  hitsCount,
  pageBadgeLabel,
}: SearchToolbarProps) {
  return (
    <>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-fg-primary">Vyhľadávanie</h1>
        <p className="text-sm text-fg-secondary">
          Vyhľadajte produkty v katalógu.
        </p>
      </div>

      <SearchForm
        className="w-full max-w-[620px]"
        onSubmit={onSearchSubmit}
        onValueChange={onSearchDraftChange}
        value={searchDraft}
      >
        <SearchForm.Control className="rounded-[12px] border-border-secondary bg-surface">
          <SearchForm.Input
            className="h-11"
            name="q"
            placeholder="Napíšte, čo hľadáte..."
          />
          <SearchForm.Button
            aria-label="Hľadať"
            className="min-w-14 rounded-r-[12px] px-4"
            showSearchIcon
          />
        </SearchForm.Control>
      </SearchForm>

      {query ? (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="info">{`dotaz: ${query}`}</Badge>
          <Badge variant="secondary">{`nájdené: ${estimatedTotalHits}`}</Badge>
          <Badge variant="secondary">{`zobrazené: ${hitsCount}`}</Badge>
          <Badge variant="secondary">{pageBadgeLabel}</Badge>
        </div>
      ) : null}
    </>
  );
}

"use client";

import { Badge } from "@techsio/ui-kit/atoms/badge";
import { SearchForm } from "@techsio/ui-kit/molecules/search-form";
import { SupportingText } from "@/components/text/supporting-text";

const SEARCH_FORM_NOTES = [
  "Aktuální truth-set je desktop header search z Figma node 94:1614.",
  "Showcase je zredukovaný na čisté SearchForm sloty bez appearance className.",
  "Nevyřešené rozdíly proti Figmě budeme zapisovat jako token work nebo otevřenou otázku.",
] as const;

export function SearchFormShowcase() {
  return (
    <div className="space-y-500">
      <section>
        <article className="space-y-300 rounded-md border border-border-secondary bg-surface p-400">
          <div className="space-y-100">
            <h2 className="text-lg font-semibold text-fg-primary">Header search</h2>
            <SupportingText>
              Desktop search surface z Herbatika headeru podle Figma node 94:1614.
            </SupportingText>
          </div>
          <div className="rounded-md bg-highlight p-400">
            <SearchForm className="w-full max-w-header-search">
              <SearchForm.Control>
                <SearchForm.Input
                  name="q"
                  placeholder="Napíšte, čo hľadáte..."
                />
                <SearchForm.Button aria-label="Hľadať" showSearchIcon className="rounded-none"/>
              </SearchForm.Control>
            </SearchForm>
          </div>
        </article>
      </section>

      <section className="space-y-150 rounded-md border border-border-secondary bg-surface p-400">
        {SEARCH_FORM_NOTES.map((item, index) => (
          <div className="flex items-start gap-200 rounded-sm bg-highlight px-300 py-250" key={item}>
            <Badge variant="secondary">{String(index + 1)}</Badge>
            <SupportingText className="text-fg-primary">{item}</SupportingText>
          </div>
        ))}
      </section>
    </div>
  );
}

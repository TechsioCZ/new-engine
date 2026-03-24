import { Badge } from "@techsio/ui-kit/atoms/badge";
import { SearchForm } from "@techsio/ui-kit/molecules/search-form";
import { SupportingText } from "@/components/text/supporting-text";

const SEARCH_FORM_NOTES = [
  "Current SearchForm contract stačí pro desktop i compact search surface.",
  "Většina rozdílu proti Figma je token a composition práce, ne chybějící shared API.",
  "Správné použití SearchForm slotů je důležitější než další custom wrappers.",
] as const;

export function SearchFormShowcase() {
  return (
    <div className="space-y-500">
      <section className="grid gap-300 xl:grid-cols-2">
        <article className="space-y-300 rounded-md border border-border-secondary bg-surface p-400">
          <div className="space-y-100">
            <h2 className="text-lg font-semibold text-fg-primary">Header search</h2>
            <SupportingText>Hlavní desktop search surface z Herbatika headeru.</SupportingText>
          </div>
          <div className="rounded-md bg-highlight p-400">
            <SearchForm className="w-full">
              <SearchForm.Control className="h-750 rounded-search-form border-border-secondary bg-surface">
                <SearchForm.Input
                  className="h-full px-500 text-md text-fg-secondary placeholder:text-fg-placeholder"
                  name="q"
                  placeholder="Napíšte, čo hľadáte..."
                />
                <SearchForm.Button
                  aria-label="Hľadať"
                  className="min-w-800 rounded-r-search-form rounded-l-none px-450"
                  showSearchIcon
                />
              </SearchForm.Control>
            </SearchForm>
          </div>
        </article>

        <article className="space-y-300 rounded-md border border-border-secondary bg-surface p-400">
          <div className="space-y-100">
            <h2 className="text-lg font-semibold text-fg-primary">Compact search</h2>
            <SupportingText>Menší variant pro mobilní nebo doplňkové použití.</SupportingText>
          </div>
          <div className="rounded-md bg-highlight p-400">
            <SearchForm className="w-full" size="sm">
              <SearchForm.Control className="h-750 rounded-search-form border-border-secondary bg-surface">
                <SearchForm.Input
                  className="h-full px-500 text-md text-fg-secondary placeholder:text-fg-placeholder"
                  name="q"
                  placeholder="Hľadať..."
                />
                <SearchForm.Button aria-label="Hľadať" showSearchIcon />
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

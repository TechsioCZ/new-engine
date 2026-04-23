import type { ReactNode } from "react";

type CatalogResultsLayoutProps = {
  results: ReactNode;
  sidebar: ReactNode;
};

export function CatalogResultsLayout({
  results,
  sidebar,
}: CatalogResultsLayoutProps) {
  return (
    <section className="space-y-400">
      <div className="flex min-w-0 flex-col gap-600 xl:grid xl:grid-cols-12 xl:items-start">
        <div className="min-w-0 xl:sticky xl:top-400 xl:col-span-3 xl:self-start">
          {sidebar}
        </div>
        {results}
      </div>
    </section>
  );
}

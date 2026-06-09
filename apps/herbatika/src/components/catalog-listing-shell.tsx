import type { ReactNode } from "react";

type CatalogListingShellProps = {
  facets: ReactNode;
  results: ReactNode;
};

export function CatalogListingShell({
  facets,
  results,
}: CatalogListingShellProps) {
  return (
    <section className="space-y-400">
      <div className="flex min-w-0 flex-col gap-600 xl:grid xl:grid-cols-12 xl:items-start">
        <div className="min-w-0 xl:col-span-3 xl:self-start xl:sticky xl:top-400">
          {facets}
        </div>
        {results}
      </div>
    </section>
  );
}

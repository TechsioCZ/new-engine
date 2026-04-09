import {
  CategoryFacetsPanel,
  type CategoryFacetsPanelProps,
} from "@/components/category/category-facets-panel";
import {
  CategoryResultsSection,
  type CategoryResultsSectionProps,
} from "@/components/category/category-results-section";

type CatalogResultsShellProps = {
  facetsPanelProps: CategoryFacetsPanelProps;
  resultsSectionProps: CategoryResultsSectionProps;
};

export function CatalogResultsShell({
  facetsPanelProps,
  resultsSectionProps,
}: CatalogResultsShellProps) {
  return (
    <section className="space-y-400">
      <div className="flex min-w-0 flex-col gap-600 xl:grid xl:grid-cols-12 xl:items-start">
        <div className="min-w-0 xl:col-span-3 xl:self-start xl:sticky xl:top-400">
          <CategoryFacetsPanel {...facetsPanelProps} />
        </div>

        <CategoryResultsSection {...resultsSectionProps} />
      </div>
    </section>
  );
}

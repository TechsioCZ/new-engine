import { AsideFilter } from "@/components/aside-filter";
import type { AsideFilterChipItem } from "@/components/aside-filter-chip-section";

export type CategoryFacetsPanelProps = {
  activeFilterCount: number;
  brandItems: AsideFilterChipItem[];
  currencyCode: string;
  formItems: AsideFilterChipItem[];
  ingredientItems: AsideFilterChipItem[];
  isLoading: boolean;
  onBrandToggle: (itemId: string) => void;
  onFormToggle: (itemId: string) => void;
  onIngredientToggle: (itemId: string) => void;
  onPriceRangeCommit: (range: { min?: number; max?: number }) => void;
  onReset: () => void;
  onStatusToggle: (itemId: string) => void;
  priceBounds: { min: number; max: number } | null;
  selectedPriceRange: { min?: number; max?: number };
  statusItems: AsideFilterChipItem[];
};

export function CategoryFacetsPanel({
  activeFilterCount,
  brandItems,
  currencyCode,
  formItems,
  ingredientItems,
  isLoading,
  onBrandToggle,
  onFormToggle,
  onIngredientToggle,
  onPriceRangeCommit,
  onReset,
  onStatusToggle,
  priceBounds,
  selectedPriceRange,
  statusItems,
}: CategoryFacetsPanelProps) {
  const filterProps = {
    activeFilterCount,
    brandItems,
    currencyCode,
    formItems,
    ingredientItems,
    isLoading,
    onBrandToggle,
    onFormToggle,
    onIngredientToggle,
    onPriceRangeCommit,
    onReset,
    onStatusToggle,
    priceBounds,
    selectedPriceRange,
    statusItems,
  };

  return (
    <>
      <div className="hidden xl:block">
        <AsideFilter {...filterProps} />
      </div>

      <details className="space-y-300 xl:hidden">
        <summary className="cursor-pointer rounded-2xl border border-border-secondary bg-surface px-400 py-300 text-sm font-medium text-fg-primary">
          {activeFilterCount > 0 ? `Filtr (${activeFilterCount})` : "Filtr"}
        </summary>
        <AsideFilter {...filterProps} />
      </details>
    </>
  );
}

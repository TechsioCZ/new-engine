import { AsideFilter } from "@/components/aside-filter";
import type { AsideFilterChipItem } from "@/components/aside-filter-chip-section";

type CategoryFacetsPanelProps = {
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
  return (
    <AsideFilter
      activeFilterCount={activeFilterCount}
      brandItems={brandItems}
      currencyCode={currencyCode}
      formItems={formItems}
      ingredientItems={ingredientItems}
      isLoading={isLoading}
      onBrandToggle={onBrandToggle}
      onFormToggle={onFormToggle}
      onIngredientToggle={onIngredientToggle}
      onPriceRangeCommit={onPriceRangeCommit}
      onReset={onReset}
      onStatusToggle={onStatusToggle}
      priceBounds={priceBounds}
      selectedPriceRange={selectedPriceRange}
      statusItems={statusItems}
    />
  );
}

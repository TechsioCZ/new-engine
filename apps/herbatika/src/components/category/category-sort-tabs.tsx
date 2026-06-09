import { Button } from "@techsio/ui-kit/atoms/button";
import type { ProductSortValue } from "@/lib/storefront/plp-query-state";

type CategorySortTabsProps = {
  sortItems: Array<{ label: string; value: ProductSortValue }>;
  activeSort: ProductSortValue;
  onSortChange: (value: ProductSortValue) => void;
  totalProducts: number;
};

export function CategorySortTabs({
  sortItems,
  activeSort,
  onSortChange,
  totalProducts,
}: CategorySortTabsProps) {
  return (
    <div className="flex flex-col gap-150 rounded-xs md:rounded-full bg-highlight px-250 py-200 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 flex-wrap items-center gap-100">
        {sortItems.map((item) => {
          const isActive = item.value === activeSort;

          return (
            <Button
              className={`shrink-0 rounded-full px-350 py-150 font-open-sans text-sm leading-tight font-semibold transition-colors ${
                isActive
                  ? "bg-primary text-fg-reverse"
                  : "text-fg-primary hover:text-primary"
              }`}
              key={`${item.value}-${item.label}`}
              onClick={() => onSortChange(item.value)}
              size="current"
              theme="unstyled"
              type="button"
            >
              {item.label}
            </Button>
          );
        })}
      </div>

      <p className="flex shrink-0 gap-100 justify-end font-verdana text-sm text-fg-secondary">
        <span className="font-semibold text-fg-primary">{totalProducts}</span>
        <span>položiek celkom</span>
      </p>
    </div>
  );
}

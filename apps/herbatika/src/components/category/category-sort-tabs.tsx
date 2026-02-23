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
    <div className="flex flex-col gap-150 rounded-full bg-highlight px-250 py-200 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 items-center gap-100 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:overflow-visible">
        {sortItems.map((item) => {
          const isActive = item.value === activeSort;

          return (
            <Button
              className={`shrink-0 rounded-full px-350 py-150 text-sm leading-tight font-semibold transition-colors ${
                isActive
                  ? "bg-primary text-fg-reverse"
                  : "text-fg-primary hover:text-primary"
              }`}
              key={item.value}
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

      <p className="shrink-0 text-sm text-fg-secondary">
        <span className="font-semibold text-fg-primary">{totalProducts}</span>{" "}
        položiek celkom
      </p>
    </div>
  );
}

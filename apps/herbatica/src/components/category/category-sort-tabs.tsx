import { Button } from "@techsio/ui-kit/atoms/button"
import { useTranslations } from "next-intl"
import type { ProductSortValue } from "@/lib/storefront/plp-query-state"
import { SORT_TAB_ITEMS } from "./category-listing.constants"

type CategorySortTabsProps = {
  activeSort: ProductSortValue
  onSortChange: (value: ProductSortValue) => void
  totalProducts: number
}

export function CategorySortTabs({
  activeSort,
  onSortChange,
  totalProducts,
}: CategorySortTabsProps) {
  const t = useTranslations("catalog")

  return (
    <div className="flex flex-col gap-150 rounded-xs bg-highlight px-250 py-200 md:flex-row md:items-center md:justify-between md:rounded-full">
      <div className="flex min-w-0 flex-wrap items-center gap-100">
        {SORT_TAB_ITEMS.map((item) => {
          const isActive = item.value === activeSort

          return (
            <Button
              aria-pressed={isActive}
              className={`shrink-0 rounded-full px-350 py-150 font-open-sans font-semibold text-sm leading-tight transition-colors ${
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
              {t(item.labelKey)}
            </Button>
          )
        })}
      </div>

      <p className="flex shrink-0 justify-end gap-100 font-verdana text-fg-secondary text-sm">
        <span className="font-semibold text-fg-primary">{totalProducts}</span>
        <span>{t("results.items_total")}</span>
      </p>
    </div>
  )
}

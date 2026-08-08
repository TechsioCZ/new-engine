"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { useTranslations } from "next-intl"

import { AsideFilterChipSection } from "@/components/aside-filter-chip-section"
import type { AsideFilterChipItem } from "@/components/aside-filter-chip-section"
import type {
  AsideFilterPriceBounds,
  AsideFilterPriceRange,
} from "@/components/aside-filter-price-range"
import { AsideFilterPriceSection } from "@/components/aside-filter-price-section"

interface AsideFilterProps {
  priceBounds: AsideFilterPriceBounds | null
  selectedPriceRange: AsideFilterPriceRange
  currencyCode: string
  statusItems: AsideFilterChipItem[]
  formItems: AsideFilterChipItem[]
  brandItems: AsideFilterChipItem[]
  ingredientItems: AsideFilterChipItem[]
  onStatusToggle: (itemId: string) => void
  onFormToggle: (itemId: string) => void
  onBrandToggle: (itemId: string) => void
  onIngredientToggle: (itemId: string) => void
  onPriceRangeCommit: (range: AsideFilterPriceRange) => void
  activeFilterCount: number
  isLoading?: boolean
  onReset: () => void
  showBrandFilter?: boolean
}

export const AsideFilter = ({
  priceBounds,
  selectedPriceRange,
  currencyCode,
  statusItems,
  formItems,
  brandItems,
  ingredientItems,
  onStatusToggle,
  onFormToggle,
  onBrandToggle,
  onIngredientToggle,
  onPriceRangeCommit,
  activeFilterCount,
  isLoading = false,
  onReset,
  showBrandFilter = true,
}: AsideFilterProps) => {
  const t = useTranslations("catalog")

  return (
    <aside className="overflow-hidden rounded-2xl border border-border-secondary bg-surface text-fg-primary">
      <div className="scrollbar-primary space-y-400 p-400 xl:filter-scroll-viewport xl:space-y-500 xl:overflow-y-auto xl:overscroll-contain xl:p-500">
        <AsideFilterPriceSection
          currencyCode={currencyCode}
          onPriceRangeCommit={onPriceRangeCommit}
          priceBounds={priceBounds}
          selectedPriceRange={selectedPriceRange}
        />

        <AsideFilterChipSection
          isLoading={isLoading}
          items={statusItems}
          onToggle={onStatusToggle}
        />

        <div>
          <AsideFilterChipSection
            emptyMessage={t("filters.form_empty")}
            isLoading={isLoading}
            items={formItems}
            loadingMessage={t("filters.form_loading")}
            onToggle={onFormToggle}
            title={t("filters.form")}
          />
        </div>

        {showBrandFilter ? (
          <div>
            <AsideFilterChipSection
              collapseAfter={12}
              emptyMessage={t("filters.brand_empty")}
              isLoading={isLoading}
              items={brandItems}
              loadingMessage={t("filters.brand_loading")}
              onToggle={onBrandToggle}
              title={t("filters.brand")}
            />
          </div>
        ) : null}

        <div>
          <AsideFilterChipSection
            collapseAfter={12}
            emptyMessage={t("filters.ingredient_empty")}
            isLoading={isLoading}
            items={ingredientItems}
            loadingMessage={t("filters.ingredient_loading")}
            onToggle={onIngredientToggle}
            title={t("filters.active_ingredient")}
          />
        </div>

        <div className="space-y-250">
          <Button
            block
            className="min-h-750"
            disabled={activeFilterCount === 0}
            onClick={onReset}
            size="sm"
            theme="outlined"
            variant="secondary"
          >
            {t("filters.clear")}
          </Button>
        </div>
      </div>
    </aside>
  )
}

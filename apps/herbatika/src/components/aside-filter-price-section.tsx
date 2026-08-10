"use client"

import { Slider } from "@techsio/ui-kit/molecules/slider"
import { useTranslations } from "next-intl"

import type {
  AsideFilterPriceBounds,
  AsideFilterPriceRange,
} from "@/components/aside-filter-price-range"
import { useAsideFilterPriceRange } from "@/components/use-aside-filter-price-range"
import { formatWholeCurrencyAmount } from "@/lib/storefront/price-format"

interface AsideFilterPriceSectionProps {
  currencyCode: string
  onPriceRangeCommit: (range: AsideFilterPriceRange) => void
  priceBounds: AsideFilterPriceBounds | null
  selectedPriceRange: AsideFilterPriceRange
}

export const AsideFilterPriceSection = ({
  currencyCode,
  onPriceRangeCommit,
  priceBounds,
  selectedPriceRange,
}: AsideFilterPriceSectionProps) => {
  const t = useTranslations("catalog")
  const { bounds, handleChange, handleChangeEnd, range } =
    useAsideFilterPriceRange({
      onCommit: onPriceRangeCommit,
      priceBounds,
      selectedRange: selectedPriceRange,
    })

  return (
    <section className="space-y-300">
      <h2 className="font-bold text-2xl uppercase leading-none">
        {t("filters.price")}
      </h2>
      <div className="flex items-center justify-between font-medium text-fg-secondary text-lg">
        <span>{formatWholeCurrencyAmount(range[0], currencyCode)}</span>
        <span>{formatWholeCurrencyAmount(range[1], currencyCode)}</span>
      </div>
      <Slider
        defaultValue={[bounds.min, bounds.max]}
        max={bounds.max}
        min={bounds.min}
        minStepsBetweenThumbs={0}
        onChange={handleChange}
        onChangeEnd={handleChangeEnd}
        size="sm"
        step={1}
        value={range}
      />
    </section>
  )
}

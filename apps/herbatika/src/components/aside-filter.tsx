"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { Slider } from "@techsio/ui-kit/molecules/slider"
import { useTranslations } from "next-intl"
import { useState } from "react"

import { AsideFilterChipSection } from "@/components/aside-filter-chip-section"
import type { AsideFilterChipItem } from "@/components/aside-filter-chip-section"
import { formatWholeCurrencyAmount } from "@/lib/storefront/price-format"

interface AsideFilterPriceBounds {
  min: number
  max: number
}

interface AsideFilterPriceRange {
  min?: number
  max?: number
}

const clampNumber = (value: number, min: number, max: number) => {
  if (!Number.isFinite(value)) {
    return min
  }

  return Math.max(min, Math.min(max, value))
}

const toSafeBounds = (
  bounds: AsideFilterPriceBounds | null,
): AsideFilterPriceBounds | null => {
  if (!bounds) {
    return null
  }

  const min = Number.isFinite(bounds.min) ? bounds.min : 0
  const maxCandidate = Number.isFinite(bounds.max) ? bounds.max : min + 1
  const max = maxCandidate > min ? maxCandidate : min + 1

  return {
    max: Math.ceil(max),
    min: Math.floor(min),
  }
}

const resolveRangeFromSelection = (
  selectedRange: AsideFilterPriceRange,
  bounds: AsideFilterPriceBounds,
): [number, number] => {
  const selectedMin =
    typeof selectedRange.min === "number"
      ? clampNumber(selectedRange.min, bounds.min, bounds.max)
      : bounds.min
  const selectedMax =
    typeof selectedRange.max === "number"
      ? clampNumber(selectedRange.max, bounds.min, bounds.max)
      : bounds.max

  if (selectedMin <= selectedMax) {
    return [selectedMin, selectedMax]
  }

  return [selectedMax, selectedMin]
}

const resolveRangeWithinBounds = (
  range: [number, number],
  bounds: AsideFilterPriceBounds,
): [number, number] =>
  resolveRangeFromSelection(
    {
      max: range[1],
      min: range[0],
    },
    bounds,
  )

const resolveBoundsForRender = (
  currentBounds: AsideFilterPriceBounds,
  incomingBounds: AsideFilterPriceBounds | null,
  hasActivePriceFilter: boolean,
): AsideFilterPriceBounds => {
  if (!incomingBounds) {
    return currentBounds
  }

  if (!hasActivePriceFilter) {
    return incomingBounds
  }

  return {
    max: Math.max(currentBounds.max, incomingBounds.max),
    min: Math.min(currentBounds.min, incomingBounds.min),
  }
}

const normalizeCommittedRange = (
  nextRange: [number, number],
  bounds: AsideFilterPriceBounds,
): AsideFilterPriceRange => {
  const rangeMin = clampNumber(nextRange[0], bounds.min, bounds.max)
  const rangeMax = clampNumber(nextRange[1], bounds.min, bounds.max)
  const normalizedMin = rangeMin <= bounds.min ? undefined : rangeMin
  const normalizedMax = rangeMax >= bounds.max ? undefined : rangeMax

  return {
    ...(normalizedMin === undefined ? {} : { min: normalizedMin }),
    ...(normalizedMax === undefined ? {} : { max: normalizedMax }),
  }
}

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
  const incomingPriceBounds = toSafeBounds(priceBounds)
  const hasActivePriceFilter =
    typeof selectedPriceRange.min === "number" ||
    typeof selectedPriceRange.max === "number"
  const initialBounds = incomingPriceBounds ?? { max: 1, min: 0 }
  const [boundsState, setBoundsState] = useState(() => ({
    hasActivePriceFilter,
    incomingMax: incomingPriceBounds?.max,
    incomingMin: incomingPriceBounds?.min,
    value: initialBounds,
  }))
  const boundsChanged =
    boundsState.hasActivePriceFilter !== hasActivePriceFilter ||
    boundsState.incomingMax !== incomingPriceBounds?.max ||
    boundsState.incomingMin !== incomingPriceBounds?.min
  const priceBoundsForRender = boundsChanged
    ? resolveBoundsForRender(
        boundsState.value,
        incomingPriceBounds,
        hasActivePriceFilter,
      )
    : boundsState.value

  if (boundsChanged) {
    setBoundsState({
      hasActivePriceFilter,
      incomingMax: incomingPriceBounds?.max,
      incomingMin: incomingPriceBounds?.min,
      value: priceBoundsForRender,
    })
  }

  const selectedPriceRangeMin = selectedPriceRange.min
  const selectedPriceRangeMax = selectedPriceRange.max
  const [sliderState, setSliderState] = useState(() => ({
    boundsMax: priceBoundsForRender.max,
    boundsMin: priceBoundsForRender.min,
    selectedMax: selectedPriceRangeMax,
    selectedMin: selectedPriceRangeMin,
    value: resolveRangeFromSelection(selectedPriceRange, priceBoundsForRender),
  }))
  const sliderSourceChanged =
    sliderState.boundsMax !== priceBoundsForRender.max ||
    sliderState.boundsMin !== priceBoundsForRender.min ||
    sliderState.selectedMax !== selectedPriceRangeMax ||
    sliderState.selectedMin !== selectedPriceRangeMin
  const sliderRange = sliderSourceChanged
    ? resolveRangeFromSelection(selectedPriceRange, priceBoundsForRender)
    : sliderState.value
  const sliderRangeForRender = resolveRangeWithinBounds(
    sliderRange,
    priceBoundsForRender,
  )

  if (sliderSourceChanged) {
    setSliderState({
      boundsMax: priceBoundsForRender.max,
      boundsMin: priceBoundsForRender.min,
      selectedMax: selectedPriceRangeMax,
      selectedMin: selectedPriceRangeMin,
      value: sliderRangeForRender,
    })
  }

  return (
    <aside className="overflow-hidden rounded-2xl border border-border-secondary bg-surface text-fg-primary">
      <div className="scrollbar-primary space-y-400 p-400 xl:filter-scroll-viewport xl:space-y-500 xl:overflow-y-auto xl:overscroll-contain xl:p-500">
        <section className="space-y-300">
          <h2 className="font-bold text-2xl uppercase leading-none">
            {t("filters.price")}
          </h2>
          <div className="flex items-center justify-between font-medium text-fg-secondary text-lg">
            <span>
              {formatWholeCurrencyAmount(sliderRangeForRender[0], currencyCode)}
            </span>
            <span>
              {formatWholeCurrencyAmount(sliderRangeForRender[1], currencyCode)}
            </span>
          </div>
          <Slider
            defaultValue={[priceBoundsForRender.min, priceBoundsForRender.max]}
            max={priceBoundsForRender.max}
            min={priceBoundsForRender.min}
            minStepsBetweenThumbs={0}
            onChange={(values) => {
              if (values[0] === undefined || values[1] === undefined) {
                return
              }

              setSliderState({
                boundsMax: priceBoundsForRender.max,
                boundsMin: priceBoundsForRender.min,
                selectedMax: selectedPriceRangeMax,
                selectedMin: selectedPriceRangeMin,
                value: resolveRangeWithinBounds(
                  [Math.round(values[0]), Math.round(values[1])],
                  priceBoundsForRender,
                ),
              })
            }}
            onChangeEnd={(values) => {
              if (values[0] === undefined || values[1] === undefined) {
                return
              }

              const nextRange = resolveRangeWithinBounds(
                [Math.round(values[0]), Math.round(values[1])],
                priceBoundsForRender,
              )
              onPriceRangeCommit(
                normalizeCommittedRange(nextRange, priceBoundsForRender),
              )
            }}
            size="sm"
            step={1}
            value={sliderRangeForRender}
          />
        </section>

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

export type { AsideFilterPriceBounds, AsideFilterPriceRange }

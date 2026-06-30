"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { Slider } from "@techsio/ui-kit/molecules/slider"
import { useEffect, useState } from "react"
import {
  type AsideFilterChipItem,
  AsideFilterChipSection,
} from "@/components/aside-filter-chip-section"
import { formatWholeCurrencyAmount } from "@/lib/storefront/price-format"

type AsideFilterPriceBounds = {
  min: number
  max: number
}

type AsideFilterPriceRange = {
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
  bounds: AsideFilterPriceBounds | null
): AsideFilterPriceBounds | null => {
  if (!bounds) {
    return null
  }

  const min = Number.isFinite(bounds.min) ? bounds.min : 0
  const maxCandidate = Number.isFinite(bounds.max) ? bounds.max : min + 1
  const max = maxCandidate > min ? maxCandidate : min + 1

  return {
    min: Math.floor(min),
    max: Math.ceil(max),
  }
}

const resolveRangeFromSelection = (
  selectedRange: AsideFilterPriceRange,
  bounds: AsideFilterPriceBounds
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
  bounds: AsideFilterPriceBounds
): [number, number] =>
  resolveRangeFromSelection(
    {
      min: range[0],
      max: range[1],
    },
    bounds
  )

const resolveBoundsForRender = (
  currentBounds: AsideFilterPriceBounds,
  incomingBounds: AsideFilterPriceBounds | null,
  hasActivePriceFilter: boolean
): AsideFilterPriceBounds => {
  if (!incomingBounds) {
    return currentBounds
  }

  if (!hasActivePriceFilter) {
    return incomingBounds
  }

  return {
    min: Math.min(currentBounds.min, incomingBounds.min),
    max: Math.max(currentBounds.max, incomingBounds.max),
  }
}

const areBoundsEqual = (
  left: AsideFilterPriceBounds,
  right: AsideFilterPriceBounds
) => left.min === right.min && left.max === right.max

const areRangesEqual = (left: [number, number], right: [number, number]) =>
  left[0] === right[0] && left[1] === right[1]

const normalizeCommittedRange = (
  nextRange: [number, number],
  bounds: AsideFilterPriceBounds
): AsideFilterPriceRange => {
  const rangeMin = clampNumber(nextRange[0], bounds.min, bounds.max)
  const rangeMax = clampNumber(nextRange[1], bounds.min, bounds.max)
  const normalizedMin = rangeMin <= bounds.min ? undefined : rangeMin
  const normalizedMax = rangeMax >= bounds.max ? undefined : rangeMax

  return {
    min: normalizedMin,
    max: normalizedMax,
  }
}

type AsideFilterProps = {
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

export function AsideFilter({
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
}: AsideFilterProps) {
  const incomingPriceBounds = toSafeBounds(priceBounds)
  const hasActivePriceFilter =
    typeof selectedPriceRange.min === "number" ||
    typeof selectedPriceRange.max === "number"
  const [priceBoundsForRender, setPriceBoundsForRender] =
    useState<AsideFilterPriceBounds>(
      incomingPriceBounds ?? {
        min: 0,
        max: 1,
      }
    )

  useEffect(() => {
    setPriceBoundsForRender((currentBounds) => {
      const nextBounds = resolveBoundsForRender(
        currentBounds,
        incomingPriceBounds,
        hasActivePriceFilter
      )

      return areBoundsEqual(currentBounds, nextBounds)
        ? currentBounds
        : nextBounds
    })
  }, [hasActivePriceFilter, incomingPriceBounds])

  const selectedRange = resolveRangeFromSelection(
    selectedPriceRange,
    priceBoundsForRender
  )

  const [sliderRange, setSliderRange] =
    useState<[number, number]>(selectedRange)
  const sliderRangeForRender = resolveRangeWithinBounds(
    sliderRange,
    priceBoundsForRender
  )

  useEffect(() => {
    setSliderRange((currentRange) =>
      areRangesEqual(currentRange, selectedRange)
        ? currentRange
        : selectedRange
    )
  }, [selectedRange])

  return (
    <aside className="overflow-hidden rounded-2xl border border-border-secondary bg-surface text-fg-primary">
      <div className="scrollbar-primary space-y-400 p-400 xl:max-h-[calc(100dvh-var(--spacing-400))] xl:space-y-500 xl:overflow-y-auto xl:overscroll-contain xl:p-500">
        <section className="space-y-300">
          <h2 className="font-bold text-2xl uppercase leading-none">Cena</h2>
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

              setSliderRange(
                resolveRangeWithinBounds(
                  [Math.round(values[0]), Math.round(values[1])],
                  priceBoundsForRender
                )
              )
            }}
            onChangeEnd={(values) => {
              if (values[0] === undefined || values[1] === undefined) {
                return
              }

              const nextRange = resolveRangeWithinBounds(
                [Math.round(values[0]), Math.round(values[1])],
                priceBoundsForRender
              )
              onPriceRangeCommit(
                normalizeCommittedRange(nextRange, priceBoundsForRender)
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
            emptyMessage="Formy sa načítavajú."
            isLoading={isLoading}
            items={formItems}
            onToggle={onFormToggle}
            title="Forma"
          />
        </div>

        {showBrandFilter ? (
          <div>
            <AsideFilterChipSection
              collapseAfter={12}
              emptyMessage="Značky zatiaľ nie sú dostupné."
              isLoading={isLoading}
              items={brandItems}
              onToggle={onBrandToggle}
              title="Značka"
            />
          </div>
        ) : null}

        <div>
          <AsideFilterChipSection
            collapseAfter={12}
            emptyMessage="Aktívne látky sa načítavajú."
            isLoading={isLoading}
            items={ingredientItems}
            onToggle={onIngredientToggle}
            title="Aktívna látka"
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
            Vymazať filtre
          </Button>
        </div>
      </div>
    </aside>
  )
}

export type { AsideFilterPriceBounds, AsideFilterPriceRange }

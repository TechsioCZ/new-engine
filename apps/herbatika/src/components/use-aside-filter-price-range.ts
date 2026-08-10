import { useState } from "react"

import {
  normalizeCommittedRange,
  resolveBoundsForRender,
  resolveRangeFromSelection,
  resolveRangeWithinBounds,
  toSafePriceBounds,
} from "@/components/aside-filter-price-range"
import type {
  AsideFilterPriceBounds,
  AsideFilterPriceRange,
} from "@/components/aside-filter-price-range"

interface UseAsideFilterPriceRangeOptions {
  onCommit: (range: AsideFilterPriceRange) => void
  priceBounds: AsideFilterPriceBounds | null
  selectedRange: AsideFilterPriceRange
}

export const useAsideFilterPriceRange = ({
  onCommit,
  priceBounds,
  selectedRange,
}: UseAsideFilterPriceRangeOptions) => {
  const incomingBounds = toSafePriceBounds(priceBounds)
  const hasActiveFilter =
    typeof selectedRange.min === "number" ||
    typeof selectedRange.max === "number"
  const initialBounds = incomingBounds ?? { max: 1, min: 0 }
  const [boundsState, setBoundsState] = useState(() => ({
    hasActiveFilter,
    incomingMax: incomingBounds?.max,
    incomingMin: incomingBounds?.min,
    value: initialBounds,
  }))
  const boundsChanged =
    boundsState.hasActiveFilter !== hasActiveFilter ||
    boundsState.incomingMax !== incomingBounds?.max ||
    boundsState.incomingMin !== incomingBounds?.min
  const bounds = boundsChanged
    ? resolveBoundsForRender(boundsState.value, incomingBounds, hasActiveFilter)
    : boundsState.value

  if (boundsChanged) {
    setBoundsState({
      hasActiveFilter,
      incomingMax: incomingBounds?.max,
      incomingMin: incomingBounds?.min,
      value: bounds,
    })
  }

  const selectedMin = selectedRange.min
  const selectedMax = selectedRange.max
  const [sliderState, setSliderState] = useState(() => ({
    boundsMax: bounds.max,
    boundsMin: bounds.min,
    selectedMax,
    selectedMin,
    value: resolveRangeFromSelection(selectedRange, bounds),
  }))
  const sliderSourceChanged =
    sliderState.boundsMax !== bounds.max ||
    sliderState.boundsMin !== bounds.min ||
    sliderState.selectedMax !== selectedMax ||
    sliderState.selectedMin !== selectedMin
  const sliderRange = sliderSourceChanged
    ? resolveRangeFromSelection(selectedRange, bounds)
    : sliderState.value
  const range = resolveRangeWithinBounds(sliderRange, bounds)

  if (sliderSourceChanged) {
    setSliderState({
      boundsMax: bounds.max,
      boundsMin: bounds.min,
      selectedMax,
      selectedMin,
      value: range,
    })
  }

  const handleChange = (values: number[]) => {
    if (values[0] === undefined || values[1] === undefined) {
      return
    }

    setSliderState({
      boundsMax: bounds.max,
      boundsMin: bounds.min,
      selectedMax,
      selectedMin,
      value: resolveRangeWithinBounds(
        [Math.round(values[0]), Math.round(values[1])],
        bounds,
      ),
    })
  }

  const handleChangeEnd = (values: number[]) => {
    if (values[0] === undefined || values[1] === undefined) {
      return
    }

    const nextRange = resolveRangeWithinBounds(
      [Math.round(values[0]), Math.round(values[1])],
      bounds,
    )
    onCommit(normalizeCommittedRange(nextRange, bounds))
  }

  return {
    bounds,
    handleChange,
    handleChangeEnd,
    range,
  }
}

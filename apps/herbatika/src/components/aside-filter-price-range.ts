import { clamp } from "@techsio/std/number"

export interface AsideFilterPriceBounds {
  min: number
  max: number
}

export interface AsideFilterPriceRange {
  min?: number
  max?: number
}

const clampFiniteNumber = (value: number, min: number, max: number) =>
  Number.isFinite(value) ? clamp(value, min, max) : min

export const toSafePriceBounds = (
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

export const resolveRangeFromSelection = (
  selectedRange: AsideFilterPriceRange,
  bounds: AsideFilterPriceBounds,
): [number, number] => {
  const selectedMin =
    typeof selectedRange.min === "number"
      ? clampFiniteNumber(selectedRange.min, bounds.min, bounds.max)
      : bounds.min
  const selectedMax =
    typeof selectedRange.max === "number"
      ? clampFiniteNumber(selectedRange.max, bounds.min, bounds.max)
      : bounds.max

  if (selectedMin <= selectedMax) {
    return [selectedMin, selectedMax]
  }

  return [selectedMax, selectedMin]
}

export const resolveRangeWithinBounds = (
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

export const resolveBoundsForRender = (
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

export const normalizeCommittedRange = (
  nextRange: [number, number],
  bounds: AsideFilterPriceBounds,
): AsideFilterPriceRange => {
  const rangeMin = clampFiniteNumber(nextRange[0], bounds.min, bounds.max)
  const rangeMax = clampFiniteNumber(nextRange[1], bounds.min, bounds.max)
  const normalizedMin = rangeMin <= bounds.min ? undefined : rangeMin
  const normalizedMax = rangeMax >= bounds.max ? undefined : rangeMax

  return {
    ...(normalizedMin === undefined ? {} : { min: normalizedMin }),
    ...(normalizedMax === undefined ? {} : { max: normalizedMax }),
  }
}

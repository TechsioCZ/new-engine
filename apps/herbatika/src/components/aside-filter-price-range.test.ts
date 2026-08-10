import { describe, expect, it } from "vitest"

import {
  normalizeCommittedRange,
  resolveBoundsForRender,
  resolveRangeFromSelection,
  resolveRangeWithinBounds,
  toSafePriceBounds,
} from "./aside-filter-price-range"

const bounds = { max: 100, min: 10 }

describe(toSafePriceBounds, () => {
  it("normalizes finite bounds to whole values", () => {
    expect(toSafePriceBounds({ max: 99.1, min: 10.9 })).toStrictEqual({
      max: 100,
      min: 10,
    })
  })

  it("repairs invalid and reversed bounds", () => {
    expect(toSafePriceBounds({ max: 5, min: 10 })).toStrictEqual({
      max: 11,
      min: 10,
    })
    expect(
      toSafePriceBounds({ max: Number.NaN, min: Number.NaN }),
    ).toStrictEqual({
      max: 1,
      min: 0,
    })
  })
})

describe(resolveRangeFromSelection, () => {
  it("uses bounds for omitted selections", () => {
    expect(resolveRangeFromSelection({}, bounds)).toStrictEqual([10, 100])
  })

  it("clamps and orders selected values", () => {
    expect(
      resolveRangeFromSelection({ max: 5, min: 120 }, bounds),
    ).toStrictEqual([10, 100])
    expect(
      resolveRangeFromSelection({ max: Number.POSITIVE_INFINITY }, bounds),
    ).toStrictEqual([10, 10])
  })
})

describe(resolveRangeWithinBounds, () => {
  it("clamps and orders slider values", () => {
    expect(resolveRangeWithinBounds([120, 5], bounds)).toStrictEqual([10, 100])
  })
})

describe(resolveBoundsForRender, () => {
  it("accepts new bounds when no price filter is active", () => {
    expect(
      resolveBoundsForRender(bounds, { max: 80, min: 20 }, false),
    ).toStrictEqual({ max: 80, min: 20 })
  })

  it("retains selected bounds while a price filter is active", () => {
    expect(
      resolveBoundsForRender(bounds, { max: 80, min: 20 }, true),
    ).toStrictEqual(bounds)
    expect(
      resolveBoundsForRender(bounds, { max: 120, min: 5 }, true),
    ).toStrictEqual({
      max: 120,
      min: 5,
    })
  })
})

describe(normalizeCommittedRange, () => {
  it("omits range edges so URL state only stores active limits", () => {
    expect(normalizeCommittedRange([10, 100], bounds)).toStrictEqual({})
    expect(normalizeCommittedRange([25, 75], bounds)).toStrictEqual({
      max: 75,
      min: 25,
    })
    expect(normalizeCommittedRange([25, 100], bounds)).toStrictEqual({
      min: 25,
    })
  })
})

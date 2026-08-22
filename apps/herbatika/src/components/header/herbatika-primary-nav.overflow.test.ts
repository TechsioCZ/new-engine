import { describe, expect, it } from "vitest"

import { resolvePrimaryNavVisibleCount } from "./herbatika-primary-nav.overflow"

describe("resolvePrimaryNavVisibleCount", () => {
  it("keeps every item visible when the row fits", () => {
    expect(
      resolvePrimaryNavVisibleCount({
        availableWidth: 600,
        gap: 0,
        itemWidths: [100, 100, 100],
        triggerWidth: 48,
      })
    ).toBe(3)
  })

  it("tolerates sub-pixel rounding on an exact fit", () => {
    expect(
      resolvePrimaryNavVisibleCount({
        availableWidth: 299.7,
        gap: 0,
        itemWidths: [100, 100, 100],
        triggerWidth: 48,
      })
    ).toBe(3)
  })

  it("reserves room for the overflow trigger once items no longer fit", () => {
    expect(
      resolvePrimaryNavVisibleCount({
        availableWidth: 260,
        gap: 0,
        itemWidths: [100, 100, 100],
        triggerWidth: 48,
      })
    ).toBe(2)
  })

  it("accounts for the gap between items and before the trigger", () => {
    expect(
      resolvePrimaryNavVisibleCount({
        availableWidth: 260,
        gap: 10,
        itemWidths: [100, 100, 100],
        triggerWidth: 48,
      })
    ).toBe(1)
  })

  it("moves everything into the overflow menu when nothing fits", () => {
    expect(
      resolvePrimaryNavVisibleCount({
        availableWidth: 120,
        gap: 0,
        itemWidths: [200, 200],
        triggerWidth: 48,
      })
    ).toBe(0)
  })

  it("returns zero while the nav is unmeasured or hidden", () => {
    expect(
      resolvePrimaryNavVisibleCount({
        availableWidth: 0,
        gap: 0,
        itemWidths: [100, 100],
        triggerWidth: 48,
      })
    ).toBe(0)
  })

  it("returns zero when there are no nav items", () => {
    expect(
      resolvePrimaryNavVisibleCount({
        availableWidth: 800,
        gap: 0,
        itemWidths: [],
        triggerWidth: 48,
      })
    ).toBe(0)
  })
})

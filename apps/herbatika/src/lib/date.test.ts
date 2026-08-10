import { describe, expect, it } from "vitest"

import { addBusinessDays } from "./date"

describe("date utilities", () => {
  it("skips weekends when adding business days", () => {
    const friday = new Date(2026, 6, 17)

    expect(addBusinessDays(friday, 3)).toStrictEqual(new Date(2026, 6, 22))
    expect(friday).toStrictEqual(new Date(2026, 6, 17))
  })
})

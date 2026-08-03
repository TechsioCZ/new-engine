import { describe, expect, it } from "vitest"

import { addBusinessDays, formatSkDate } from "./date"

describe("date utilities", () => {
  it("skips weekends when adding business days", () => {
    const friday = new Date(2026, 6, 17)

    expect(addBusinessDays(friday, 3)).toEqual(new Date(2026, 6, 22))
    expect(friday).toEqual(new Date(2026, 6, 17))
  })

  it("formats Slovak calendar dates", () => {
    expect(formatSkDate(new Date(2026, 6, 5))).toBe("05.07.2026")
  })
})

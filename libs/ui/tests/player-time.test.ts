import { describe, expect, it } from "vitest"
import { formatPlayerTime } from "../src/internal/player-time"

describe("spoken player time", () => {
  it("uses English when no locale is supplied", () => {
    expect(formatPlayerTime(0)).toBe("0 seconds")
    expect(formatPlayerTime(1)).toBe("1 second")
    expect(formatPlayerTime(5)).toBe("5 seconds")
  })

  it("decomposes elapsed time into nonzero hours, minutes and seconds", () => {
    expect(formatPlayerTime(60, "en")).toBe("1 minute")
    expect(formatPlayerTime(3600, "en")).toBe("1 hour")
    expect(formatPlayerTime(3725, "en")).toBe("1 hour, 2 minutes, 5 seconds")
    expect(formatPlayerTime(7201, "en")).toBe("2 hours, 1 second")
  })

  it("uses Czech unit plurals", () => {
    expect(formatPlayerTime(0, "cs")).toBe("0 sekund")
    expect(formatPlayerTime(1, "cs")).toBe("1 sekunda")
    expect(formatPlayerTime(2, "cs")).toBe("2 sekundy")
    expect(formatPlayerTime(5, "cs")).toBe("5 sekund")
    expect(formatPlayerTime(120, "cs")).toBe("2 minuty")
    expect(formatPlayerTime(18_000, "cs")).toBe("5 hodin")
  })

  it("joins multiple Czech units as a localized list", () => {
    expect(formatPlayerTime(3725, "cs").replaceAll("\u00a0", " ")).toBe(
      "1 hodina, 2 minuty a 5 sekund"
    )
  })

  it("uses completed seconds and clamps invalid elapsed times to zero", () => {
    expect(formatPlayerTime(61.9, "en")).toBe("1 minute, 1 second")
    expect(formatPlayerTime(-5, "en")).toBe("0 seconds")
    for (const value of [
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ]) {
      expect(formatPlayerTime(value, "cs")).toBe("0 sekund")
    }
  })
})

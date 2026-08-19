import { describe, expect, it } from "vitest"
import { getCmsLocaleForMarket } from "./cms-locale"

describe("getCmsLocaleForMarket", () => {
  it.each([
    ["sk", "sk"],
    ["cz", "cs"],
    ["hu", "hu"],
    ["ro", "ro"],
  ] as const)("maps %s market to %s Payload locale", (market, locale) => {
    expect(getCmsLocaleForMarket(market)).toBe(locale)
  })
})

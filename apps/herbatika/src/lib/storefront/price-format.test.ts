import { describe, expect, it } from "vitest"
import { formatCurrencyAmount, formatWholeCurrencyAmount } from "./price-format"

const normalize = (value: string) => value.replace(/ | /g, " ")

describe("formatCurrencyAmount", () => {
  it.each([
    ["EUR", "1 234,50 €"],
    ["CZK", "1 234,50 Kč"],
    ["HUF", "1234,50 Ft"],
    ["RON", "1.234,50 lei"],
  ])("renders the %s market symbol, never the ISO code", (currency, expected) => {
    expect(normalize(formatCurrencyAmount(1234.5, currency))).toBe(expected)
  })

  it("renders Romanian amounts as lei rather than the RON ISO code", () => {
    const formatted = normalize(formatCurrencyAmount(249, "RON"))

    expect(formatted).toContain("lei")
    expect(formatted).not.toContain("RON")
  })

  it("keeps the Slovak default for unknown currency codes", () => {
    expect(normalize(formatCurrencyAmount(10, undefined))).toBe("10,00 €")
    expect(normalize(formatCurrencyAmount(10, "  eur "))).toBe("10,00 €")
  })

  it("falls back to a market symbol when Intl rejects the currency code", () => {
    expect(normalize(formatCurrencyAmount(10, "XX"))).toBe("10,00 €")
  })

  it("coerces non-finite amounts to zero", () => {
    expect(normalize(formatCurrencyAmount(Number.NaN, "RON"))).toBe("0,00 lei")
  })
})

describe("formatWholeCurrencyAmount", () => {
  it.each([
    ["EUR", "49 €"],
    ["CZK", "1 190 Kč"],
    ["HUF", "17 900 Ft"],
    ["RON", "249 lei"],
  ])("renders the %s free-shipping threshold without decimals", (currency, expected) => {
    const amounts: Record<string, number> = {
      EUR: 49,
      CZK: 1190,
      HUF: 17_900,
      RON: 249,
    }

    expect(
      normalize(formatWholeCurrencyAmount(amounts[currency], currency))
    ).toBe(expected)
  })
})

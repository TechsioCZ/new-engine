import { currencySymbolMap } from "../currency-symbol-map"
import { formatAmount } from "../format-amount"

describe("currency symbol map", () => {
  it("contains expected symbols for representative currencies", () => {
    expect(currencySymbolMap.usd).toBe("$")
    expect(currencySymbolMap.eur).toBe("€")
    expect(currencySymbolMap.czk).toBe("Kč")
    expect(currencySymbolMap.gbp).toBe("£")
  })
})

describe("formatAmount", () => {
  it("formats numeric amount as en-US currency", () => {
    expect(formatAmount(1234.5, "USD")).toBe("$1,234.50")
  })
})

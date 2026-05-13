import { describe, expect, it } from "vitest"
import {
  fromSmallestCurrencyUnit,
  fromStripeSmallestCurrencyUnit,
  getCurrencyMultiplier,
  getStripeCurrencyMultiplier,
  toSmallestCurrencyUnit,
  toStripeSmallestCurrencyUnit,
} from "../utils/amounts"

describe("PayKit amount helpers", () => {
  it("uses minor units for regular two-decimal currencies", () => {
    expect(getCurrencyMultiplier("czk")).toBe(100)
    expect(toSmallestCurrencyUnit(10.5, "czk")).toBe(1050)
    expect(fromSmallestCurrencyUnit(1050, "czk")).toBe(10.5)
  })

  it("uses major units for zero-decimal currencies", () => {
    expect(getCurrencyMultiplier("jpy")).toBe(1)
    expect(toSmallestCurrencyUnit(500, "jpy")).toBe(500)
    expect(toSmallestCurrencyUnit(500.5, "jpy")).toBe(501)
    expect(fromSmallestCurrencyUnit(500, "jpy")).toBe(500)
  })

  it("rounds decimals safely after Medusa numeric normalization", () => {
    expect(toSmallestCurrencyUnit(10.075, "czk")).toBe(1008)
    expect(toSmallestCurrencyUnit(1.005, "eur")).toBe(101)
    expect(toSmallestCurrencyUnit(0.29, "usd")).toBe(29)
  })

  it("matches Stripe three-decimal currency handling", () => {
    expect(getStripeCurrencyMultiplier("bhd")).toBe(1000)
    expect(toStripeSmallestCurrencyUnit(10.12, "bhd")).toBe(10_120)
    expect(toStripeSmallestCurrencyUnit(10.121, "bhd")).toBe(10_130)
    expect(toStripeSmallestCurrencyUnit(10.123, "bhd")).toBe(10_130)
    expect(fromStripeSmallestCurrencyUnit(10_130, "bhd")).toBe(10.13)
  })

  it("keeps Stripe UGX on two-decimal API representation", () => {
    expect(getCurrencyMultiplier("ugx")).toBe(1)
    expect(getStripeCurrencyMultiplier("ugx")).toBe(100)
    expect(toStripeSmallestCurrencyUnit(5, "ugx")).toBe(500)
    expect(fromStripeSmallestCurrencyUnit(500, "ugx")).toBe(5)
  })

  it("keeps Stripe zero-decimal currencies on major-unit representation", () => {
    expect(getStripeCurrencyMultiplier("jpy")).toBe(1)
    expect(toStripeSmallestCurrencyUnit(500, "jpy")).toBe(500)
    expect(fromStripeSmallestCurrencyUnit(500, "jpy")).toBe(500)
  })
})

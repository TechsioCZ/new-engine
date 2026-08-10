import { BigNumber, MedusaError } from "@medusajs/framework/utils"
import { describe, expect, it } from "vitest"

import {
  fromSmallestCurrencyUnit,
  fromStripeSmallestCurrencyUnit,
  getCurrencyMultiplier,
  getStripeCurrencyMultiplier,
  toNumericPaymentAmount,
  toSmallestCurrencyUnit,
  toStripeSmallestCurrencyUnit,
} from "../utils/amounts"

const captureMedusaError = (operation: () => unknown): MedusaError => {
  try {
    operation()
  } catch (error) {
    if (error instanceof MedusaError) {
      return error
    }

    throw error
  }

  throw new Error("Expected operation to throw a MedusaError")
}

describe("PayKit amount helpers", () => {
  it("coerces Medusa BigNumber instances without an own value property", () => {
    const amount = new BigNumber("125.5")

    expect(Object.hasOwn(amount, "value")).toBeFalsy()
    expect(
      toNumericPaymentAmount(amount, "PayKit payment amount must be numeric"),
    ).toBe(125.5)
  })

  it("coerces the whole amount object when it provides valueOf", () => {
    const amount = { valueOf: () => 42.25 }

    expect(
      toNumericPaymentAmount(amount, "PayKit payment amount must be numeric"),
    ).toBe(42.25)
  })

  it("prefers an own value property over whole-object coercion", () => {
    const amount = {
      value: "18.75",
      valueOf: () => 99,
    }

    expect(
      toNumericPaymentAmount(amount, "PayKit payment amount must be numeric"),
    ).toBe(18.75)
  })

  it.each([
    { amount: {}, label: "an object missing value and numeric coercion" },
    {
      amount: Object.defineProperty({}, "value", {}),
      label: "an own value without data",
    },
    { amount: { value: "invalid" }, label: "a non-numeric own value" },
    { amount: Symbol("invalid"), label: "a coercion error" },
  ])("rejects $label with stable invalid-data errors", ({ amount }) => {
    const normalize = () =>
      toNumericPaymentAmount(
        amount,
        "PayKit stored payment amount must be numeric",
      )

    expect(captureMedusaError(normalize)).toMatchObject({
      message: "PayKit stored payment amount must be numeric",
      type: MedusaError.Types.INVALID_DATA,
    })
  })

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

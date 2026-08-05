import type { StoreProductVariantWithPricePerUnit } from "@techsio/storefront-data/products/types"
import { describe, expect, it } from "vitest"

import { formatUnitPriceLabel, resolveVariantPricePerUnit } from "./unit-price"

describe(formatUnitPriceLabel, () => {
  it("formats the calculated unit price and reference quantity", () => {
    expect(
      formatUnitPriceLabel({
        calculated_amount: 13.453333,
        currency_code: "eur",
        product_unit_quantity: 75,
        unit_base_quantity: 100,
        unit_code: "ml",
        unit_id: "unit_ml",
        unit_name: "millilitre",
        unit_symbol: "ml",
      })
    ).toBe("13,45 € / 100 ml")
  })

  it("localizes decimal reference quantities", () => {
    expect(
      formatUnitPriceLabel({
        calculated_amount: 4.5,
        currency_code: "eur",
        product_unit_quantity: 0.25,
        unit_base_quantity: 0.5,
        unit_code: "kg",
        unit_id: "unit_kg",
        unit_name: "kilogram",
        unit_symbol: "kg",
      })
    ).toBe("4,50 € / 0,5 kg")
  })

  it.each([
    null,
    {
      currency_code: "eur",
      product_unit_quantity: 75,
      unit_base_quantity: 100,
      unit_code: "ml",
      unit_id: "unit_ml",
      unit_name: "millilitre",
      unit_symbol: "ml",
    },
    {
      calculated_amount: 13.45,
      currency_code: "eur",
      product_unit_quantity: 75,
      unit_base_quantity: 0,
      unit_code: "ml",
      unit_id: "unit_ml",
      unit_name: "millilitre",
      unit_symbol: "ml",
    },
    {
      calculated_amount: 13.45,
      currency_code: "eur",
      product_unit_quantity: 75,
      unit_base_quantity: 100,
      unit_code: "ml",
      unit_id: "unit_ml",
      unit_name: "millilitre",
      unit_symbol: " ",
    },
  ])("does not render incomplete unit-price data", (pricePerUnit) => {
    expect(formatUnitPriceLabel(pricePerUnit)).toBeNull()
  })
})

describe(resolveVariantPricePerUnit, () => {
  it("reads price_per_unit from the selected variant calculation", () => {
    const pricePerUnit = {
      calculated_amount: 13.45,
      currency_code: "eur",
      product_unit_quantity: 75,
      unit_base_quantity: 100,
      unit_code: "ml",
      unit_id: "unit_ml",
      unit_name: "millilitre",
      unit_symbol: "ml",
    }
    const variant = {
      calculated_price: { price_per_unit: pricePerUnit },
    } as StoreProductVariantWithPricePerUnit

    expect(
      resolveVariantPricePerUnit(variant, {
        currencyCode: "EUR",
        source: "calculated_price",
      })
    ).toBe(pricePerUnit)
  })

  it("returns null when the backend did not decorate the price", () => {
    expect(
      resolveVariantPricePerUnit(undefined, {
        currencyCode: "EUR",
        source: "calculated_price",
      })
    ).toBeNull()
  })

  it("returns null when the displayed price comes from the top offer", () => {
    const variant = {
      calculated_price: {
        price_per_unit: {
          calculated_amount: 13.45,
          currency_code: "eur",
          product_unit_quantity: 75,
          unit_base_quantity: 100,
          unit_code: "ml",
          unit_id: "unit_ml",
          unit_name: "millilitre",
          unit_symbol: "ml",
        },
      },
    } as StoreProductVariantWithPricePerUnit

    expect(
      resolveVariantPricePerUnit(variant, {
        currencyCode: "EUR",
        source: "top_offer",
      })
    ).toBeNull()
  })

  it("returns null when the unit price currency differs from the displayed price", () => {
    const variant = {
      calculated_price: {
        price_per_unit: {
          calculated_amount: 13.45,
          currency_code: "czk",
          product_unit_quantity: 75,
          unit_base_quantity: 100,
          unit_code: "ml",
          unit_id: "unit_ml",
          unit_name: "millilitre",
          unit_symbol: "ml",
        },
      },
    } as StoreProductVariantWithPricePerUnit

    expect(
      resolveVariantPricePerUnit(variant, {
        currencyCode: "EUR",
        source: "calculated_price",
      })
    ).toBeNull()
  })
})

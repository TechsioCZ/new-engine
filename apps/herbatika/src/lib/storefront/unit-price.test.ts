import type { StoreProductVariantWithPricePerUnit } from "@techsio/storefront-data/products/types"
import { describe, expect, it } from "vitest"
import { formatUnitPriceLabel, resolveVariantPricePerUnit } from "./unit-price"

describe("formatUnitPriceLabel", () => {
  it("formats the calculated unit price and reference quantity", () => {
    expect(
      formatUnitPriceLabel(
        {
          calculated_amount: 13.453_333,
          currency_code: "eur",
          product_unit_quantity: 75,
          unit_base_quantity: 100,
          unit_code: "ml",
          unit_id: "unit_ml",
          unit_name: "millilitre",
          unit_symbol: "ml",
        },
        "sk-SK"
      )
    ).toBe("13,45 € / 100 ml")
  })

  it("localizes decimal reference quantities", () => {
    expect(
      formatUnitPriceLabel(
        {
          calculated_amount: 4.5,
          currency_code: "eur",
          product_unit_quantity: 0.25,
          unit_base_quantity: 0.5,
          unit_code: "kg",
          unit_id: "unit_kg",
          unit_name: "kilogram",
          unit_symbol: "kg",
        },
        "sk-SK"
      )
    ).toBe("4,50 € / 0,5 kg")
  })

  it("formats the reference quantity using the storefront locale", () => {
    expect(
      formatUnitPriceLabel(
        {
          calculated_amount: 4.5,
          currency_code: "eur",
          product_unit_quantity: 2500,
          unit_base_quantity: 1234.5,
          unit_code: "pcs_1234_5",
          unit_id: "unit_pcs",
          unit_name: "bucată",
          unit_symbol: "buc.",
        },
        "ro-RO"
      )
    ).toBe("4,50 € / 1.234,5 buc.")
  })

  it.each([
    null,
    {
      calculated_amount: undefined,
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
    expect(formatUnitPriceLabel(pricePerUnit, "sk-SK")).toBeNull()
  })
})

describe("resolveVariantPricePerUnit", () => {
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

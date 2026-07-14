import { describe, expect, it } from "vitest"

import {
  getArrayField,
  getRegionCountryCodes,
  getStringField,
  isProductRule,
  isRegionCountry,
  isTaxRateRule,
  resolveEffectiveRate,
  toNumber,
  toRegionWithCountries,
  toSalesRegionProduct,
} from "../../../../../../src/api/admin/products/[id]/sales-regions/utils"

describe("product sales regions route utils", () => {
  it("converts finite numbers and numeric strings", () => {
    expect(toNumber(20)).toBe(20)
    expect(toNumber("19.5")).toBe(19.5)
    expect(toNumber(Number.NaN)).toBeUndefined()
    expect(toNumber("invalid")).toBeUndefined()
  })

  it("identifies rules for the requested product", () => {
    const rule = {
      reference: "product",
      reference_id: "prod_1",
      tax_rate_id: "txrate_1",
    }

    expect(isProductRule(rule, "prod_1")).toBe(true)
    expect(isProductRule(rule, "prod_2")).toBe(false)
  })

  it("prefers a product-specific rate", () => {
    const rulesByRateId = new Map([
      [
        "txrate_product",
        [
          {
            reference: "product",
            reference_id: "prod_1",
            tax_rate_id: "txrate_product",
          },
        ],
      ],
    ])

    expect(
      resolveEffectiveRate(
        [
          { id: "txrate_fallback", rate: 10 },
          { id: "txrate_default", is_default: true, rate: 20 },
          { id: "txrate_product", rate: 30 },
        ],
        rulesByRateId,
        "prod_1"
      )
    ).toMatchObject({ rate: 30, taxRate: { id: "txrate_product" } })
  })

  it("prefers a default rate when there is no product-specific rate", () => {
    const rulesByRateId = new Map([
      [
        "txrate_default",
        [
          {
            reference: "customer_group",
            reference_id: "cusgrp_1",
            tax_rate_id: "txrate_default",
          },
        ],
      ],
    ])

    expect(
      resolveEffectiveRate(
        [
          { id: "txrate_fallback", rate: 10 },
          { id: "txrate_default", is_default: true, rate: "20" },
        ],
        rulesByRateId,
        "prod_1"
      )
    ).toMatchObject({ rate: 20, taxRate: { id: "txrate_default" } })
  })

  it("uses a ruleless rate as the fallback", () => {
    const rulesByRateId = new Map([
      [
        "txrate_ruled",
        [
          {
            reference: "customer_group",
            reference_id: "cusgrp_1",
            tax_rate_id: "txrate_ruled",
          },
        ],
      ],
    ])

    expect(
      resolveEffectiveRate(
        [
          { id: "txrate_ruled", rate: 20 },
          { id: "txrate_fallback", rate: 10 },
        ],
        rulesByRateId,
        "prod_1"
      )
    ).toMatchObject({ rate: 10, taxRate: { id: "txrate_fallback" } })
  })

  it("returns undefined when the selected rate is not numeric", () => {
    expect(
      resolveEffectiveRate(
        [{ id: "txrate_invalid", rate: "invalid" }],
        new Map(),
        "prod_1"
      )
    ).toBeUndefined()
  })

  it("reads only string and array fields from objects", () => {
    const value = { items: ["one"], name: "Region", number: 1 }

    expect(getStringField(value, "name")).toBe("Region")
    expect(getStringField(value, "number")).toBeUndefined()
    expect(getStringField([], "name")).toBeUndefined()
    expect(getArrayField(value, "items")).toEqual(["one"])
    expect(getArrayField(value, "name")).toEqual([])
  })

  it("validates tax-rate rules and two-letter region countries", () => {
    expect(
      isTaxRateRule({
        reference: "product",
        reference_id: "prod_1",
        tax_rate_id: "txrate_1",
      })
    ).toBe(true)
    expect(
      isTaxRateRule({ reference: "product", reference_id: "prod_1" })
    ).toBe(false)
    expect(isRegionCountry({ iso_2: " CZ " })).toBe(true)
    expect(isRegionCountry({ iso_2: "CZE" })).toBe(false)
  })

  it("keeps only valid countries when converting a region", () => {
    expect(
      toRegionWithCountries({
        countries: [{ iso_2: "CZ" }, { iso_2: "CZE" }, null],
      })
    ).toEqual({ countries: [{ iso_2: "CZ" }] })
  })

  it("converts products and drops sales channels without IDs", () => {
    expect(
      toSalesRegionProduct({
        id: "prod_1",
        sales_channels: [{ id: "sc_1", name: "Web" }, { name: "Missing ID" }],
      })
    ).toEqual({
      id: "prod_1",
      sales_channels: [{ id: "sc_1", name: "Web" }],
    })
    expect(toSalesRegionProduct({ sales_channels: [] })).toBeUndefined()
  })

  it("normalizes and deduplicates region country codes", () => {
    expect(
      getRegionCountryCodes([
        { countries: [{ iso_2: "CZ" }, { iso_2: "sk" }] },
        { countries: [{ iso_2: " cz " }, { iso_2: "CZE" }] },
      ])
    ).toEqual(["cz", "sk"])
  })
})

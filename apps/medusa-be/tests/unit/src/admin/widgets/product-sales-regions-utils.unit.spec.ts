import { describe, expect, it } from "vitest"

import {
  formatPercent,
  getCountriesByCode,
  getCountryName,
  getSalesRegionRows,
  sortSalesRegionRows,
} from "../../../../../src/admin/utils/product-sales-regions"

describe("product sales regions widget utils", () => {
  it("formats integer and fractional percentages", () => {
    expect(formatPercent(20, "en-US")).toBe("20%")
    expect(formatPercent(19.5, "en-US")).toBe("19.50%")
  })

  it("prefers explicit country names and falls back to country codes", () => {
    expect(
      getCountryName({ display_name: "Česko", name: "Czechia" }, "cz", "en")
    ).toBe("Česko")
    expect(getCountryName(undefined, "zz", "invalid_locale")).toBe("ZZ")
  })

  it("indexes only valid iso_2 codes and preserves last-write insertion", () => {
    const firstCzechia = { iso_2: "CZ", display_name: "First" }
    const secondCzechia = { iso_2: "cz", display_name: "Second" }
    const iso3Only = { iso_3: "SVK", display_name: "Slovakia" }
    const countries = getCountriesByCode([
      {
        countries: [firstCzechia, iso3Only],
        id: "reg_1",
        name: "First region",
      },
      {
        countries: [secondCzechia],
        id: "reg_2",
        name: "Second region",
      },
    ])

    expect([...countries.keys()]).toEqual(["cz"])
    expect(countries.get("cz")).toBe(secondCzechia)
  })

  it("sorts Slovakia and Czechia before countries ordered by name", () => {
    const rows = [
      { country_code: "de", countryName: "Germany" },
      { country_code: "cz", countryName: "Czechia" },
      { country_code: "at", countryName: "Austria" },
      { country_code: "sk", countryName: "Slovakia" },
    ]

    expect(
      rows.sort(sortSalesRegionRows).map((row) => row.country_code)
    ).toEqual(["sk", "cz", "at", "de"])
  })

  it("builds named rows and filters countries absent from region data", () => {
    const rows = getSalesRegionRows(
      {
        country_rates: [
          { country_code: "de", rate: 19, tax_region_id: "txreg_de" },
          { country_code: "cz", rate: 21, tax_region_id: "txreg_cz" },
          { country_code: "sk", rate: 20, tax_region_id: "txreg_sk" },
        ],
        product: { id: "prod_1", sales_channels: [] },
      },
      new Map([
        ["cz", { display_name: "Czechia", iso_2: "cz" }],
        ["sk", { display_name: "Slovakia", iso_2: "sk" }],
      ]),
      "en"
    )

    expect(
      rows.map(({ country_code, countryName }) => ({
        country_code,
        countryName,
      }))
    ).toEqual([
      { country_code: "sk", countryName: "Slovakia" },
      { country_code: "cz", countryName: "Czechia" },
    ])
  })
})

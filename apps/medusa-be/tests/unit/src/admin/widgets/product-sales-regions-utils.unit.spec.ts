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
    const firstCzechia = { display_name: "First", iso_2: "CZ" }
    const secondCzechia = { display_name: "Second", iso_2: "cz" }
    const iso3Only = { display_name: "Slovakia", iso_3: "SVK" }
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

    expect([...countries.keys()]).toStrictEqual(["cz"])
    expect(countries.get("cz")).toBe(secondCzechia)
  })

  it("sorts Slovakia and Czechia before countries ordered by name", () => {
    const rows = [
      { countryName: "Germany", country_code: "de" },
      { countryName: "Czechia", country_code: "cz" },
      { countryName: "Austria", country_code: "at" },
      { countryName: "Slovakia", country_code: "sk" },
    ]

    expect(
      rows.sort(sortSalesRegionRows).map((row) => row.country_code)
    ).toStrictEqual(["sk", "cz", "at", "de"])
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
        countryName,
        country_code,
      }))
    ).toStrictEqual([
      { countryName: "Slovakia", country_code: "sk" },
      { countryName: "Czechia", country_code: "cz" },
    ])
  })
})

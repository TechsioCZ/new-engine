import { describe, expect, it } from "vitest"
import {
  buildHerbaticaShippingOptions,
  HERBATICA_COUNTRIES,
  HERBATICA_CURRENCIES,
  HERBATICA_DEFAULT_REGIONS,
  HERBATICA_DEFAULT_TAX_RATES,
  HERBATICA_PUBLISHABLE_KEYS,
  HERBATICA_SALES_CHANNELS,
  HERBATICA_SHIPPING_PRICE_AMOUNTS_ENV,
  parseHerbaticaShippingPriceAmounts,
} from "../../../../src/scripts/herbatica-seed-config"

describe("Herbatica four-market seed config", () => {
  it("defines four isolated market sales channels and publishable-key identities", () => {
    expect(
      HERBATICA_SALES_CHANNELS.map(
        ({ name, default: isDefault, metadata }) => ({
          name,
          default: isDefault,
          market: metadata?.herbatica_market,
          notificationMarkets: Object.keys(
            metadata?.storefront_notification_markets ?? {}
          ),
        })
      )
    ).toEqual([
      {
        name: "Herbatica Storefront SK",
        default: true,
        market: {
          country_code: "sk",
          currency_code: "eur",
          market_code: "sk",
          region_name: "Europe",
          seed_handle: "herbatica-storefront-sk",
        },
        notificationMarkets: ["sk"],
      },
      {
        name: "Herbatica Storefront CZ",
        default: false,
        market: {
          country_code: "cz",
          currency_code: "czk",
          market_code: "cz",
          region_name: "Czechia",
          seed_handle: "herbatica-storefront-cz",
        },
        notificationMarkets: ["cz"],
      },
      {
        name: "Herbatica Storefront HU",
        default: false,
        market: {
          country_code: "hu",
          currency_code: "huf",
          market_code: "hu",
          region_name: "Hungary",
          seed_handle: "herbatica-storefront-hu",
        },
        notificationMarkets: ["hu"],
      },
      {
        name: "Herbatica Storefront RO",
        default: false,
        market: {
          country_code: "ro",
          currency_code: "ron",
          market_code: "ro",
          region_name: "Romania",
          seed_handle: "herbatica-storefront-ro",
        },
        notificationMarkets: ["ro"],
      },
    ])
    expect(HERBATICA_PUBLISHABLE_KEYS).toEqual([
      {
        title: "Herbatica Storefront SK Publishable Key",
        salesChannelNames: ["Herbatica Storefront SK"],
      },
      {
        title: "Herbatica Storefront CZ Publishable Key",
        salesChannelNames: ["Herbatica Storefront CZ"],
      },
      {
        title: "Herbatica Storefront HU Publishable Key",
        salesChannelNames: ["Herbatica Storefront HU"],
      },
      {
        title: "Herbatica Storefront RO Publishable Key",
        salesChannelNames: ["Herbatica Storefront RO"],
      },
    ])
  })

  it("defines exact country, currency, region, and standard-tax authority for all four markets", () => {
    expect({
      countries: HERBATICA_COUNTRIES,
      currencies: HERBATICA_CURRENCIES,
      regions: HERBATICA_DEFAULT_REGIONS,
      taxRates: HERBATICA_DEFAULT_TAX_RATES,
    }).toEqual({
      countries: ["sk", "cz", "hu", "ro"],
      currencies: [
        { code: "eur", default: true },
        { code: "czk", default: false },
        { code: "huf", default: false },
        { code: "ron", default: false },
      ],
      regions: [
        {
          name: "Czechia",
          currencyCode: "czk",
          countries: ["cz"],
          paymentProviders: undefined,
          isTaxInclusive: true,
          marketCode: "cz",
          salesChannelName: "Herbatica Storefront CZ",
        },
        {
          name: "Europe",
          currencyCode: "eur",
          countries: ["sk"],
          paymentProviders: undefined,
          isTaxInclusive: true,
          marketCode: "sk",
          salesChannelName: "Herbatica Storefront SK",
        },
        {
          name: "Hungary",
          currencyCode: "huf",
          countries: ["hu"],
          paymentProviders: undefined,
          isTaxInclusive: true,
          marketCode: "hu",
          salesChannelName: "Herbatica Storefront HU",
        },
        {
          name: "Romania",
          currencyCode: "ron",
          countries: ["ro"],
          paymentProviders: undefined,
          isTaxInclusive: true,
          marketCode: "ro",
          salesChannelName: "Herbatica Storefront RO",
        },
      ],
      taxRates: [
        { countryCode: "sk", rate: 23 },
        { countryCode: "cz", rate: 21 },
        { countryCode: "hu", rate: 27 },
        { countryCode: "ro", rate: 21 },
      ],
    })
  })

  it("fails closed when the reviewed four-market shipping amounts are missing", () => {
    expect(() => parseHerbaticaShippingPriceAmounts(undefined)).toThrow(
      `${HERBATICA_SHIPPING_PRICE_AMOUNTS_ENV} is required`
    )
  })

  it("rejects shipping manifests with currencies outside the four-market contract", () => {
    expect(() =>
      parseHerbaticaShippingPriceAmounts(
        JSON.stringify({ eur: 1.25, czk: 2.5, huf: 3.75, ron: 4, usd: 5 })
      )
    ).toThrow("must contain exactly: eur, czk, huf, ron")
  })

  it.each([
    ["zero", { eur: 0, czk: 2.5, huf: 3.75, ron: 4 }],
    ["negative", { eur: 1.25, czk: -1, huf: 3.75, ron: 4 }],
    ["non-numeric", { eur: 1.25, czk: 2.5, huf: "3.75", ron: 4 }],
  ])("rejects %s shipping amounts", (_case, amounts) => {
    expect(() =>
      parseHerbaticaShippingPriceAmounts(JSON.stringify(amounts))
    ).toThrow("must be a finite positive number")
  })

  it("builds both stable shipping identities from the exact reviewed amounts", () => {
    const options = buildHerbaticaShippingOptions({
      eur: 1.25,
      czk: 2.5,
      huf: 3.75,
      ron: 4,
    })

    expect(
      options.map(({ name, type, prices }) => ({ name, type, prices }))
    ).toEqual([
      {
        name: "Standard Shipping",
        type: {
          label: "Standard",
          description: "Ship in 2-3 days.",
          code: "standard",
        },
        prices: [
          { currencyCode: "eur", amount: 1.25 },
          { currencyCode: "czk", amount: 2.5 },
          { currencyCode: "huf", amount: 3.75 },
          { currencyCode: "ron", amount: 4 },
        ],
      },
      {
        name: "Express Shipping",
        type: {
          label: "Express",
          description: "Ship in 24 hours.",
          code: "express",
        },
        prices: [
          { currencyCode: "eur", amount: 1.25 },
          { currencyCode: "czk", amount: 2.5 },
          { currencyCode: "huf", amount: 3.75 },
          { currencyCode: "ron", amount: 4 },
        ],
      },
    ])
  })
})

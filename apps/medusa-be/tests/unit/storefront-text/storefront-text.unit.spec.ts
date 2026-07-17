import { describe, expect, it, vi } from "vitest"
import { GET } from "../../../src/api/store/storefront-texts/route"
import {
  AdminGetStorefrontTextsSchema,
  AdminUpdateStorefrontTextSchema,
} from "../../../src/api/admin/storefront-texts/validators"
import {
  STOREFRONT_TEXT_DEFINITIONS,
  STOREFRONT_TEXT_MARKETS,
  getStorefrontTextSeedRows,
  isStorefrontTextMarketLocalePair,
} from "../../../src/modules/storefront-text/registry"
import { validateStorefrontTextOverride } from "../../../src/modules/storefront-text/message-validation"
import { getEffectiveStorefrontTextValue } from "../../../src/modules/storefront-text/value"

describe("storefront text registry", () => {
  it("accepts only configured market and locale pairs", () => {
    expect(isStorefrontTextMarketLocalePair("cz", "cs-CZ")).toBe(true)
    expect(isStorefrontTextMarketLocalePair("cz", "sk-SK")).toBe(false)
  })

  it("creates seed rows with a default and no override", () => {
    const seedRow = getStorefrontTextSeedRows()[0]

    expect(seedRow?.default_value).toBeTruthy()
    expect(seedRow?.override_value).toBeNull()
  })

  it("keeps definition keys unique and aligned with their namespace", () => {
    const keys = STOREFRONT_TEXT_DEFINITIONS.map((definition) => definition.key)
    const sortedKeys = [...keys].sort()

    expect(new Set(keys).size).toBe(keys.length)
    for (const definition of STOREFRONT_TEXT_DEFINITIONS) {
      expect(definition.key.startsWith(`${definition.namespace}.`)).toBe(true)
    }
    for (let index = 0; index < sortedKeys.length - 1; index += 1) {
      expect(sortedKeys[index + 1]?.startsWith(`${sortedKeys[index]}.`)).toBe(
        false
      )
    }
  })

  it("keeps every localized default ICU-compatible with its key contract", () => {
    for (const definition of STOREFRONT_TEXT_DEFINITIONS) {
      const defaultValue = definition.values.sk

      for (const market of STOREFRONT_TEXT_MARKETS) {
        expect(
          validateStorefrontTextOverride({
            defaultValue,
            locale: market.locale,
            overrideValue: definition.values[market.market],
          }),
          `${definition.key} (${market.market})`
        ).toEqual({ success: true })
      }
    }
  })

  it("creates localized search defaults for every market", () => {
    const searchPlaceholderRows = getStorefrontTextSeedRows().filter(
      (row) => row.key === "search.input_placeholder"
    )

    expect(
      Object.fromEntries(
        searchPlaceholderRows.map((row) => [row.market, row.default_value])
      )
    ).toEqual({
      cz: "Napište, co hledáte...",
      hu: "Írja be, mit keres...",
      ro: "Scrieți ce căutați...",
      sk: "Napíšte, čo hľadáte...",
    })
  })

  it("creates localized catalog defaults for every market", () => {
    const catalogSortRows = getStorefrontTextSeedRows().filter(
      (row) => row.key === "catalog.sort.recommended"
    )

    expect(
      Object.fromEntries(
        catalogSortRows.map((row) => [row.market, row.default_value])
      )
    ).toEqual({
      cz: "Doporučujeme",
      hu: "Ajánlott",
      ro: "Recomandate",
      sk: "Odporúčame",
    })
  })

  it("creates localized catalog facet defaults for every market", () => {
    const inStockRows = getStorefrontTextSeedRows().filter(
      (row) => row.key === "catalog.filters.status.in_stock"
    )

    expect(
      Object.fromEntries(
        inStockRows.map((row) => [row.market, row.default_value])
      )
    ).toEqual({
      cz: "Skladem",
      hu: "Raktáron",
      ro: "În stoc",
      sk: "Na sklade",
    })
  })

  it("creates localized pickup-selector defaults for every market", () => {
    const selectPickupPointRows = getStorefrontTextSeedRows().filter(
      (row) => row.key === "checkout.select_pickup_point"
    )

    expect(
      Object.fromEntries(
        selectPickupPointRows.map((row) => [row.market, row.default_value])
      )
    ).toEqual({
      cz: "Vybrat výdejní místo",
      hu: "Átvételi pont kiválasztása",
      ro: "Alege punctul de ridicare",
      sk: "Vybrať výdajné miesto",
    })
  })

  it("creates localized payment-return defaults for every market", () => {
    const verifyingPaymentRows = getStorefrontTextSeedRows().filter(
      (row) => row.key === "checkout.payment_return_verifying_title"
    )

    expect(
      Object.fromEntries(
        verifyingPaymentRows.map((row) => [row.market, row.default_value])
      )
    ).toEqual({
      cz: "Ověřujeme platbu",
      hu: "A fizetés ellenőrzése",
      ro: "Verificăm plata",
      sk: "Overujeme platbu",
    })
  })

  it("creates localized payment-provider defaults for every market", () => {
    const cardGatewayRows = getStorefrontTextSeedRows().filter(
      (row) => row.key === "checkout.payment_provider_card_gateway"
    )

    expect(
      Object.fromEntries(
        cardGatewayRows.map((row) => [row.market, row.default_value])
      )
    ).toEqual({
      cz: "Platba kartou online ({providerName})",
      hu: "Online bankkártyás fizetés ({providerName})",
      ro: "Plată online cu cardul ({providerName})",
      sk: "Platba kartou online ({providerName})",
    })
  })

  it("creates localized completed-order defaults for every market", () => {
    const completedOrderTitleRows = getStorefrontTextSeedRows().filter(
      (row) => row.key === "checkout.completed_order_title"
    )

    expect(
      Object.fromEntries(
        completedOrderTitleRows.map((row) => [row.market, row.default_value])
      )
    ).toEqual({
      cz: "Objednávka dokončena",
      hu: "Rendelés befejezve",
      ro: "Comandă finalizată",
      sk: "Objednávka dokončená",
    })
  })

  it("creates localized checkout-review defaults for every market", () => {
    const marketingConsentRows = getStorefrontTextSeedRows().filter(
      (row) => row.key === "checkout.review_marketing_consent"
    )

    expect(
      Object.fromEntries(
        marketingConsentRows.map((row) => [row.market, row.default_value])
      )
    ).toEqual({
      cz: "Souhlasím se zasíláním marketingových sdělení",
      hu: "Hozzájárulok marketinginformációk küldéséhez",
      ro: "Sunt de acord să primesc comunicări de marketing",
      sk: "Súhlasím so zasielaním marketingových informácií",
    })
  })

  it("creates localized navigation defaults for every market", () => {
    const homeRows = getStorefrontTextSeedRows().filter(
      (row) => row.key === "navigation.breadcrumbs.home"
    )

    expect(
      Object.fromEntries(
        homeRows.map((row) => [row.market, row.default_value])
      )
    ).toEqual({
      cz: "Domů",
      hu: "Főoldal",
      ro: "Acasă",
      sk: "Domov",
    })
  })

  it("creates localized search-result defaults for every market", () => {
    const searchResultRows = getStorefrontTextSeedRows().filter(
      (row) => row.key === "search.results.title"
    )

    expect(
      Object.fromEntries(
        searchResultRows.map((row) => [row.market, row.default_value])
      )
    ).toEqual({
      cz: "Vyhledávání",
      hu: "Keresés",
      ro: "Căutare",
      sk: "Vyhľadávanie",
    })
  })
})

describe("storefront text values", () => {
  it("uses an active override", () => {
    expect(
      getEffectiveStorefrontTextValue({
        default_value: "Default",
        override_value: "Override",
        status: "active",
      })
    ).toBe("Override")
  })

  it("uses the default when the override is absent or draft", () => {
    expect(
      getEffectiveStorefrontTextValue({
        default_value: "Default",
        override_value: null,
        status: "active",
      })
    ).toBe("Default")
    expect(
      getEffectiveStorefrontTextValue({
        default_value: "Default",
        override_value: "Draft override",
        status: "draft",
      })
    ).toBe("Default")
  })
})

describe("storefront text ICU validation", () => {
  const defaultValue =
    "{count, plural, =0 {Filtr} other {Filtr (#)}}"

  it("accepts a translated value with the same ICU contract", () => {
    expect(
      validateStorefrontTextOverride({
        defaultValue,
        locale: "hu-HU",
        overrideValue:
          "{count, plural, =0 {Szűrő} other {Szűrő (#)}}",
      })
    ).toEqual({ success: true })
  })

  it("rejects invalid ICU syntax", () => {
    expect(
      validateStorefrontTextOverride({
        defaultValue,
        locale: "cs-CZ",
        overrideValue: "{count, plural, other {Filtr}",
      })
    ).toMatchObject({ code: "invalid_override", success: false })
  })

  it("rejects renamed or differently typed ICU arguments", () => {
    expect(
      validateStorefrontTextOverride({
        defaultValue,
        locale: "cs-CZ",
        overrideValue:
          "{quantity, plural, =0 {Filtr} other {Filtr (#)}}",
      })
    ).toMatchObject({ code: "incompatible_override", success: false })
    expect(
      validateStorefrontTextOverride({
        defaultValue,
        locale: "cs-CZ",
        overrideValue: "Filtr ({count})",
      })
    ).toMatchObject({ code: "incompatible_override", success: false })
  })
})

describe("storefront text admin validation", () => {
  it("rejects a locale that does not belong to the selected market", () => {
    expect(
      AdminGetStorefrontTextsSchema.safeParse({
        locale: "sk-SK",
        market: "cz",
      }).success
    ).toBe(false)
  })

  it("accepts a non-empty override and null as an explicit reset", () => {
    expect(
      AdminUpdateStorefrontTextSchema.safeParse({
        override_value: "Do košíku",
      }).success
    ).toBe(true)
    expect(
      AdminUpdateStorefrontTextSchema.safeParse({
        override_value: null,
      }).success
    ).toBe(true)
  })

  it("rejects empty updates and blank overrides", () => {
    expect(AdminUpdateStorefrontTextSchema.safeParse({}).success).toBe(false)
    expect(
      AdminUpdateStorefrontTextSchema.safeParse({ override_value: " " }).success
    ).toBe(false)
  })
})

describe("storefront text store route", () => {
  const createResponse = () => ({ json: vi.fn() })

  it("rejects mismatched market and locale before querying the module", async () => {
    const resolve = vi.fn()
    const request = {
      locale: "sk-SK",
      scope: { resolve },
      validatedQuery: { market: "cz" },
    }

    await expect(GET(request as never, createResponse() as never)).rejects.toThrow(
      'Locale "sk-SK" does not belong to market "cz"'
    )
    expect(resolve).not.toHaveBeenCalled()
  })

  it("overlays active database values on registry defaults", async () => {
    const listStorefrontTexts = vi.fn().mockResolvedValue([
      {
        default_value: "Do košíku",
        key: "cart.add_to_cart",
        override_value: "Přidat",
        status: "active",
      },
    ])
    const request = {
      locale: "cs-CZ",
      scope: { resolve: vi.fn(() => ({ listStorefrontTexts })) },
      validatedQuery: { market: "cz" },
    }
    const response = createResponse()

    await GET(request as never, response as never)

    expect(listStorefrontTexts).toHaveBeenCalledWith({
      locale: "cs-CZ",
      market: "cz",
      status: "active",
    })
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: "cs-CZ",
        market: "cz",
        messages: expect.objectContaining({
          "cart.add_to_cart": "Přidat",
        }),
      })
    )
  })
})

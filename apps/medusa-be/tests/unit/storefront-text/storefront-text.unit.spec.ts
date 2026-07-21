import { describe, expect, it, vi } from "vitest"
import { GET as getAdminStorefrontTextCatalog } from "../../../src/api/admin/storefront-texts/catalog/route"
import { GET as getAdminStorefrontTexts } from "../../../src/api/admin/storefront-texts/route"
import { GET } from "../../../src/api/store/storefront-texts/route"
import {
  AdminGetStorefrontTextCatalogSchema,
  AdminGetStorefrontTextsSchema,
  AdminImportStorefrontTextCatalogSchema,
  AdminUpdateStorefrontTextSchema,
} from "../../../src/api/admin/storefront-texts/validators"
import {
  flattenStorefrontTextCatalog,
  getPublishedStorefrontTextMessages,
  nestStorefrontTextMessages,
  STOREFRONT_TEXT_CATALOG_SCHEMA_VERSION,
} from "../../../src/modules/storefront-text/catalog"
import {
  STOREFRONT_TEXT_DEFINITIONS,
  STOREFRONT_TEXT_MARKETS,
  getStorefrontTextDefaultMessages,
  getStorefrontTextSeedRows,
  isStorefrontTextMarketLocalePair,
  parseStorefrontTextCatalog,
  parseStorefrontTextCatalogEnvelope,
} from "../../../src/modules/storefront-text/registry"
import { validateStorefrontTextOverride } from "../../../src/modules/storefront-text/message-validation"
import { getEffectiveStorefrontTextValue } from "../../../src/modules/storefront-text/value"
import {
  STOREFRONT_TEXT_LOCK_KEY,
} from "../../../src/workflows/storefront-text/lock"

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

  it("round-trips a native nested next-intl catalog", () => {
    const defaults = getStorefrontTextDefaultMessages({ market: "cz" })
    const nestedCatalog = nestStorefrontTextMessages(defaults)

    expect(parseStorefrontTextCatalog(nestedCatalog)).toEqual(defaults)
    expect(flattenStorefrontTextCatalog(nestedCatalog)).toEqual(defaults)
  })

  it("validates a versioned catalog against its target market", () => {
    const messages = nestStorefrontTextMessages(
      getStorefrontTextDefaultMessages({ market: "cz" })
    )

    expect(
      parseStorefrontTextCatalogEnvelope({
        catalog: {
          locale: "cs-CZ",
          market: "cz",
          messages,
          schema_version: STOREFRONT_TEXT_CATALOG_SCHEMA_VERSION,
        },
        targetMarket: "cz",
      })
    ).toMatchObject({
      locale: "cs-CZ",
      market: "cz",
      messages: getStorefrontTextDefaultMessages({ market: "cz" }),
      schema_version: 1,
    })
  })

  it("rejects a catalog exported for a different target market", () => {
    expect(() =>
      parseStorefrontTextCatalogEnvelope({
        catalog: {
          locale: "cs-CZ",
          market: "cz",
          messages: nestStorefrontTextMessages(
            getStorefrontTextDefaultMessages({ market: "cz" })
          ),
          schema_version: STOREFRONT_TEXT_CATALOG_SCHEMA_VERSION,
        },
        targetMarket: "sk",
      })
    ).toThrow('Catalog market "cz" does not match target market "sk"')
  })

  it("rejects unsupported catalog versions and market-locale pairs", () => {
    const messages = nestStorefrontTextMessages(
      getStorefrontTextDefaultMessages({ market: "cz" })
    )

    expect(() =>
      parseStorefrontTextCatalogEnvelope({
        catalog: {
          locale: "cs-CZ",
          market: "cz",
          messages,
          schema_version: 2,
        },
        targetMarket: "cz",
      })
    ).toThrow('Unsupported storefront text catalog schema version "2"')

    expect(() =>
      parseStorefrontTextCatalogEnvelope({
        catalog: {
          locale: "sk-SK",
          market: "cz",
          messages,
          schema_version: STOREFRONT_TEXT_CATALOG_SCHEMA_VERSION,
        },
        targetMarket: "cz",
      })
    ).toThrow('Locale "sk-SK" does not belong to market "cz"')
  })

  it("serializes all storefront text writes with one lock", () => {
    expect(STOREFRONT_TEXT_LOCK_KEY).toBe("storefront-texts")
  })

  it("rejects incomplete and unknown catalog keys", () => {
    expect(() =>
      parseStorefrontTextCatalog({
        cart: { add_to_cart: "Do košíku" },
      })
    ).toThrow("Missing keys")

    const catalog = nestStorefrontTextMessages(
      getStorefrontTextDefaultMessages({ market: "cz" })
    )
    catalog.unknown = "Neznámý text"

    expect(() => parseStorefrontTextCatalog(catalog)).toThrow("Unknown keys")
  })

  it("rejects reserved object-path segments in catalogs", () => {
    const catalog = JSON.parse(
      '{"__proto__":"ignored","cart":{"add_to_cart":"Do košíku"}}'
    )

    expect(() => flattenStorefrontTextCatalog(catalog)).toThrow(
      'Invalid storefront text catalog key "__proto__"'
    )
    expect(() =>
      nestStorefrontTextMessages({
        "__proto__.polluted": "yes",
      })
    ).toThrow(
      'Invalid storefront text message key "__proto__.polluted"'
    )
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
    const seedRows = getStorefrontTextSeedRows()

    for (const definition of STOREFRONT_TEXT_DEFINITIONS) {
      const defaultValue = seedRows.find(
        (row) => row.key === definition.key && row.market === "sk"
      )?.default_value

      expect(defaultValue).toBeTypeOf("string")

      for (const market of STOREFRONT_TEXT_MARKETS) {
        const localizedValue = seedRows.find(
          (row) =>
            row.key === definition.key && row.market === market.market
        )?.default_value

        expect(localizedValue).toBeTypeOf("string")
        expect(
          validateStorefrontTextOverride({
            defaultValue: defaultValue ?? "",
            locale: market.locale,
            overrideValue: localizedValue ?? "",
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

  it("creates localized free-shipping defaults for every market", () => {
    const freeShippingRows = getStorefrontTextSeedRows().filter(
      (row) => row.key === "checkout.free_shipping_remaining"
    )

    expect(
      Object.fromEntries(
        freeShippingRows.map((row) => [row.market, row.default_value])
      )
    ).toEqual({
      cz: "Nakupte ještě za {missingAmount} a získejte <strong>dopravu zdarma.</strong>",
      hu: "Vásároljon még {missingAmount} értékben, és kapjon <strong>ingyenes szállítást.</strong>",
      ro: "Mai adăugați produse în valoare de {missingAmount} și beneficiați de <strong>transport gratuit.</strong>",
      sk: "Nakúpte ešte za {missingAmount} a získajte <strong>dopravu zadarmo.</strong>",
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

  it("ignores an active override that is incompatible with the current catalog", () => {
    const defaultMessages = {
      "cart.low_stock": "Zbývá už jen {quantity} ks",
    }

    expect(
      getPublishedStorefrontTextMessages(
        defaultMessages,
        [
          {
            key: "cart.low_stock",
            override_value: "Zbývá už jen {count} ks",
            status: "active",
          },
        ],
        "cs-CZ"
      )
    ).toEqual(defaultMessages)
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

  it("validates catalog export and import inputs", () => {
    expect(
      AdminGetStorefrontTextCatalogSchema.safeParse({ market: "cz" }).success
    ).toBe(true)
    expect(
      AdminImportStorefrontTextCatalogSchema.safeParse({
        catalog: {
          locale: "cs-CZ",
          market: "cz",
          messages: { cart: { add_to_cart: "Do košíku" } },
          schema_version: STOREFRONT_TEXT_CATALOG_SCHEMA_VERSION,
        },
        market: "cz",
      }).success
    ).toBe(true)
    expect(
      AdminImportStorefrontTextCatalogSchema.safeParse({
        catalog: {
          locale: "cs-CZ",
          market: "cz",
          messages: { cart: { add_to_cart: "Do košíku" } },
          schema_version: STOREFRONT_TEXT_CATALOG_SCHEMA_VERSION,
        },
        market: "cz",
        status: "draft",
      }).success
    ).toBe(false)
    expect(
      AdminImportStorefrontTextCatalogSchema.safeParse({
        catalog: {
          locale: "sk-SK",
          market: "cz",
          messages: {},
          schema_version: STOREFRONT_TEXT_CATALOG_SCHEMA_VERSION,
        },
        market: "cz",
      }).success
    ).toBe(false)
  })

  it("preserves reserved message keys for workflow validation", () => {
    const messages = JSON.parse('{"__proto__":"blocked"}')
    const result = AdminImportStorefrontTextCatalogSchema.safeParse({
      catalog: {
        locale: "cs-CZ",
        market: "cz",
        messages,
        schema_version: STOREFRONT_TEXT_CATALOG_SCHEMA_VERSION,
      },
      market: "cz",
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(
        Object.prototype.hasOwnProperty.call(
          result.data.catalog.messages,
          "__proto__"
        )
      ).toBe(true)
    }
  })
})

describe("storefront text admin catalog", () => {
  it("exports current defaults with active overrides only", async () => {
    const defaultMessages = getStorefrontTextDefaultMessages({ market: "cz" })
    const listStorefrontTexts = vi.fn().mockResolvedValue([
      {
        default_value: "Do košíku",
        key: "cart.add_to_cart",
        override_value: "Přidat",
        status: "active",
      },
      {
        default_value: "Starý výchozí text",
        key: "cart.adding_to_cart",
        override_value: null,
        status: "active",
      },
      {
        default_value: "Starý výchozí text",
        key: "cart.added_to_cart",
        override_value: "Rozepsaný koncept",
        status: "draft",
      },
      {
        default_value: "Retired",
        key: "cart.retired_key",
        override_value: null,
        status: "active",
      },
    ])
    const request = {
      scope: { resolve: vi.fn(() => ({ listStorefrontTexts })) },
      validatedQuery: { market: "cz" },
    }
    const response = { json: vi.fn() }

    await getAdminStorefrontTextCatalog(
      request as never,
      response as never
    )

    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: "cs-CZ",
        market: "cz",
        schema_version: STOREFRONT_TEXT_CATALOG_SCHEMA_VERSION,
        messages: expect.objectContaining({
          cart: expect.objectContaining({
            add_to_cart: "Přidat",
            added_to_cart: defaultMessages["cart.added_to_cart"],
            adding_to_cart: defaultMessages["cart.adding_to_cart"],
          }),
        }),
      })
    )
    expect(
      response.json.mock.calls[0]?.[0]?.messages?.cart?.retired_key
    ).toBeUndefined()
  })
})

describe("storefront text admin search", () => {
  const createResponse = () => ({ json: vi.fn() })

  const search = async (searchScope: "all" | "value") => {
    const listAndCountStorefrontTexts = vi
      .fn()
      .mockResolvedValue([[], 0])
    const request = {
      scope: {
        resolve: vi.fn(() => ({ listAndCountStorefrontTexts })),
      },
      validatedQuery: {
        limit: 20,
        offset: 0,
        q: "partner",
        search_scope: searchScope,
      },
    }

    await getAdminStorefrontTexts(
      request as never,
      createResponse() as never
    )

    return listAndCountStorefrontTexts
  }

  it("searches the displayed effective value in value-only mode", async () => {
    const listAndCountStorefrontTexts = await search("value")

    expect(listAndCountStorefrontTexts).toHaveBeenCalledWith(
      expect.objectContaining({
        $or: [
          {
            override_value: { $ilike: "%partner%" },
            status: "active",
          },
          {
            $or: [{ status: { $ne: "active" } }, { override_value: null }],
            default_value: { $ilike: "%partner%" },
          },
        ],
        key: expect.arrayContaining(["cart.add_to_cart"]),
      }),
      expect.objectContaining({ skip: 0, take: 20 })
    )
  })

  it("keeps the existing multi-field search available", async () => {
    const listAndCountStorefrontTexts = await search("all")

    expect(listAndCountStorefrontTexts).toHaveBeenCalledWith(
      expect.objectContaining({
        $or: expect.arrayContaining([
          { default_value: { $ilike: "%partner%" } },
          { key: { $ilike: "%partner%" } },
          { override_value: { $ilike: "%partner%" } },
        ]),
        key: expect.arrayContaining(["cart.add_to_cart"]),
      }),
      expect.objectContaining({ skip: 0, take: 20 })
    )
  })

  it("returns the current catalog default when the database copy is stale", async () => {
    const currentDefault = getStorefrontTextDefaultMessages({ market: "cz" })[
      "cart.low_stock"
    ]
    const listAndCountStorefrontTexts = vi.fn().mockResolvedValue([
      [
        {
          default_value: "Zbývá už jen {count} ks",
          key: "cart.low_stock",
          locale: "cs-CZ",
          market: "cz",
          override_value: "Posledních {count} ks",
          status: "active",
        },
      ],
      1,
    ])
    const response = createResponse()

    await getAdminStorefrontTexts(
      {
        scope: {
          resolve: vi.fn(() => ({ listAndCountStorefrontTexts })),
        },
        validatedQuery: {
          limit: 20,
          offset: 0,
          search_scope: "all",
        },
      } as never,
      response as never
    )

    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        storefront_texts: [
          expect.objectContaining({
            default_value: currentDefault,
            effective_value: currentDefault,
            has_override: true,
          }),
        ],
      })
    )
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
    const defaultMessages = getStorefrontTextDefaultMessages({ market: "cz" })
    const listStorefrontTexts = vi.fn().mockResolvedValue([
      {
        default_value: "Do košíku",
        key: "cart.add_to_cart",
        override_value: "Přidat",
        status: "active",
      },
      {
        default_value: "Starý výchozí text",
        key: "cart.adding_to_cart",
        override_value: null,
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
          "cart.adding_to_cart": defaultMessages["cart.adding_to_cart"],
        }),
      })
    )
  })
})

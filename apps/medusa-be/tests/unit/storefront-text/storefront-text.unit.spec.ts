import { describe, expect, it, vi } from "vitest"
import { GET } from "../../../src/api/store/storefront-texts/route"
import {
  AdminGetStorefrontTextsSchema,
  AdminUpdateStorefrontTextSchema,
} from "../../../src/api/admin/storefront-texts/validators"
import {
  getStorefrontTextSeedRows,
  isStorefrontTextMarketLocalePair,
} from "../../../src/modules/storefront-text/registry"
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

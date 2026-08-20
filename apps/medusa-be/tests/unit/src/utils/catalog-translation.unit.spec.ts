import { Modules } from "@medusajs/framework/utils"
import { describe, expect, it, vi } from "vitest"
import {
  readExactCatalogTranslation,
  readExactCatalogTranslations,
  resolveCatalogMarketLocale,
} from "../../../../src/utils/catalog-translation"

const translation = (overrides: Record<string, unknown> = {}) => ({
  created_at: "2026-08-19T00:00:00.000Z",
  deleted_at: null,
  id: "trans_1",
  locale_code: "cs-CZ",
  reference: "product_category",
  reference_id: "pcat_1",
  translations: {
    bottom_description_html: null,
    description: "Popis",
    meta_description: "Meta popis",
    meta_title: "Meta",
    name: "Byliny",
    top_description_html: null,
  },
  updated_at: "2026-08-19T00:00:00.000Z",
  ...overrides,
})

const context = (
  records: unknown[] | Error,
  products: unknown[] = [{ description: "", id: "prod_1", subtitle: "" }]
) => {
  const listTranslations =
    records instanceof Error
      ? vi.fn().mockRejectedValue(records)
      : vi.fn().mockResolvedValue(records)
  const resolve = vi.fn((key: string) => {
    if (key === Modules.TRANSLATION) {
      return { listTranslations }
    }
    if (key === Modules.PRODUCT) {
      return {
        listProducts: vi.fn(async () => products),
      }
    }
    throw new Error(`Unexpected dependency: ${key}`)
  })
  return { container: { resolve } as never, listTranslations }
}

describe("exact catalog Translation-record reads", () => {
  it.each([
    ["sk", "sk-SK"],
    ["cz", "cs-CZ"],
    ["hu", "hu-HU"],
    ["ro", "ro-RO"],
  ] as const)("binds market %s to exact locale %s", (market, locale) => {
    expect(resolveCatalogMarketLocale(market)).toBe(locale)
  })

  it("proves one exact BCP-47 Translation record without fallback", async () => {
    const { container, listTranslations } = context([translation()])

    await expect(
      readExactCatalogTranslation({
        container,
        entityId: "pcat_1",
        entityKind: "category",
        market: "cz",
      })
    ).resolves.toEqual({
      kind: "found",
      proof: {
        localeCode: "cs-CZ",
        reference: "product_category",
        translationId: "trans_1",
      },
    })
    expect(listTranslations).toHaveBeenCalledWith(
      {
        locale_code: "cs-CZ",
        reference: "product_category",
        reference_id: ["pcat_1"],
      },
      expect.objectContaining({ take: 2 })
    )
  })

  it.each([
    ["product", "product", "prod_1", "sk", "sk-SK", { title: "Produkt" }],
    [
      "category",
      "product_category",
      "pcat_1",
      "ro",
      "ro-RO",
      {
        bottom_description_html: null,
        description: "Descriere",
        meta_description: "Meta",
        meta_title: "Categorie",
        name: "Categorie",
        top_description_html: null,
      },
    ],
    ["brand", "brand", "brand_1", "ro", "ro-RO", { title: "Marcă" }],
    [
      "collection",
      "product_collection",
      "pcol_1",
      "ro",
      "ro-RO",
      { title: "Colecție" },
    ],
  ] as const)("requires the localized display field for %s translations", async (entityKind, reference, entityId, market, localeCode, translations) => { // biome-ignore lint/nursery/useMaxParams: each positional value is a visible table-test column.
    const { container } = context([
      translation({
        locale_code: localeCode,
        reference,
        reference_id: entityId,
        translations,
      }),
    ])

    await expect(
      readExactCatalogTranslation({
        container,
        entityId,
        entityKind,
        market,
      })
    ).resolves.toMatchObject({ kind: "found" })
  })

  it("returns missing instead of accepting a Store fallback value", async () => {
    const { container } = context([])
    await expect(
      readExactCatalogTranslation({
        container,
        entityId: "prod_1",
        entityKind: "product",
        market: "sk",
      })
    ).resolves.toEqual({ kind: "missing", localeCode: "sk-SK" })
  })

  it("rejects an incomplete present product in a partially missing batch", async () => {
    const { container } = context(
      [
        translation({
          locale_code: "sk-SK",
          reference: "product",
          reference_id: "prod_1",
          translations: { description: "", title: "Produkt" },
        }),
      ],
      [{ description: "Zdrojový popis", id: "prod_1", subtitle: "" }]
    )

    await expect(
      readExactCatalogTranslations({
        container,
        entityIds: ["prod_1", "prod_2"],
        entityKind: "product",
        market: "sk",
      })
    ).resolves.toEqual({
      causeCode: "INCOMPLETE_PRODUCT_PUBLICATION_TRANSLATION",
      kind: "invalid-response",
    })
  })

  it.each([
    ["wrong locale", translation({ locale_code: "sk-SK" })],
    ["wrong reference", translation({ reference: "product" })],
    ["wrong source", translation({ reference_id: "pcat_2" })],
    ["deleted", translation({ deleted_at: "2026-08-19T00:00:00.000Z" })],
    ["malformed payload", translation({ translations: [] })],
    ["empty payload", translation({ translations: {} })],
    [
      "partial payload",
      translation({ translations: { description: "Popis bez názvu" } }),
    ],
    ["blank display field", translation({ translations: { name: "  " } })],
  ])("rejects a %s record as invalid source state", async (_label, record) => {
    const { container } = context([record])
    await expect(
      readExactCatalogTranslation({
        container,
        entityId: "pcat_1",
        entityKind: "category",
        market: "cz",
      })
    ).resolves.toEqual({
      causeCode: "INVALID_CATALOG_TRANSLATION_STATE",
      kind: "invalid-response",
    })
  })

  it.each([
    ["product", "product", "prod_1", { description: "Descriere" }],
    ["category", "product_category", "pcat_1", { description: "Descriere" }],
    ["brand", "brand", "brand_1", { name: "Marcă" }],
    ["collection", "product_collection", "pcol_1", { name: "Colecție" }],
  ] as const)("rejects a partial %s row without its required display field", async (entityKind, reference, entityId, translations) => {
    const { container } = context([
      translation({
        locale_code: "ro-RO",
        reference,
        reference_id: entityId,
        translations,
      }),
    ])

    await expect(
      readExactCatalogTranslation({
        container,
        entityId,
        entityKind,
        market: "ro",
      })
    ).resolves.toEqual({
      causeCode: "INVALID_CATALOG_TRANSLATION_STATE",
      kind: "invalid-response",
    })
  })

  it("rejects ambiguous records instead of selecting one", async () => {
    const { container } = context([
      translation(),
      translation({ id: "trans_2" }),
    ])
    await expect(
      readExactCatalogTranslations({
        container,
        entityIds: ["pcat_1", "pcat_2"],
        entityKind: "category",
        market: "cz",
      })
    ).resolves.toEqual({
      causeCode: "AMBIGUOUS_CATALOG_TRANSLATION_STATE",
      kind: "invalid-response",
    })
  })

  it("maps Translation-module failures to unavailable", async () => {
    const { container } = context(new Error("database unavailable"))
    await expect(
      readExactCatalogTranslation({
        container,
        entityId: "brand_1",
        entityKind: "brand",
        market: "ro",
      })
    ).resolves.toEqual({ kind: "unavailable" })
  })
})

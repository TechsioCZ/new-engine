import { describe, expect, it } from "vitest"
import {
  buildProductContentTranslationBatch,
  getProductContentTranslationValues,
  PRODUCT_CONTENT_LOCALES,
} from "../../../src/admin/lib/product-content-translations"

describe("product content translation admin data", () => {
  it("offers only the locales used by the storefront markets", () => {
    expect(PRODUCT_CONTENT_LOCALES).toEqual([
      "sk-SK",
      "cs-CZ",
      "hu-HU",
      "ro-RO",
    ])
  })

  it("returns empty values instead of source-language fallback", () => {
    expect(getProductContentTranslationValues({})).toEqual({
      composition: "",
      description: "",
      other: "",
      usage: "",
      warning: "",
    })
  })

  it("creates product and product-content translations with rich HTML", () => {
    expect(
      buildProductContentTranslationBatch({
        contentId: "pcont_1",
        existing: {},
        locale: "ro-RO",
        productId: "prod_1",
        values: {
          composition: "<p><strong>100%</strong> arahide</p>",
          description: "<h2>Descriere</h2>",
          other: "<p>Alte informatii</p>",
          usage: "<ul><li>Utilizare</li></ul>",
          warning: "",
        },
      })
    ).toEqual({
      create: [
        {
          locale_code: "ro-RO",
          reference: "product",
          reference_id: "prod_1",
          translations: { description: "<h2>Descriere</h2>" },
        },
        {
          locale_code: "ro-RO",
          reference: "product_content",
          reference_id: "pcont_1",
          translations: {
            composition: "<p><strong>100%</strong> arahide</p>",
            other: "<p>Alte informatii</p>",
            usage: "<ul><li>Utilizare</li></ul>",
            warning: "",
          },
        },
      ],
      update: [],
    })
  })

  it("updates both records without removing other product translations", () => {
    const batch = buildProductContentTranslationBatch({
      contentId: "pcont_1",
      existing: {
        content: {
          created_at: "2026-08-17",
          deleted_at: null,
          id: "trans_content",
          locale_code: "ro-RO",
          reference: "product_content",
          reference_id: "pcont_1",
          translations: { usage: "old" },
          updated_at: "2026-08-17",
        },
        product: {
          created_at: "2026-08-17",
          deleted_at: null,
          id: "trans_product",
          locale_code: "ro-RO",
          reference: "product",
          reference_id: "prod_1",
          translations: { title: "Titlu" },
          updated_at: "2026-08-17",
        },
      },
      locale: "ro-RO",
      productId: "prod_1",
      values: {
        composition: "new composition",
        description: "new description",
        other: "new other",
        usage: "new usage",
        warning: "new warning",
      },
    })

    expect(batch.create).toEqual([])
    expect(batch.update).toEqual([
      {
        id: "trans_product",
        translations: { description: "new description", title: "Titlu" },
      },
      {
        id: "trans_content",
        translations: {
          composition: "new composition",
          other: "new other",
          usage: "new usage",
          warning: "new warning",
        },
      },
    ])
  })
})

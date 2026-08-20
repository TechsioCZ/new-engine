import { describe, expect, it } from "vitest"
import {
  buildCategoryContentTranslationUpdate,
  getCategoryContentTranslationValues,
} from "../../../../src/admin/lib/category-content-translations"

const existing = {
  id: "trans_1",
  locale_code: "ro-RO",
  reference: "product_category",
  reference_id: "pcat_1",
  translations: {
    name: "Suplimente",
    description: "Descriere categorie",
    top_description_html: "<p>Vechi</p>",
  },
} as never

describe("category content translation admin utility", () => {
  it("reads missing rich fields as explicit nulls", () => {
    expect(getCategoryContentTranslationValues(existing)).toEqual({
      top_description_html: "<p>Vechi</p>",
      bottom_description_html: null,
      meta_title: null,
      meta_description: null,
    })
  })

  it("preserves native translated fields while updating rich content", () => {
    expect(
      buildCategoryContentTranslationUpdate({
        existing,
        values: {
          top_description_html: "<p>Nou</p>",
          bottom_description_html: "<p>Jos</p>",
          meta_title: "Titlu SEO",
          meta_description: "Descriere SEO",
        },
      })
    ).toEqual({
      update: [
        {
          id: "trans_1",
          translations: {
            name: "Suplimente",
            description: "Descriere categorie",
            top_description_html: "<p>Nou</p>",
            bottom_description_html: "<p>Jos</p>",
            meta_title: "Titlu SEO",
            meta_description: "Descriere SEO",
          },
        },
      ],
    })
  })
})

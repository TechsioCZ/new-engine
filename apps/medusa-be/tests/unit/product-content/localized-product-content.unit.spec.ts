import { Modules } from "@medusajs/framework/utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { PRODUCT_CONTENT_MODULE } from "../../../src/modules/product-content"
import { decorateProductsWithLocalizedContent } from "../../../src/utils/localized-product-content"

const productContentService = {
  listProductContents: vi.fn(),
}
const translationService = {
  listTranslations: vi.fn(),
}
const container = {
  resolve: vi.fn((key: string) => {
    if (key === PRODUCT_CONTENT_MODULE) {
      return productContentService
    }
    if (key === Modules.TRANSLATION) {
      return translationService
    }
    throw new Error(`Unexpected dependency: ${key}`)
  }),
}

describe("decorateProductsWithLocalizedContent", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    productContentService.listProductContents.mockResolvedValue([
      {
        composition: "<p>Slovenske zlozenie</p>",
        id: "pcont_1",
        other: "<p>Slovenske ostatne</p>",
        product_id: "prod_1",
        usage: "<p>Slovenske pouzitie</p>",
        warning: "<p>Slovenske upozornenie</p>",
      },
    ])
  })

  it("keeps source content for sk-SK without reading translations", async () => {
    const products = [
      {
        description: "<p>Slovensky popis</p>",
        id: "prod_1",
        metadata: { short_description: "Slovenske zhrnutie" },
      },
    ]

    await decorateProductsWithLocalizedContent(
      container as never,
      products,
      "sk-SK"
    )

    expect(translationService.listTranslations).not.toHaveBeenCalled()
    expect(products[0]).toMatchObject({
      description: "<p>Slovensky popis</p>",
      metadata: {
        content_sections_map: {
          composition: "<p>Slovenske zlozenie</p>",
          description: "<p>Slovensky popis</p>",
        },
        short_description: "Slovenske zhrnutie",
      },
    })
  })

  it("uses only explicit Romanian translations and hides source-only copy", async () => {
    translationService.listTranslations.mockResolvedValue([
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
          composition: "<p>Compozitie</p>",
          usage: "<p>Utilizare</p>",
        },
      },
    ])
    const products = [
      {
        description: "<p>Slovensky fallback z query.graph</p>",
        id: "prod_1",
        metadata: { short_description: "Slovenske zhrnutie" },
      },
    ]

    await decorateProductsWithLocalizedContent(
      container as never,
      products,
      "ro-RO"
    )

    expect(products[0]).toMatchObject({
      description: "<h2>Descriere</h2>",
      metadata: {
        content_sections_map: {
          composition: "<p>Compozitie</p>",
          description: "<h2>Descriere</h2>",
          other: "",
          usage: "<p>Utilizare</p>",
          warning: "",
        },
        short_description: "",
      },
    })
  })

  it("returns empty localized sections when no translation exists", async () => {
    translationService.listTranslations.mockResolvedValue([])
    const products = [
      {
        description: "<p>Slovensky fallback</p>",
        id: "prod_1",
        metadata: { short_description: "Slovensky fallback" },
      },
    ]

    await decorateProductsWithLocalizedContent(
      container as never,
      products,
      "ro-RO"
    )

    expect(products[0]?.description).toBe("")
    expect(products[0]?.metadata?.content_sections_map).toEqual({
      composition: "",
      description: "",
      other: "",
      usage: "",
      warning: "",
    })
    expect(products[0]?.metadata?.short_description).toBe("")
  })
})

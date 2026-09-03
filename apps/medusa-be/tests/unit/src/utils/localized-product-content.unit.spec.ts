import { Modules } from "@medusajs/framework/utils"
import { describe, expect, it, vi } from "vitest"
import { PRODUCT_CONTENT_MODULE } from "../../../../src/modules/product-content"
import { decorateProductsWithLocalizedContent } from "../../../../src/utils/localized-product-content"

const sourceContent = {
  composition: "<p>Zloženie v slovenčine</p>",
  id: "content_1",
  other: "<p>Iné informácie v slovenčine</p>",
  product_id: "prod_1",
  usage: "<p>Použitie v slovenčine</p>",
  warning: "<p>Upozornenie v slovenčine</p>",
}

const containerFor = (translations: unknown[]) => {
  const productContentService = {
    listProductContents: vi.fn().mockResolvedValue([sourceContent]),
  }
  const translationService = {
    listTranslations: vi.fn().mockResolvedValue(translations),
  }

  return {
    container: {
      resolve: vi.fn((key: string) =>
        key === PRODUCT_CONTENT_MODULE
          ? productContentService
          : translationService
      ),
    },
    productContentService,
    translationService,
  }
}

describe("localized product content", () => {
  it("uses the exact Romanian description and keeps every empty demo content field blank", async () => {
    const services = containerFor([
      {
        locale_code: "ro-RO",
        reference: "product",
        reference_id: "prod_1",
        translations: {
          description: "<p>Descriere oficială în limba română.</p>",
        },
      },
      {
        locale_code: "ro-RO",
        reference: "product_content",
        reference_id: "content_1",
        translations: {
          composition: "",
          other: "",
          usage: "",
          warning: "",
        },
      },
    ])
    const product = {
      description: "<p>Slovenský popis</p>",
      id: "prod_1",
      metadata: {
        content_sections_map: {
          composition: "<p>Slovenské zloženie</p>",
          usage: "<p>Slovenské použitie</p>",
        },
        keep_me: "preserved",
        short_description: "Slovenský krátky popis",
      },
    }

    await decorateProductsWithLocalizedContent(
      services.container as never,
      [product],
      "ro-RO"
    )

    expect(product.description).toBe(
      "<p>Descriere oficială în limba română.</p>"
    )
    expect(product.metadata).toEqual({
      content_sections: [
        {
          html: "<p>Descriere oficială în limba română.</p>",
          key: "description",
          title: "Description",
        },
        { html: "", key: "usage", title: "Usage" },
        { html: "", key: "composition", title: "Composition" },
        { html: "", key: "warning", title: "Warning" },
        { html: "", key: "other", title: "Other" },
      ],
      content_sections_map: {
        composition: "",
        description: "<p>Descriere oficială în limba română.</p>",
        other: "",
        usage: "",
        warning: "",
      },
      keep_me: "preserved",
      short_description: "",
    })
    expect(JSON.stringify(product)).not.toContain("Slovensk")
    expect(
      services.productContentService.listProductContents
    ).toHaveBeenCalled()
    expect(services.translationService.listTranslations).toHaveBeenCalledWith(
      {
        locale_code: "ro-RO",
        reference_id: ["prod_1", "content_1"],
      },
      { take: 2 }
    )
    expect(services.container.resolve).toHaveBeenCalledWith(Modules.TRANSLATION)
  })
})

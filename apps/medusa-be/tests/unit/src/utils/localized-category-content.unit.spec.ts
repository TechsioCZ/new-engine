import { describe, expect, it, vi } from "vitest"
import {
  decorateCategoriesWithLocalizedContent,
  type LocalizedCategoryContentDecoratable,
} from "../../../../src/utils/localized-category-content"

const translation = (overrides: Record<string, unknown> = {}) => ({
  id: "trans_ro_1",
  deleted_at: null,
  locale_code: "ro-RO",
  reference: "product_category",
  reference_id: "pcat_1",
  translations: {
    name: "Suplimente",
    description: "Descriere categorie",
    top_description_html: "<p>Sus</p>",
    bottom_description_html: "<p>Jos</p>",
    meta_title: "Titlu",
    meta_description: "Descriere",
  },
  ...overrides,
})

const containerFor = (translations: unknown[]) => ({
  resolve: vi.fn(() => ({
    listTranslations: vi.fn().mockResolvedValue(translations),
  })),
})

describe("localized category content", () => {
  it("preserves Slovak source metadata and identifies its source", async () => {
    const category: LocalizedCategoryContentDecoratable = {
      description: "Slovenský popis",
      id: "pcat_1",
      metadata: {
        top_description_html: "<p>Slovenský text</p>",
        meta_title: "Slovenský titulok",
        image_url: "category.jpg",
      },
    }

    const result = await decorateCategoriesWithLocalizedContent(
      containerFor([]),
      [category],
      "sk-SK"
    )

    expect(result).toEqual({ kind: "decorated" })
    expect(category.metadata).toEqual({
      top_description_html: "<p>Slovenský text</p>",
      meta_title: "Slovenský titulok",
      image_url: "category.jpg",
    })
    expect(category.localized_content).toMatchObject({
      top_description_html: "<p>Slovenský text</p>",
      bottom_description_html: null,
      source: { kind: "base-metadata", locale_code: "sk-SK" },
    })
  })

  it("uses the exact Romanian translation and strips Slovak rich metadata", async () => {
    const category: LocalizedCategoryContentDecoratable = {
      description: "Slovenský popis",
      id: "pcat_1",
      metadata: {
        top_description_html: "<p>Slovenský text</p>",
        meta_title: "Slovenský titulok",
        image_url: "category.jpg",
      },
      name: "Doplnky",
    }

    const result = await decorateCategoriesWithLocalizedContent(
      containerFor([translation()]),
      [category],
      "ro-RO"
    )

    expect(result).toEqual({ kind: "decorated" })
    expect(category.localized_content).toEqual({
      top_description_html: "<p>Sus</p>",
      bottom_description_html: "<p>Jos</p>",
      meta_title: "Titlu",
      meta_description: "Descriere",
      source: {
        kind: "translation",
        locale_code: "ro-RO",
        reference: "product_category",
        reference_id: "pcat_1",
        translation_id: "trans_ro_1",
      },
    })
    expect(category.description).toBe("Descriere categorie")
    expect(category.name).toBe("Suplimente")
    expect(category.metadata).toEqual({ image_url: "category.jpg" })
  })

  it.each([
    ["missing translation", []],
    ["duplicate translation", [translation(), translation({ id: "trans_2" })]],
    [
      "invalid present rich field",
      [
        translation({
          translations: {
            description: "Descriere categorie",
            meta_description: 42,
            name: "Suplimente",
          },
        }),
      ],
    ],
  ])("fails closed for Romanian %s", async (_label, translations) => {
    const category = {
      id: "pcat_1",
      metadata: { top_description_html: "<p>Slovenský text</p>" },
    }

    const result = await decorateCategoriesWithLocalizedContent(
      containerFor(translations),
      [category],
      "ro-RO"
    )

    expect(result.kind).toBe("invalid-response")
    expect(category).not.toHaveProperty("localized_content")
    expect(category.metadata.top_description_html).toBe("<p>Slovenský text</p>")
  })

  it.each([
    [
      "absent unsupported fields",
      { description: "Descriere categorie", name: "Suplimente" },
    ],
    [
      "explicit nulls",
      {
        bottom_description_html: null,
        description: null,
        meta_description: null,
        meta_title: null,
        name: "Suplimente",
        top_description_html: null,
      },
    ],
  ])("maps Romanian %s to null without Slovak fallback", async (_label, translations) => {
    const category: LocalizedCategoryContentDecoratable = {
      description: "Slovenský popis",
      id: "pcat_1",
      metadata: { top_description_html: "<p>Slovenský text</p>" },
    }
    const result = await decorateCategoriesWithLocalizedContent(
      containerFor([translation({ translations })]),
      [category],
      "ro-RO"
    )

    expect(result).toEqual({ kind: "decorated" })
    expect(category.localized_content).toMatchObject({
      bottom_description_html: null,
      meta_description: null,
      meta_title: null,
      top_description_html: null,
    })
    expect(category.description).not.toBe("Slovenský popis")
    expect(category.metadata).toEqual({})
  })

  it("does not query translations for an empty page", async () => {
    const container = containerFor([])

    await expect(
      decorateCategoriesWithLocalizedContent(container, [], "ro-RO")
    ).resolves.toEqual({ kind: "decorated" })
    expect(container.resolve).not.toHaveBeenCalled()
  })
})

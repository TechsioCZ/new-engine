import { createHash } from "node:crypto"
import { describe, expect, it } from "vitest"
import {
  hasRenderableVisibleContent,
  isCompleteCategoryPublicationTranslation,
  isCompleteProductContentPublicationTranslation,
  isCompleteProductPublicationTranslation,
} from "../../../../src/utils/catalog-publication-predicate"
import { PRODUCT_CONTENT_TRANSLATABLE_FIELDS } from "../../../../src/utils/product-content"
import {
  createRoDemoOmissionAuthority,
  RO_DEMO_OMISSION_AUTHORITY_KEY,
} from "../../../../src/utils/ro-demo-omission-authority"

const SECRET = "test-only-demo-omission-secret-32-bytes"

const authority = (description: string) =>
  createRoDemoOmissionAuthority(
    {
      ledgerSha256: "a".repeat(64),
      mode: "official-ro-description-only",
      omittedFields: [...PRODUCT_CONTENT_TRANSLATABLE_FIELDS],
      productContentId: "pcont_1",
      productId: "prod_1",
      roDescriptionSha256: createHash("sha256")
        .update(description)
        .digest("hex"),
      schemaVersion: 1,
      sourceContentSha256: "b".repeat(64),
      sourceUrl: "https://herbatica.ro/produs",
    },
    SECRET
  )

describe("catalog publication predicate", () => {
  it("accepts category translations without unsupported rich-content keys", () => {
    expect(
      isCompleteCategoryPublicationTranslation({
        translations: {
          description: "Descriere",
          name: "Categorie",
        },
      })
    ).toBe(true)
  })

  it("rejects invalid present category rich-content values", () => {
    expect(
      isCompleteCategoryPublicationTranslation({
        translations: {
          description: "Descriere",
          meta_description: 42,
          name: "Categorie",
        },
      })
    ).toBe(false)
  })

  it("rejects blank localized product description when source is nonempty", () => {
    expect(
      isCompleteProductPublicationTranslation(
        { description: "Slovenský popis", subtitle: "Podtitul" },
        {
          translations: {
            description: "<p> </p>",
            subtitle: "RO",
            title: "Produs",
          },
        }
      )
    ).toBe(false)
  })

  it("accepts Medusa-normalized empty content when source content is empty", () => {
    expect(
      isCompleteProductContentPublicationTranslation({
        productContent: {
          composition: "",
          id: "pcont_1",
          other: "",
          product_id: "prod_1",
          usage: "",
          warning: "",
        },
        productTranslation: { translations: { description: "Popis" } },
        translation: { translations: {} },
      })
    ).toBe(true)
  })

  it("accepts exact empty demo content only with a bound valid signature", () => {
    const description = "<p>Descriere română vizibilă</p>"
    const translations = {
      composition: "",
      other: "",
      usage: "",
      warning: "",
    }
    const input = {
      productContent: {
        composition: "Zloženie",
        id: "pcont_1",
        other: "Iné",
        product_id: "prod_1",
        usage: "Použitie",
        warning: "Pozor",
      },
      productTranslation: { translations: { description } },
      secret: SECRET,
      translation: { translations },
    }

    expect(isCompleteProductContentPublicationTranslation(input)).toBe(false)
    expect(
      isCompleteProductContentPublicationTranslation({
        ...input,
        translation: {
          translations: {
            ...translations,
            [RO_DEMO_OMISSION_AUTHORITY_KEY]: authority(description),
          },
        },
      })
    ).toBe(true)
  })

  it("rejects script-only and empty-tag-only demo descriptions", () => {
    expect(hasRenderableVisibleContent("<script>alert(1)</script>")).toBe(false)
    expect(hasRenderableVisibleContent("<p>&nbsp;</p>")).toBe(false)
  })
})

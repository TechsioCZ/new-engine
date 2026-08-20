import { describe, expect, it } from "vitest"
import {
  buildProductContentMetadata,
  getLegacyProductContent,
  resolveLocalizedProductContent,
} from "../../../src/utils/product-content"

describe("product content localization", () => {
  const originalContent = {
    composition: "<p>Slovenske zlozenie</p>",
    other: "<p>Slovenske informacie</p>",
    usage: "<p>Slovenske pouzitie</p>",
    warning: "<p>Slovenske upozornenie</p>",
  }

  it("uses original HTML for the Slovak source locale", () => {
    expect(
      resolveLocalizedProductContent({
        contentTranslations: undefined,
        locale: "sk-SK",
        originalContent,
        originalDescription: "<p>Slovensky popis</p>",
        productTranslations: undefined,
      })
    ).toEqual({
      content: originalContent,
      description: "<p>Slovensky popis</p>",
      usesSourceContent: true,
    })
  })

  it("never falls back to Slovak HTML for another locale", () => {
    expect(
      resolveLocalizedProductContent({
        contentTranslations: {
          composition: "<p>Compozitie in romana</p>",
          usage: "<p>Utilizare in romana</p>",
        },
        locale: "ro-RO",
        originalContent,
        originalDescription: "<p>Slovensky popis</p>",
        productTranslations: {},
      })
    ).toEqual({
      content: {
        composition: "<p>Compozitie in romana</p>",
        other: "",
        usage: "<p>Utilizare in romana</p>",
        warning: "",
      },
      description: "",
      usesSourceContent: false,
    })
  })

  it("preserves explicit rich HTML translations", () => {
    const description =
      "<h2>Descriere</h2><ul><li><strong>Element</strong></li></ul>"

    expect(
      resolveLocalizedProductContent({
        contentTranslations: {
          composition: "<table><tbody><tr><td>100%</td></tr></tbody></table>",
        },
        locale: "ro-RO",
        originalContent,
        originalDescription: "<p>Slovensky popis</p>",
        productTranslations: { description },
      })
    ).toMatchObject({
      content: {
        composition: "<table><tbody><tr><td>100%</td></tr></tbody></table>",
      },
      description,
    })
  })
})

describe("legacy product content metadata", () => {
  it("prefers the content section map and falls back to the legacy list", () => {
    expect(
      getLegacyProductContent({
        content_sections: [
          { html: "<p>List usage</p>", key: "usage" },
          { html: "<p>List warning</p>", key: "warning" },
        ],
        content_sections_map: {
          composition: "<p>Mapped composition</p>",
          usage: "<p>Mapped usage</p>",
        },
      })
    ).toEqual({
      composition: "<p>Mapped composition</p>",
      other: "",
      usage: "<p>Mapped usage</p>",
      warning: "<p>List warning</p>",
    })
  })

  it("rebuilds the response metadata without mutating unrelated values", () => {
    const metadata = buildProductContentMetadata(
      { source: "feed", short_description: "Source-only copy" },
      "<p>Localized description</p>",
      {
        composition: "<p>Localized composition</p>",
        other: "",
        usage: "",
        warning: "",
      },
      { exposeSourceOnlyMetadata: false }
    )

    expect(metadata).toMatchObject({
      content_sections_map: {
        composition: "<p>Localized composition</p>",
        description: "<p>Localized description</p>",
        other: "",
        usage: "",
        warning: "",
      },
      short_description: "",
      source: "feed",
    })
  })
})

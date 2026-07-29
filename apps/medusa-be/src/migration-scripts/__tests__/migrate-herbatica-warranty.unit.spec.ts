import { describe, expect, it } from "vitest"
import {
  buildLegacyWarrantyFragment,
  isLegacyHerbaticaWarrantyMetadata,
  prepareLegacyWarrantyMigration,
} from "../20260728-migrate-herbatica-warranty"

const WARRANTY = "2 roky"
const WARRANTY_FRAGMENT = buildLegacyWarrantyFragment(WARRANTY)
const sections = [
  { html: "<p>Description</p>", key: "description", title: "Description" },
  { html: "", key: "usage", title: "Usage" },
  { html: "", key: "composition", title: "Composition" },
  { html: "", key: "warning", title: "Warning" },
  {
    html: `<p>Keep this.</p>\n${WARRANTY_FRAGMENT}`,
    key: "other",
    title: "Other",
  },
]

describe("tracked Herbatica Warranty migration", () => {
  it("removes only the generated Warranty fragment and preserves other content", () => {
    const preparation = prepareLegacyWarrantyMigration({
      content_sections: sections,
      content_sections_map: Object.fromEntries(
        sections.map((section) => [section.key, section.html])
      ),
      source: "herbatica-products-complete-xml",
      warranty: WARRANTY,
    })

    expect(preparation).toEqual({
      metadata: expect.objectContaining({
        content_sections: expect.arrayContaining([
          expect.objectContaining({
            html: "<p>Keep this.</p>",
            key: "other",
          }),
        ]),
        content_sections_map: expect.objectContaining({
          other: "<p>Keep this.</p>",
        }),
        source: "herbatica-products-complete-xml",
      }),
      safe: true,
      warranty: WARRANTY,
    })
    if (preparation.safe) {
      expect(preparation.metadata).not.toHaveProperty("warranty")
    }
  })

  it("refuses an ambiguous generated fragment without changing metadata", () => {
    const duplicated = `${WARRANTY_FRAGMENT}\n${WARRANTY_FRAGMENT}`
    const preparation = prepareLegacyWarrantyMigration({
      content_sections: sections.map((section) =>
        section.key === "other" ? { ...section, html: duplicated } : section
      ),
      content_sections_map: {
        description: "<p>Description</p>",
        usage: "",
        composition: "",
        warning: "",
        other: duplicated,
      },
      warranty: WARRANTY,
    })

    expect(preparation).toEqual({
      reason:
        "the exact generated Warranty fragment was not found exactly once",
      safe: false,
    })
  })

  it("selects only Product metadata owned by the Herbatica feed", () => {
    expect(
      isLegacyHerbaticaWarrantyMetadata({
        source: "herbatica-products-complete-xml",
        warranty: WARRANTY,
      })
    ).toBe(true)
    expect(
      isLegacyHerbaticaWarrantyMetadata({
        source: "another-import",
        warranty: WARRANTY,
      })
    ).toBe(false)
  })
})

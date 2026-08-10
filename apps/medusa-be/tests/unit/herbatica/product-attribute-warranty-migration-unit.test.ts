import { getRecordValue, isRecord } from "@techsio/std/object"
import { describe, expect, it } from "vitest"

import {
  buildLegacyWarrantyFragment,
  isLegacyHerbaticaWarrantyMetadata,
  prepareLegacyWarrantyMigration,
} from "../../../src/migration-scripts/20260728-migrate-herbatica-warranty"

const sections = (other: string) => [
  { html: "<p>Description</p>", key: "description", title: "Description" },
  { html: "", key: "usage", title: "Usage" },
  { html: "", key: "composition", title: "Composition" },
  { html: "", key: "warning", title: "Warning" },
  { html: other, key: "other", title: "Other" },
]

describe("legacy Warranty migration preparation", () => {
  it("only selects metadata owned by the Herbatica product import", () => {
    expect(
      isLegacyHerbaticaWarrantyMetadata({
        source: "herbatica-products-complete-xml",
        warranty: "2 roky",
      }),
    ).toBeTruthy()
    expect(
      isLegacyHerbaticaWarrantyMetadata({
        source: "n1",
        warranty: "2 roky",
      }),
    ).toBeFalsy()
  })

  it("removes only the exact generated fragment and preserves fixed shape", () => {
    const fragment = buildLegacyWarrantyFragment("2 roky")
    const other = `<p>Keep before</p>\n${fragment}\n<p>Keep after</p>`
    const metadata = {
      content_sections: sections(other),
      content_sections_map: {
        composition: "",
        description: "<p>Description</p>",
        other,
        usage: "",
        warning: "",
      },
      source: "herbatica-products-complete-xml",
      unrelated: { keep: true },
      warranty: "2 roky",
    }
    const result = prepareLegacyWarrantyMigration(metadata)

    expect(result).toMatchObject({
      safe: true,
      warranty: "2 roky",
    })
    if (!result.safe) {
      throw new Error(result.reason)
    }
    expect(result.metadata).not.toHaveProperty("warranty")
    expect(getRecordValue(result.metadata, "unrelated")).toStrictEqual({
      keep: true,
    })
    const contentSections: unknown = getRecordValue(
      result.metadata,
      "content_sections",
    )
    if (!Array.isArray(contentSections) || contentSections.length !== 5) {
      throw new TypeError("Expected five migrated content sections")
    }
    const finalSection: unknown = contentSections[4]
    expect(
      isRecord(finalSection) ? getRecordValue(finalSection, "html") : undefined,
    ).toBe("<p>Keep before</p>\n<p>Keep after</p>")
    const sectionMap: unknown = getRecordValue(
      result.metadata,
      "content_sections_map",
    )
    expect(
      isRecord(sectionMap) ? getRecordValue(sectionMap, "other") : undefined,
    ).toBe("<p>Keep before</p>\n<p>Keep after</p>")
  })

  it("leaves ambiguous metadata untouched", () => {
    const fragment = buildLegacyWarrantyFragment("2 roky")
    const other = `${fragment}\n${fragment}`
    const metadata = {
      content_sections: sections(other),
      content_sections_map: {
        composition: "",
        description: "<p>Description</p>",
        other,
        usage: "",
        warning: "",
      },
      source: "herbatica-products-complete-xml",
      warranty: "2 roky",
    }

    expect(prepareLegacyWarrantyMigration(metadata)).toStrictEqual({
      reason:
        "the exact generated Warranty fragment was not found exactly once",
      safe: false,
    })
    expect(metadata.content_sections[4]?.html).toBe(other)
    expect(metadata).toHaveProperty("warranty", "2 roky")
  })
})

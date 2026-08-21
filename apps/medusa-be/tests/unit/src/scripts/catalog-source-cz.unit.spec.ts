import { describe, expect, it } from "vitest"
import {
  assertCzechCatalogPublicationGrade,
  buildCzechCatalogEntry,
  parseCzechCatalogSourceAttestation,
} from "../../../../src/scripts/catalog-source-cz/generator"
import type { CzechCatalogFieldAttestations } from "../../../../src/scripts/catalog-source-cz/types"

const OFFICIAL_SHA256 = "a".repeat(64)
const TEMPORARY_SHA256 = "b".repeat(64)

const mixedProductFields: CzechCatalogFieldAttestations = {
  description: {
    method: "official-exact-unique-ean",
    sourceArtifactSha256: OFFICIAL_SHA256,
    sourceRecordSha256: "c".repeat(64),
    sourceReference: "official:field:description",
  },
  subtitle: {
    method: "temporary-ai-from-sk",
    sourceArtifactSha256: TEMPORARY_SHA256,
    sourceRecordSha256: "d".repeat(64),
    sourceReference: "temporary:field:subtitle",
  },
  title: {
    method: "official-exact-unique-ean",
    sourceArtifactSha256: OFFICIAL_SHA256,
    sourceRecordSha256: "e".repeat(64),
    sourceReference: "official:field:title",
  },
}

describe("CZ catalog field provenance", () => {
  it("never promotes a mixed official and temporary product to reviewed", () => {
    const entry = buildCzechCatalogEntry({
      fields: mixedProductFields,
      reference: "product",
      referenceId: "prod_1",
      translations: {
        description: "Oficiální popis",
        subtitle: "Heuristický podtitul",
        title: "Oficiální název",
      },
    })

    expect(entry.provenance).toEqual({
      artifactSha256: OFFICIAL_SHA256,
      method: "ai-generated",
      sourceReference:
        "cz-field-source-attestation:product:prod_1:contains-temporary",
    })
    expect(() =>
      assertCzechCatalogPublicationGrade(
        mixedProductFields,
        ["title", "description"],
        "product:prod_1"
      )
    ).not.toThrow()
    expect(() =>
      assertCzechCatalogPublicationGrade(
        mixedProductFields,
        ["title", "description", "subtitle"],
        "product:prod_1"
      )
    ).toThrow(
      "product:prod_1.subtitle is not publication-grade: temporary-ai-from-sk"
    )
  })

  it("fails closed when a required field is absent or source-null", () => {
    const fields: CzechCatalogFieldAttestations = {
      ...mixedProductFields,
      subtitle: {
        ...mixedProductFields.subtitle,
        method: "source-null",
      },
    }
    expect(() =>
      assertCzechCatalogPublicationGrade(fields, ["subtitle"], "product:prod_1")
    ).toThrow("product:prod_1.subtitle is not publication-grade: source-null")
    expect(() =>
      assertCzechCatalogPublicationGrade(fields, ["unknown"], "product:prod_1")
    ).toThrow("product:prod_1.unknown has no field source attestation")
  })

  it("rejects field attestations that do not exactly cover translations", () => {
    expect(() =>
      buildCzechCatalogEntry({
        fields: mixedProductFields,
        reference: "product",
        referenceId: "prod_1",
        translations: {
          description: "Oficiální popis",
          title: "Oficiální název",
        },
      })
    ).toThrow("translations and field attestations differ")

    expect(() =>
      buildCzechCatalogEntry({
        fields: {
          ...mixedProductFields,
          subtitle: {
            ...mixedProductFields.subtitle,
            method: "source-null",
          },
        },
        reference: "product",
        referenceId: "prod_1",
        translations: {
          description: "Oficiální popis",
          subtitle: "Neprázdný podtitul",
          title: "Oficiální název",
        },
      })
    ).toThrow("null value and source method disagree")
  })

  it("parses exact field evidence and rejects forged publication status", () => {
    const record = {
      fields: mixedProductFields,
      publicationGrade: false,
      reference: "product" as const,
      referenceId: "prod_1",
      sourceReference:
        "cz-field-source-attestation:product:prod_1:contains-temporary",
      translations: {
        description: "Oficiální popis",
        subtitle: "Heuristický podtitul",
        title: "Oficiální název",
      },
    }
    expect(
      parseCzechCatalogSourceAttestation({
        records: [record],
        schemaVersion: 2,
      })
    ).toEqual({ records: [record], schemaVersion: 2 })
    expect(() =>
      parseCzechCatalogSourceAttestation({
        records: [{ ...record, publicationGrade: true }],
        schemaVersion: 2,
      })
    ).toThrow("publicationGrade does not match field evidence")
  })
})

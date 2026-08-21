import { describe, expect, it } from "vitest"
import { parseHungarianCatalogSourceOptions } from "../../../../src/scripts/catalog-source-hu/cli"
import { buildHungarianCatalogSourceBundle } from "../../../../src/scripts/catalog-source-hu/generator"
import type {
  HungarianCatalogSourceContract,
  HungarianCatalogSourceFiles,
} from "../../../../src/scripts/catalog-source-hu/types"
import { stableCatalogTranslationJson } from "../../../../src/scripts/catalog-translation-pipeline/canonical"

const SHA_256 = /^[a-f0-9]{64}$/
const environment = {
  databaseInstanceFingerprint: "a".repeat(64),
  environmentId: "test-engine-catalog",
  kind: "test" as const,
}
const contract: HungarianCatalogSourceContract = {
  brands: 1,
  categories: 1,
  productContents: 1,
  products: 1,
}

const sourceEntries = [
  {
    reference: "brand",
    referenceId: "brand_1",
    translations: { title: "Značka" },
  },
  {
    reference: "product",
    referenceId: "product_1",
    translations: {
      description: "Slovenský opis",
      subtitle: null,
      title: "Slovenský názov",
    },
  },
  {
    reference: "product_category",
    referenceId: "category_1",
    translations: {
      bottom_description_html: null,
      description: "Slovenská kategória",
      meta_description: null,
      meta_title: "Kategória",
      name: "Kategória",
      top_description_html: "<p>Hore</p>",
    },
  },
  {
    reference: "product_content",
    referenceId: "content_1",
    translations: {
      composition: "Zloženie",
      other: "",
      usage: "Použitie",
      warning: null,
    },
  },
] as const

const canonicalSourceManifest = () => ({
  entries: sourceEntries.map((entry) => ({
    ...entry,
    localeCode: "sk-SK",
    provenance: {
      artifactSha256: "b".repeat(64),
      method: "canonical-source",
      sourceReference: "generated-live-canonical-source",
    },
  })),
  environment,
  inventory: contract,
  mode: "normalize-source",
  schemaVersion: 1,
  sourceArtifacts: [
    { path: "/tmp/sk-source-attestation.json", sha256: "b".repeat(64) },
  ],
  sourceLocale: "sk-SK",
  targetLocale: "sk-SK",
})

const translatedRows = () => [
  {
    localeCode: "hu-HU",
    method: "existing-reviewed-artifact",
    reference: "brand",
    referenceId: "brand_1",
    sourceReference: "reviewed-hu-brands#brand_1",
    translations: { title: "Márka" },
  },
  {
    localeCode: "hu-HU",
    method: "ai-generated",
    reference: "product",
    referenceId: "product_1",
    sourceReference: "generated-hu-products#product_1",
    translations: {
      description: "Magyar leírás",
      subtitle: null,
      title: "Magyar terméknév",
    },
  },
  {
    localeCode: "hu-HU",
    method: "ai-generated",
    reference: "product_category",
    referenceId: "category_1",
    sourceReference: "generated-hu-categories#category_1",
    translations: {
      bottom_description_html: null,
      description: "Magyar kategória",
      meta_description: null,
      meta_title: "Kategória",
      name: "Kategória",
      top_description_html: "<p>Fent</p>",
    },
  },
  {
    localeCode: "hu-HU",
    method: "ai-generated",
    reference: "product_content",
    referenceId: "content_1",
    sourceReference: "generated-hu-content#content_1",
    translations: {
      composition: "Összetétel",
      other: null,
      usage: "Használat",
      warning: null,
    },
  },
]

const lines = (values: readonly unknown[]) =>
  Buffer.from(`${values.map((value) => JSON.stringify(value)).join("\n")}\n`)

const files = (
  rows: readonly unknown[] = translatedRows()
): HungarianCatalogSourceFiles => ({
  attestationOutputPath: "/tmp/hu-catalog-source-attestation.json",
  canonicalSourceManifest: Buffer.from(
    JSON.stringify(canonicalSourceManifest())
  ),
  hungarianTranslations: lines(rows),
  sourcePaths: {
    canonicalSourceManifest: "/tmp/sk-catalog-translation-input.json",
    hungarianTranslations: "/tmp/hu-translations.jsonl",
  },
})

describe("Hungarian catalog translation source", () => {
  it("requires exact absolute CLI source and output paths", () => {
    expect(
      parseHungarianCatalogSourceOptions([
        "--canonical-source-manifest",
        "/tmp/sk-input.json",
        "--database-instance-fingerprint",
        "a".repeat(64),
        "--environment-id",
        "test-engine-catalog",
        "--hungarian-translations",
        "/tmp/hu-translations.jsonl",
        "--output-directory",
        "/tmp/hu-output",
      ])
    ).toMatchObject({
      canonicalSourceManifest: "/tmp/sk-input.json",
      hungarianTranslations: "/tmp/hu-translations.jsonl",
      outputDirectory: "/tmp/hu-output",
    })
    expect(() =>
      parseHungarianCatalogSourceOptions([
        "--canonical-source-manifest",
        "sk-input.json",
      ])
    ).toThrow("Missing argument")
  })

  it("builds exact hu-HU entries, preimages, ledger, and semantic attestation", () => {
    const bundle = buildHungarianCatalogSourceBundle(
      files(),
      environment,
      contract
    )

    expect(bundle.manifest.targetLocale).toBe("hu-HU")
    expect(bundle.manifest.entries).toHaveLength(4)
    expect(
      bundle.manifest.entries.every(({ localeCode }) => localeCode === "hu-HU")
    ).toBe(true)
    expect(bundle.preimages).toHaveLength(4)
    expect(bundle.ledger).toHaveLength(4)
    expect(bundle.attestation.records).toHaveLength(4)
    expect(bundle.authority.records).toEqual({
      aiGenerated: 3,
      existingReviewedArtifact: 1,
      total: 4,
    })
    expect(bundle.manifest.sourceArtifacts).toEqual([
      {
        path: "/tmp/hu-catalog-source-attestation.json",
        sha256: bundle.authority.semanticAttestation.sha256,
      },
    ])
    expect(bundle.authority.semanticAttestation.sha256).toMatch(SHA_256)
    expect(bundle.authority.manifestSha256).toMatch(SHA_256)
    expect(bundle.authority.ledgerSha256).toMatch(SHA_256)
    expect(bundle.authority.preimagesSha256).toMatch(SHA_256)
  })

  it("is deterministic and binds both source artifacts by exact bytes", () => {
    const first = buildHungarianCatalogSourceBundle(
      files(),
      environment,
      contract
    )
    const second = buildHungarianCatalogSourceBundle(
      files(),
      environment,
      contract
    )

    expect(stableCatalogTranslationJson(first)).toBe(
      stableCatalogTranslationJson(second)
    )
    expect(Object.values(first.authority.sourceArtifacts)).toEqual([
      expect.stringMatching(SHA_256),
      expect.stringMatching(SHA_256),
    ])
  })

  it("fails closed when Hungarian IDs drift from canonical source", () => {
    const invalid = translatedRows().map((row) =>
      row.reference === "brand" ? { ...row, referenceId: "brand_wrong" } : row
    )

    expect(() =>
      buildHungarianCatalogSourceBundle(files(invalid), environment, contract)
    ).toThrow("IDs do not match the canonical source")
  })

  it("requires every nonblank Slovak source field to be translated", () => {
    const invalid = translatedRows().map((row) =>
      row.reference === "product_content"
        ? {
            ...row,
            translations: { ...row.translations, usage: null },
          }
        : row
    )

    expect(() =>
      buildHungarianCatalogSourceBundle(files(invalid), environment, contract)
    ).toThrow("usage must translate nonblank sk-SK source")
  })

  it("rejects target copy where canonical source is blank", () => {
    const invalid = translatedRows().map((row) =>
      row.reference === "product_content"
        ? {
            ...row,
            translations: { ...row.translations, other: "Kitalált tartalom" },
          }
        : row
    )

    expect(() =>
      buildHungarianCatalogSourceBundle(files(invalid), environment, contract)
    ).toThrow("other must be null when sk-SK source is blank")
  })
})

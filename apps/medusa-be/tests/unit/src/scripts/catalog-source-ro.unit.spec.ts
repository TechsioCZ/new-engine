import { describe, expect, it } from "vitest"
import { buildRomanianCatalogSourceBundle } from "../../../../src/scripts/catalog-source-ro/generator"
import type {
  RomanianCatalogSourceContract,
  RomanianCatalogSourceFiles,
} from "../../../../src/scripts/catalog-source-ro/types"
import { stableCatalogTranslationJson } from "../../../../src/scripts/catalog-translation-pipeline/canonical"

const SHA_256 = /^[a-f0-9]{64}$/

const bytes = (value: unknown) => Buffer.from(JSON.stringify(value))
const lines = (...values: readonly unknown[]) =>
  Buffer.from(`${values.map((value) => JSON.stringify(value)).join("\n")}\n`)

const contract: RomanianCatalogSourceContract = {
  evidenceProducts: { excluded: 1, published: 1, total: 2 },
  inventory: { brands: 2, categories: 2, productContents: 2, products: 2 },
  partitions: {
    brands: { excluded: 1, published: 1, total: 2 },
    categories: { excluded: 1, published: 1, total: 2 },
    products: { excluded: 1, published: 1, total: 2 },
  },
}

const files = (): RomanianCatalogSourceFiles => ({
  attestationOutputPath: "/tmp/ro-semantic-attestation.json",
  catalogEntities: bytes({
    brands_by_medusa_id: {
      brand_1: {
        blue: { sk: { title: "Značka" } },
        candidate_ro: { publishable: true, title: "Marcă" },
        provenance: { title: "official-herbatica-ro-brand-index" },
      },
      brand_2: {
        blue: { sk: { title: "Interná značka" } },
        candidate_ro: { publishable: false, title: "Marcă internă" },
        provenance: { title: "reviewed-neutral" },
      },
    },
  }),
  inventoryEnvelope: bytes({
    inventory: {
      categories: [
        {
          description: "Slovenská kategória",
          key: { kind: "medusa_id", value: "category_1" },
          name: "Kategória",
        },
        {
          description: null,
          key: { kind: "medusa_id", value: "category_2" },
          name: "Interná kategória",
        },
      ],
      products: [
        {
          description: "Slovenský opis",
          id: "product_1",
          productContent: {
            composition: "Zloženie",
            other: "",
            usage: "Použitie",
            warning: "",
          },
          productContentId: "content_1",
          title: "Slovenský názov",
        },
        {
          description: null,
          id: "product_2",
          productContent: {
            composition: "",
            other: "",
            usage: "",
            warning: "",
          },
          productContentId: "content_2",
          title: "Len slovenský názov",
        },
      ],
    },
  }),
  mergedCategories: lines(
    {
      medusa_id: "category_1",
      publication: { status: "publish-candidate" },
      translation: {
        bottom_description_html: null,
        description: "Descriere",
        meta_description: "Meta descriere",
        meta_title: "Titlu meta",
        name: "Categorie",
        top_description_html: "<p>Sus</p>",
      },
    },
    {
      medusa_id: "category_2",
      publication: { status: "excluded-ro-preserve-sk" },
      translation: {
        bottom_description_html: null,
        description: "Descriere neutră",
        meta_description: null,
        meta_title: null,
        name: "Categorie internă",
        top_description_html: null,
      },
    }
  ),
  mergedProducts: lines(
    {
      demo_scope: { decision: "publish-candidate" },
      description_html: "<p>Descriere oficială</p>",
      h1: "Produs oficial",
      matchingStatus: "matched",
      medusaProductId: "product_1",
      short_description_html: "<p>Descriere scurtă</p>",
    },
    {
      demo_scope: { decision: "exclude-unreviewed" },
      matchingStatus: "excluded",
    }
  ),
  rawLiveInventory: bytes({
    categories: [
      {
        id: "category_1",
        metadata: {
          bottom_description_html: "<p>Dole</p>",
          meta_description: "SK meta",
          meta_title: "SK title",
          top_description_html: "<p>Hore</p>",
        },
      },
      {
        id: "category_2",
        metadata: {},
      },
    ],
    products: [
      { id: "product_1", subtitle: "Slovenský podnadpis" },
      { id: "product_2", subtitle: null },
    ],
  }),
  sourcePaths: {
    catalogEntities: "/tmp/catalog-entities.json",
    inventoryEnvelope: "/tmp/inventory-envelope.json",
    mergedCategories: "/tmp/merged-categories.jsonl",
    mergedProducts: "/tmp/merged-products.jsonl",
    rawLiveInventory: "/tmp/raw-live-inventory.json",
  },
})

const environment = {
  databaseInstanceFingerprint: "a".repeat(64),
  environmentId: "test-engine-catalog",
  kind: "test" as const,
}

describe("Romanian catalog translation source", () => {
  it("builds one exact entry and canonical Slovak preimage per entity", () => {
    const bundle = buildRomanianCatalogSourceBundle(
      files(),
      environment,
      contract
    )

    expect(bundle.manifest.entries).toHaveLength(8)
    expect(bundle.manifest.targetLocale).toBe("ro-RO")
    expect(bundle.manifest.sourceArtifacts).toEqual([
      {
        path: "/tmp/ro-semantic-attestation.json",
        sha256: bundle.authority.semanticAttestation.sha256,
      },
    ])
    expect(bundle.attestation.records).toHaveLength(8)
    expect(
      bundle.manifest.entries.every(({ localeCode }) => localeCode === "ro-RO")
    ).toBe(true)
    const declaredArtifactHashes = new Set(
      bundle.manifest.sourceArtifacts.map(({ sha256 }) => sha256)
    )
    expect(
      bundle.manifest.entries.every(({ provenance }) =>
        declaredArtifactHashes.has(provenance.artifactSha256)
      )
    ).toBe(true)
    expect(
      bundle.manifest.entries.every((entry) =>
        bundle.attestation.records.some(
          (record) =>
            record.reference === entry.reference &&
            record.referenceId === entry.referenceId &&
            record.sourceReference === entry.provenance.sourceReference &&
            stableCatalogTranslationJson(record.translations) ===
              stableCatalogTranslationJson(entry.translations)
        )
      )
    ).toBe(true)
    expect(bundle.preimages).toHaveLength(8)
    expect(bundle.authority.partitions).toMatchObject({
      brands: { excludedIds: ["brand_2"], publishedIds: ["brand_1"] },
      categories: {
        excludedIds: ["category_2"],
        publishedIds: ["category_1"],
      },
      products: {
        excludedIds: ["product_2"],
        publishedIds: ["product_1"],
      },
    })
    expect(
      bundle.manifest.entries.find(
        ({ reference, referenceId }) =>
          reference === "product" && referenceId === "product_1"
      )
    ).toMatchObject({
      provenance: { method: "existing-reviewed-artifact" },
      translations: {
        description: "<p>Descriere oficială</p>",
        subtitle: "<p>Descriere scurtă</p>",
        title: "Produs oficial",
      },
    })
    expect(
      bundle.manifest.entries.find(
        ({ reference, referenceId }) =>
          reference === "product" && referenceId === "product_2"
      )
    ).toMatchObject({
      provenance: { method: "ai-generated" },
      translations: {
        description: expect.stringContaining("limba română"),
        subtitle: expect.stringContaining("limba română"),
        title: "Produs Herbatica 1",
      },
    })
    expect(
      bundle.preimages.find(
        ({ reference, referenceId }) =>
          reference === "product_content" && referenceId === "content_1"
      )
    ).toMatchObject({
      values: {
        composition: "Zloženie",
        other: "",
        usage: "Použitie",
        warning: "",
      },
    })
  })

  it("is deterministic and binds every authority hash to exact input bytes", () => {
    const first = buildRomanianCatalogSourceBundle(
      files(),
      environment,
      contract
    )
    const second = buildRomanianCatalogSourceBundle(
      files(),
      environment,
      contract
    )

    expect(stableCatalogTranslationJson(first)).toBe(
      stableCatalogTranslationJson(second)
    )
    expect(first.authority.manifestSha256).toMatch(SHA_256)
    expect(first.authority.preimagesSha256).toMatch(SHA_256)
    expect(Object.values(first.authority.sourceArtifacts)).toEqual(
      expect.arrayContaining([expect.stringMatching(SHA_256)])
    )
  })

  it("fails closed when translated IDs drift from the canonical inventory", () => {
    const invalid = {
      ...files(),
      mergedCategories: lines(
        {
          medusa_id: "wrong_category",
          publication: { status: "publish-candidate" },
          translation: {
            bottom_description_html: null,
            description: null,
            meta_description: null,
            meta_title: null,
            name: "Greșit",
            top_description_html: null,
          },
        },
        {
          medusa_id: "category_2",
          publication: { status: "excluded-ro-preserve-sk" },
          translation: {
            bottom_description_html: null,
            description: null,
            meta_description: null,
            meta_title: null,
            name: "Categorie",
            top_description_html: null,
          },
        }
      ),
    }

    expect(() =>
      buildRomanianCatalogSourceBundle(invalid, environment, contract)
    ).toThrow("category IDs do not match the canonical inventory")
  })
})

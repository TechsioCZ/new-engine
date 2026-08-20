import { createHash } from "node:crypto"
import {
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  buildRoCatalogSkBaselineArtifact,
  parseRoCatalogSkBaselineArtifact,
  parseRoCatalogSkBaselineOutputPath,
  writeRoCatalogSkBaselineArtifact,
} from "../../../../src/scripts/ro-catalog-import/baseline-artifact"
import { assertRoCatalogGenerationProof } from "../../../../src/scripts/ro-catalog-import/generation-proof"
import {
  parseRoCatalogCliOptions,
  parseRoCatalogJson,
  parseRoCatalogJsonl,
} from "../../../../src/scripts/ro-catalog-import/manifest"
import {
  writeRoCatalogOmissionLedger,
  writeRoCatalogPlanArtifact,
} from "../../../../src/scripts/ro-catalog-import/plan-artifact"
import {
  buildExcludedProductPublicationMetadata,
  buildProductPublicationMetadata,
  buildRoCatalogImportPlan,
  hashRoCatalogImportPlan,
} from "../../../../src/scripts/ro-catalog-import/planner"
import {
  assertRoCatalogPostCommerceProvenance,
  assertRoCatalogRuntimeEnvironment,
} from "../../../../src/scripts/ro-catalog-import/provenance"
import {
  assertRoCatalogImportClosed,
  buildLiveDatabaseFingerprint,
} from "../../../../src/scripts/ro-catalog-import/runtime"
import type {
  RoCatalogManifest,
  RoCatalogSnapshot,
} from "../../../../src/scripts/ro-catalog-import/types"
import { parseRoCatalogScopePlanArtifact } from "../../../../src/scripts/ro-catalog-readiness-contract"
import { buildRoDemoDatabaseInstanceFingerprint } from "../../../../src/scripts/ro-demo-commerce/runtime"

const readiness = {
  currencyCode: "ron",
  paymentProviderIds: ["pp_ro"],
  regionId: "reg_ro",
  shippingOptionIds: ["so_ro"],
  taxRegionIds: ["txreg_ro"],
} as const

const stableTestValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(stableTestValue)
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right, "en"))
        .map(([key, entry]) => [key, stableTestValue(entry)])
    )
  }
  return value
}

const testSha256 = (value: unknown) =>
  createHash("sha256")
    .update(JSON.stringify(stableTestValue(value)))
    .digest("hex")

const postCommerceInventoryEvidence = {
  capturedAt: "2026-08-20T12:00:00.000Z",
  commerceApplyReceiptSha256: "d".repeat(64),
  commerceManifestSha256: "f".repeat(64),
  commercePlanFileSha256: "1".repeat(64),
  commercePlanHash: "2".repeat(64),
  commerceRestoreArtifactSha256: "e".repeat(64),
  environment: {
    backendBuildHash: "build-blue-123",
    backendDeploymentId: "deployment-blue-123",
    backendReleaseSha: "c".repeat(40),
    backendSlot: "blue",
    databaseFingerprint: "3".repeat(64),
    databaseInstanceFingerprint: "f".repeat(64),
    environmentId: "zane-production",
    locale: "ro-RO",
    marketCode: "ro",
    salesChannelId: "sc_ro",
  },
  kind: "ro-demo-post-commerce-envelope",
  observedCommerceSnapshotSha256: "4".repeat(64),
  payloadSha256: "5".repeat(64),
  postCommerceEnvelopeSha256: "6".repeat(64),
  postCommerceSharedInventoryFingerprint: {
    count: 2151,
    sha256: "7".repeat(64),
  },
  postCommerceSkBaseline: {
    count: 4,
    errors: [],
    sha256: "8".repeat(64),
  },
  preCommerceSharedInventoryFingerprint: {
    count: 2151,
    sha256: "7".repeat(64),
  },
  preCommerceSkBaseline: {
    count: 4,
    errors: [],
    sha256: "8".repeat(64),
  },
  preCommerceSkBaselineArtifactSha256: "0".repeat(64),
  priceAuthoritySha256: "9".repeat(64),
  rawLiveInventorySha256: "a".repeat(64),
  schemaVersion: 1,
  sourceInventoryEnvelopeSha256: "b".repeat(64),
} as const

const skProtection = {
  baseline: { count: 0, sha256: "0".repeat(64) },
  issues: [],
  publication: {
    brands: 0,
    categories: 0,
    collections: 0,
    errors: 0,
    products: 0,
  },
  sharedInventoryBaseline: { count: 0, sha256: "f".repeat(64) },
} as const

describe("RO catalog SK baseline artifact", () => {
  it("requires one absolute JSON output path", () => {
    expect(
      parseRoCatalogSkBaselineOutputPath(["--output=/tmp/sk-baseline.json"])
    ).toBe("/tmp/sk-baseline.json")
    expect(() => parseRoCatalogSkBaselineOutputPath([])).toThrow(
      "--output is required"
    )
    expect(() =>
      parseRoCatalogSkBaselineOutputPath(["--output=relative.json"])
    ).toThrow("--output must be an absolute .json path")
    expect(() =>
      parseRoCatalogSkBaselineOutputPath([
        "--output=/tmp/one.json",
        "--output=/tmp/two.json",
      ])
    ).toThrow("--output may only be supplied once")
  })

  it("writes the fresh canonical baseline as a private artifact", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ro-sk-baseline-"))
    try {
      const outputPath = join(directory, "baseline.json")
      const artifact = buildRoCatalogSkBaselineArtifact(
        {
          ...skProtection,
          baseline: { count: 4, sha256: "a".repeat(64) },
        },
        "2026-08-20T12:00:00.000Z"
      )
      await writeRoCatalogSkBaselineArtifact(outputPath, artifact)
      expect(JSON.parse(await readFile(outputPath, "utf8"))).toEqual(artifact)
      expect(parseRoCatalogSkBaselineArtifact(artifact)).toEqual(artifact)
      expect((await stat(outputPath)).mode.toString(8).slice(-3)).toBe("600")
    } finally {
      await rm(directory, { recursive: true })
    }
  })

  it("never replaces an existing baseline and cleans its temporary file", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ro-sk-baseline-existing-"))
    try {
      const outputPath = join(directory, "baseline.json")
      const original = "reviewed immutable baseline\n"
      await writeFile(outputPath, original, { mode: 0o600 })
      const artifact = buildRoCatalogSkBaselineArtifact(skProtection)

      await expect(
        writeRoCatalogSkBaselineArtifact(outputPath, artifact)
      ).rejects.toMatchObject({ code: "EEXIST" })
      expect(await readFile(outputPath, "utf8")).toBe(original)
      expect(await readdir(directory)).toEqual(["baseline.json"])
    } finally {
      await rm(directory, { recursive: true })
    }
  })

  it("refuses to capture an SK baseline with publication errors", () => {
    expect(() =>
      buildRoCatalogSkBaselineArtifact({
        ...skProtection,
        issues: [
          {
            code: "SK_PUBLICATION_INVALID",
            entityKind: "catalog",
            message: "invalid",
            severity: "error",
          },
        ],
        publication: { ...skProtection.publication, errors: 1 },
      })
    ).toThrow("Cannot capture an SK baseline")
  })

  it("strictly parses the complete SK protection artifact", () => {
    const artifact = buildRoCatalogSkBaselineArtifact(skProtection)
    expect(() =>
      parseRoCatalogSkBaselineArtifact({ ...artifact, extra: true })
    ).toThrow("fields are invalid")
    expect(() =>
      parseRoCatalogSkBaselineArtifact({
        ...artifact,
        skProtection: {
          ...artifact.skProtection,
          publication: { ...artifact.skProtection.publication, errors: 1 },
        },
      })
    ).toThrow("must match error-severity issues")
  })
})

const product = {
  key: { kind: "sku", value: "HERB-001" },
  productContent: {
    composition: "Compoziție",
    other: "",
    usage: "Utilizare",
    warning: "Avertisment",
  },
  publicationStatus: "published",
  publicSlug: "produs-romanesc",
  source: {
    contentSha256:
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    retrievedAt: "2026-08-20T10:00:00.000Z",
    url: "https://herbatica.ro/produs-romanesc",
  },
  translation: {
    description: "Descriere românească",
    title: "Produs românesc",
  },
  variants: [
    {
      key: { kind: "ean", value: "8580000000001" },
      roAvailability: "sellable",
      ronPrice: {
        amount: 4990,
        approval: {
          approvedAt: "2026-08-20T09:00:00.000Z",
          approvedBy: "commercial@example.com",
          reference: "RO-PRICE-1",
        },
        currencyCode: "ron",
      },
    },
  ],
} as const

const manifest: RoCatalogManifest = {
  brandInventory: { count: 0 },
  brands: [],
  categories: [],
  collectionInventory: { count: 0 },
  excludedCategories: [],
  excludedBrands: [],
  excludedProducts: [],
  locale: "ro-RO",
  market: "ro",
  postCommerceInventoryEvidence,
  products: [product],
  readiness,
  schemaVersion: 1,
}

const snapshot = (
  overrides: Partial<RoCatalogSnapshot> = {}
): RoCatalogSnapshot => ({
  brandAssignments: [],
  brands: [],
  categories: [],
  categoryAssignments: [],
  commerceReadiness: {
    paymentProviders: [{ enabled: true, id: "pp_ro", regionIds: ["reg_ro"] }],
    regions: [{ countryCodes: ["ro"], currencyCode: "ron", id: "reg_ro" }],
    shippingOptions: [{ countryCodes: ["ro"], id: "so_ro" }],
    taxRegions: [{ countryCode: "ro", id: "txreg_ro" }],
  },
  collectionIds: [],
  contents: [],
  products: [
    {
      categoryIds: [],
      description: "Slovenský popis",
      externalId: "EXT-001",
      id: "prod_1",
      metadata: {
        legacy: true,
        url_registry_publication: {
          markets: {
            sk: {
              publicationStatus: "draft",
              publicSlug: "slovensky-produkt",
              salesChannelId: "sc_sk",
            },
          },
          schemaVersion: 1,
        },
      },
      salesChannelIds: ["sc_sk", "sc_ro"],
      sourceContent: {
        composition: "Slovenské zloženie",
        other: "",
        usage: "Slovenské použitie",
        warning: "",
      },
      status: "published",
      title: "Slovenský produkt",
      variants: [
        {
          ean: "8580000000001",
          id: "variant_1",
          prices: [{ amount: 4990, currencyCode: "ron" }],
          sku: "HERB-001",
        },
      ],
    },
  ],
  salesChannels: [
    {
      id: "sc_ro",
      metadata: {
        storefront_notification_markets: {
          ro: {
            country_code: "ro",
            locale: "ro-RO",
            market_code: "ro",
            store_name: "Herbatica Romania",
            storefront_domain: "example.ro",
          },
        },
      },
    },
    {
      id: "sc_sk",
      metadata: {
        storefront_notification_markets: {
          sk: {
            country_code: "sk",
            locale: "sk-SK",
            market_code: "sk",
            store_name: "Herbatica Slovensko",
            storefront_domain: "example.sk",
          },
        },
      },
    },
  ],
  skProtection,
  translations: [],
  ...overrides,
})

const category = {
  expectedDirectChildCount: 0,
  expectedDirectProductCount: 0,
  key: { kind: "source_guid", value: "RO-CATEGORY-GUID-1" },
  parentKey: null,
  publicationStatus: "published",
  publicSlug: "suplimente-nutritive",
  salesChannelId: "sc_ro",
  source: {
    contentSha256:
      "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
    retrievedAt: "2026-08-20T11:00:00.000Z",
    url: "https://herbatica.ro/suplimente-nutritive/",
  },
  translation: {
    bottom_description_html: "<p>Conținut inferior</p>",
    description: "Descriere de categorie",
    meta_description: "Descriere SEO",
    meta_title: "Titlu SEO",
    name: "Suplimente nutritive",
    top_description_html: "<p>Conținut superior</p>",
  },
} as const

const categoryManifest: RoCatalogManifest = {
  ...manifest,
  categories: [category],
  categoryInventory: { activeCount: 1, rootCount: 1 },
}

const categorySnapshot = (
  overrides: Partial<RoCatalogSnapshot> = {}
): RoCatalogSnapshot =>
  snapshot({
    categories: [
      {
        description: "Slovenský popis kategórie",
        directProductIds: [],
        id: "pcat_1",
        isActive: true,
        metadata: {
          source: "herbatica-categories-xml",
          source_guid: "RO-CATEGORY-GUID-1",
          top_description_html: "<p>Slovenský horný text</p>",
        },
        name: "Doplnky výživy",
        parentId: null,
      },
    ],
    ...overrides,
  })

describe("RO catalog manifest", () => {
  it("binds the reviewed generation plan, input hash, and exact manifest", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ro-generation-plan-"))
    try {
      const outputPath = join(directory, "bundle.json")
      const demoOmissionLedger = {
        entries: [],
        mode: "official-ro-description-only",
        schemaVersion: 1,
      }
      const planWithoutHash = {
        authorization: { mode: "reviewed-demo" },
        bootstrap: null,
        coverage: {},
        demoOmissionLedger,
        demoOmissionLedgerSha256: testSha256(demoOmissionLedger),
        exclusions: { inventoryProducts: [], officialProducts: [] },
        generatedAt: "2026-08-20T12:00:00.000Z",
        inputSha256: "1".repeat(64),
        manifest: categoryManifest,
        manifestSha256: testSha256(categoryManifest),
        provenance: [],
        warnings: [],
      }
      const bundle = {
        ...planWithoutHash,
        generationPlanSha256: testSha256(planWithoutHash),
      }
      await writeFile(outputPath, `${JSON.stringify(bundle, null, 2)}\n`)
      await expect(
        assertRoCatalogGenerationProof(outputPath, categoryManifest)
      ).resolves.toEqual({
        generationPlanSha256: bundle.generationPlanSha256,
        inputSha256: planWithoutHash.inputSha256,
        manifestSha256: planWithoutHash.manifestSha256,
      })
      await writeFile(
        outputPath,
        `${JSON.stringify({ ...bundle, inputSha256: "2".repeat(64) })}\n`
      )
      await expect(
        assertRoCatalogGenerationProof(outputPath, categoryManifest)
      ).rejects.toThrow("generationPlanSha256 does not match")
    } finally {
      await rm(directory, { recursive: true })
    }
  })

  it("binds apply to the reviewed live deployment environment", () => {
    const environment = postCommerceInventoryEvidence.environment
    const runtimeEnvironment = {
      BACKEND_BUILD_HASH: environment.backendBuildHash,
      DATABASE_URL: "postgresql://user:secret@db.internal:5432/medusa",
      RELEASE_SHA: environment.backendReleaseSha,
      RO_DEMO_DATABASE_INSTANCE_ID: "zane-blue-medusa-primary",
      RO_DEMO_ENVIRONMENT_ID: environment.environmentId,
      ZANE_DEPLOYMENT_ID: environment.backendDeploymentId,
      ZANE_DEPLOYMENT_SLOT: environment.backendSlot,
    }
    const boundManifest = {
      ...manifest,
      postCommerceInventoryEvidence: {
        ...manifest.postCommerceInventoryEvidence,
        environment: {
          ...environment,
          databaseInstanceFingerprint:
            buildRoDemoDatabaseInstanceFingerprint(runtimeEnvironment),
        },
      },
    } as const
    expect(
      assertRoCatalogRuntimeEnvironment(boundManifest, runtimeEnvironment)
    ).toMatchObject({ environmentId: environment.environmentId })
    expect(() =>
      assertRoCatalogRuntimeEnvironment(boundManifest, {
        ...runtimeEnvironment,
        RO_DEMO_DATABASE_INSTANCE_ID: "restored-clone",
      })
    ).toThrow("does not match")
  })

  it("rehashes and exactly binds the fresh post-commerce envelope", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ro-post-commerce-"))
    try {
      const outputPath = join(directory, "post-commerce.json")
      const payload = { readiness, salesChannelId: "sc_ro" }
      const payloadSha256 = createHash("sha256")
        .update(JSON.stringify(payload))
        .digest("hex")
      const { postCommerceEnvelopeSha256: _ignoredEnvelopeHash, ...proof } =
        postCommerceInventoryEvidence
      const envelope = { ...proof, payload, payloadSha256 }
      const bytes = `${JSON.stringify(envelope, null, 2)}\n`
      await writeFile(outputPath, bytes)
      const evidence = {
        ...postCommerceInventoryEvidence,
        payloadSha256,
        postCommerceEnvelopeSha256: createHash("sha256")
          .update(bytes)
          .digest("hex"),
      }
      await expect(
        assertRoCatalogPostCommerceProvenance(
          outputPath,
          { ...manifest, postCommerceInventoryEvidence: evidence },
          new Date("2026-08-20T12:10:00.000Z")
        )
      ).resolves.toEqual(evidence)
      await writeFile(outputPath, `${bytes}\n`)
      await expect(
        assertRoCatalogPostCommerceProvenance(
          outputPath,
          { ...manifest, postCommerceInventoryEvidence: evidence },
          new Date("2026-08-20T12:10:00.000Z")
        )
      ).rejects.toThrow("does not exactly match")
    } finally {
      await rm(directory, { recursive: true })
    }
  })

  it("parses strict JSON and defaults CLI execution to dry-run", () => {
    const productOnlyJson = JSON.stringify({
      ...manifest,
      categories: undefined,
    })
    expect(parseRoCatalogJson(productOnlyJson)).toEqual(manifest)
    expect(
      parseRoCatalogCliOptions([
        "--generation-plan",
        "/tmp/bundle.json",
        "--manifest",
        "catalog.json",
        "--plan-output",
        "/tmp/ro-plan.json",
        "--post-commerce-envelope",
        "/tmp/post-commerce.json",
      ])
    ).toEqual({
      apply: false,
      chunkSize: 25,
      confirmPlanHash: undefined,
      generationPlanPath: "/tmp/bundle.json",
      manifestPath: "catalog.json",
      omissionLedgerOutputPath: undefined,
      planOutputPath: "/tmp/ro-plan.json",
      postCommerceEnvelopePath: "/tmp/post-commerce.json",
      salesChannelId: undefined,
    })
  })

  it("accepts only a canonical lowercase SHA-256 plan confirmation", () => {
    const hash = "a".repeat(64)
    expect(
      parseRoCatalogCliOptions([
        "--generation-plan",
        "/tmp/bundle.json",
        "--manifest",
        "catalog.json",
        "--confirm-plan-hash",
        hash,
        "--plan-output",
        "/tmp/ro-plan.json",
        "--post-commerce-envelope",
        "/tmp/post-commerce.json",
        "--apply",
      ])
    ).toMatchObject({ apply: true, confirmPlanHash: hash })
    expect(() =>
      parseRoCatalogCliOptions([
        "--manifest",
        "catalog.json",
        "--confirm-plan-hash",
        "not-a-hash",
        "--plan-output",
        "/tmp/ro-plan.json",
      ])
    ).toThrow("duplicated or invalid")
    expect(() =>
      parseRoCatalogCliOptions([
        "--manifest",
        "catalog.json",
        "--plan-output",
        "relative-plan.json",
      ])
    ).toThrow("absolute path")
  })

  it("parses a reviewed exact Medusa-ID exclusion", () => {
    const excludedProduct = {
      decision: {
        approvedAt: "2026-08-20T12:00:00.000Z",
        approvedBy: "catalog-owner@example.com",
        reference: "RO-EXCLUSION-1",
      },
      key: { kind: "medusa_id", value: "prod_unmapped" },
      reason: "No exact product on the official Romanian source",
      source: {
        contentSha256: "b".repeat(64),
        retrievedAt: "2026-08-20T11:30:00.000Z",
        url: "https://herbatica.ro/sitemap_index.xml",
      },
    } as const
    expect(
      parseRoCatalogJson(
        JSON.stringify({
          ...manifest,
          categories: undefined,
          excludedProducts: [excludedProduct],
        })
      ).excludedProducts
    ).toEqual([excludedProduct])
  })

  it("parses JSONL only when all lines carry identical readiness", () => {
    const line = JSON.stringify({
      locale: "ro-RO",
      market: "ro",
      postCommerceInventoryEvidence,
      product,
      readiness,
      schemaVersion: 1,
    })
    expect(parseRoCatalogJsonl(line).products).toEqual([product])
    expect(() =>
      parseRoCatalogJsonl(
        `${line}\n${JSON.stringify({
          locale: "ro-RO",
          market: "ro",
          postCommerceInventoryEvidence,
          product: { ...product, key: { kind: "sku", value: "HERB-002" } },
          readiness: { ...readiness, regionId: "reg_other" },
          schemaVersion: 1,
        })}`
      )
    ).toThrow("identical readiness")
  })

  it("rejects sellable variants without an approved RON price", () => {
    const invalid = {
      ...manifest,
      products: [
        {
          ...product,
          variants: [
            {
              key: { kind: "ean", value: "8580000000001" },
              roAvailability: "sellable",
            },
          ],
        },
      ],
    }
    expect(() => parseRoCatalogJson(JSON.stringify(invalid))).toThrow(
      "ronPrice must be an object"
    )
  })

  it("requires category inventory whenever category payloads are present", () => {
    expect(() =>
      parseRoCatalogJson(JSON.stringify({ ...manifest, categories: [{}] }))
    ).toThrow("must be supplied together")
  })

  it("parses the exact locale-scoped category content contract", () => {
    expect(parseRoCatalogJson(JSON.stringify(categoryManifest))).toEqual(
      categoryManifest
    )
    expect(() =>
      parseRoCatalogJson(
        JSON.stringify({
          ...categoryManifest,
          categories: [
            {
              ...category,
              translation: {
                ...category.translation,
                meta_title: undefined,
              },
            },
          ],
        })
      )
    ).toThrow("translation is missing field meta_title")
  })
})

describe("RO catalog import plan", () => {
  it("publishes plan and omission artifacts privately without clobbering", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ro-import-artifacts-"))
    try {
      const planPath = join(directory, "plan.json")
      const ledgerPath = join(directory, "ledger.json")
      const plan = buildRoCatalogImportPlan(manifest, snapshot(), {
        salesChannelId: "sc_ro",
      })
      const planHash = hashRoCatalogImportPlan(plan)
      const ledger = {
        entries: [],
        mode: "official-ro-description-only",
        schemaVersion: 1,
      } as const
      await writeRoCatalogPlanArtifact(planPath, plan, planHash)
      await writeRoCatalogOmissionLedger(ledgerPath, ledger)
      const originalPlan = await readFile(planPath, "utf8")
      const originalLedger = await readFile(ledgerPath, "utf8")
      expect((await stat(planPath)).mode.toString(8).slice(-3)).toBe("600")
      expect((await stat(ledgerPath)).mode.toString(8).slice(-3)).toBe("600")

      await expect(
        writeRoCatalogPlanArtifact(planPath, plan, planHash)
      ).rejects.toMatchObject({ code: "EEXIST" })
      await expect(
        writeRoCatalogOmissionLedger(ledgerPath, ledger)
      ).rejects.toMatchObject({ code: "EEXIST" })
      expect(await readFile(planPath, "utf8")).toBe(originalPlan)
      expect(await readFile(ledgerPath, "utf8")).toBe(originalLedger)
      expect((await readdir(directory)).sort()).toEqual([
        "ledger.json",
        "plan.json",
      ])
    } finally {
      await rm(directory, { recursive: true })
    }
  })

  it("recomputes the post-commerce database identity from live IDs", () => {
    const liveSnapshot = snapshot()
    expect(
      buildLiveDatabaseFingerprint(
        liveSnapshot.products,
        ["store_2", "store_1"],
        "sc_ro"
      )
    ).toBe(
      testSha256({
        moduleIdentity: "medusa-v2:product-variant-inventory",
        productIds: ["prod_1"],
        salesChannelId: "sc_ro",
        storeIds: ["store_1", "store_2"],
        variantIds: ["variant_1"],
      })
    )
  })

  it("plans exact translations, preserves source content, and updates only RO publication", () => {
    const plan = buildRoCatalogImportPlan(manifest, snapshot(), {
      salesChannelId: "sc_ro",
    })
    expect(plan.summary).toEqual({
      brandAssignmentsToCreate: 0,
      brandAssignmentsToUpdate: 0,
      brands: 0,
      brandTranslationsToCreate: 0,
      brandTranslationsToUpdate: 0,
      brandExclusionsToDraft: 0,
      categories: 0,
      categoryExclusionsToDraft: 0,
      categoryAssignmentsToCreate: 0,
      categoryAssignmentsToUpdate: 0,
      categoryTranslationsToCreate: 0,
      categoryTranslationsToUpdate: 0,
      contentRecordsToCreate: 1,
      excludedCategories: 0,
      excludedBrands: 0,
      excludedCategoryTranslationsToCreate: 0,
      excludedCategoryTranslationsToUpdate: 0,
      excludedProducts: 0,
      exclusionsToDraft: 0,
      products: 1,
      publicationsToUpdate: 1,
      translationsToCreate: 2,
      translationsToUpdate: 0,
      unchangedCategoryAssignments: 0,
      unchangedCategoryTranslations: 0,
      unchangedTranslations: 0,
    })
    expect(plan.items[0].content.baseValues.composition).toBe(
      "Slovenské zloženie"
    )
    expect(plan.items[0].content.translation.translations.composition).toBe(
      "Compoziție"
    )

    const metadata = buildProductPublicationMetadata(
      snapshot().products[0].metadata,
      plan.items[0]
    ) as Record<string, unknown>
    expect(metadata.legacy).toBe(true)
    expect(metadata).toMatchObject({
      url_registry_publication: {
        markets: {
          ro: {
            publicationStatus: "published",
            publicSlug: "produs-romanesc",
            salesChannelId: "sc_ro",
          },
          sk: {
            publicSlug: "slovensky-produkt",
            salesChannelId: "sc_sk",
          },
        },
      },
    })
  })

  it("moves a legacy RO publication to the explicit reviewed sales channel", () => {
    const current = snapshot()
    const productState = current.products[0]
    const plan = buildRoCatalogImportPlan(
      manifest,
      snapshot({
        products: [
          {
            ...productState,
            metadata: {
              ...productState.metadata,
              url_registry_publication: {
                markets: {
                  ro: {
                    publicationStatus: "draft",
                    publicSlug: "legacy-ro-slug",
                    salesChannelId: "sc_legacy",
                  },
                  sk: {
                    publicationStatus: "draft",
                    publicSlug: "slovensky-produkt",
                    salesChannelId: "sc_sk",
                  },
                },
                schemaVersion: 1,
              },
            },
            salesChannelIds: ["sc_sk", "sc_legacy", "sc_ro"],
          },
        ],
      }),
      { salesChannelId: "sc_ro" }
    )

    expect(plan.items[0].publication).toMatchObject({
      action: "update",
      salesChannelId: "sc_ro",
    })
    expect(plan.items[0].publication.previousRoAssignment).toMatchObject({
      salesChannelId: "sc_legacy",
    })
  })

  it("blocks a legacy published RO route until it is retired before translation", () => {
    const current = snapshot()
    const productState = current.products[0]
    expect(() =>
      buildRoCatalogImportPlan(
        manifest,
        snapshot({
          products: [
            {
              ...productState,
              metadata: {
                ...productState.metadata,
                url_registry_publication: {
                  markets: {
                    ro: {
                      publicationStatus: "published",
                      publicSlug: "legacy-ro-slug",
                      salesChannelId: "sc_legacy",
                    },
                  },
                  schemaVersion: 1,
                },
              },
              salesChannelIds: ["sc_legacy", "sc_ro"],
            },
          ],
        }),
        { salesChannelId: "sc_ro" }
      )
    ).toThrow("retire it, verify URL-registry delivery")
  })

  it("plans the exact full brand inventory without mutating shared handles", () => {
    const brand = {
      key: { kind: "medusa_id", value: "brand_1" },
      publicationStatus: "published",
      publicSlug: "marca-romaneasca",
      salesChannelId: "sc_ro",
      source: {
        contentSha256: "e".repeat(64),
        retrievedAt: "2026-08-20T12:00:00.000Z",
        url: "https://herbatica.ro/marci/marca-romaneasca/",
      },
      translation: { title: "Marcă românească" },
    } as const
    const plan = buildRoCatalogImportPlan(
      {
        ...manifest,
        brandInventory: { count: 1 },
        brands: [brand],
      },
      snapshot({ brands: [{ id: "brand_1", title: "Slovenská značka" }] }),
      { salesChannelId: "sc_ro" }
    )
    expect(plan.brandItems).toMatchObject([
      {
        assignment: { action: "create", nextSourceVersion: 1 },
        brandId: "brand_1",
        translation: {
          action: "create",
          reference: "brand",
          translations: brand.translation,
        },
      },
    ])
    expect(plan.scope).toMatchObject({
      brandIds: ["brand_1"],
      collectionIds: [],
    })
    expect(plan.scopeSha256).toMatch(/^[a-f0-9]{64}$/)
  })

  it("partitions non-publishable brands into decision-backed RO drafts", () => {
    const publishedBrand = {
      key: { kind: "medusa_id", value: "brand_1" },
      publicationStatus: "published",
      publicSlug: "marca-romaneasca",
      salesChannelId: "sc_ro",
      source: {
        contentSha256: "e".repeat(64),
        retrievedAt: "2026-08-20T12:00:00.000Z",
        url: "https://herbatica.ro/marci/marca-romaneasca/",
      },
      translation: { title: "Marcă românească" },
    } as const
    const excludedBrand = {
      decision: {
        approvedAt: "2026-08-20T12:30:00.000Z",
        approvedBy: "catalog-owner@example.com",
        reference: "RO-BRAND-EXCLUSION-1",
      },
      key: { kind: "medusa_id", value: "brand_legacy" },
      reason: "No approved official Romanian brand counterpart",
      source: {
        contentSha256: "f".repeat(64),
        retrievedAt: "2026-08-20T12:00:00.000Z",
        url: "https://herbatica.ro/marcile-vandute/",
      },
    } as const
    const excludedUnassignedBrand = {
      ...excludedBrand,
      decision: {
        ...excludedBrand.decision,
        reference: "RO-BRAND-EXCLUSION-2",
      },
      key: { kind: "medusa_id", value: "brand_unassigned" },
    } as const
    const plan = buildRoCatalogImportPlan(
      {
        ...manifest,
        brandInventory: { count: 3 },
        brands: [publishedBrand],
        excludedBrands: [excludedBrand, excludedUnassignedBrand],
      },
      snapshot({
        brandAssignments: [
          {
            entityId: "brand_legacy",
            id: "sfuasn_brand_legacy",
            marketCode: "ro",
            publicationStatus: "published",
            publicSlug: "marca-veche",
            salesChannelId: "sc_ro",
            sourceVersion: 2,
            updatedAt: "2026-08-20T12:00:00.000Z",
          },
        ],
        brands: [
          { id: "brand_1", title: "Slovenská značka" },
          { id: "brand_legacy", title: "Stará značka" },
          { id: "brand_unassigned", title: "Nezaradená značka" },
        ],
      }),
      { salesChannelId: "sc_ro" }
    )
    expect(plan.excludedBrandItems).toMatchObject([
      { action: "draft", brandId: "brand_legacy", nextSourceVersion: 3 },
      {
        action: "unchanged",
        brandId: "brand_unassigned",
        nextSourceVersion: 1,
        previous: null,
      },
    ])
    expect(plan.scope).toMatchObject({
      brandExcludedIds: ["brand_legacy", "brand_unassigned"],
      brandIds: ["brand_1"],
    })
  })

  it("drafts only the RO publication for an approved unmapped product", () => {
    const current = snapshot()
    const excludedProduct = {
      ...current.products[0],
      externalId: null,
      id: "prod_unmapped",
      metadata: {
        untouched: "source",
        url_registry_publication: {
          markets: {
            ro: {
              publicationStatus: "published",
              publicSlug: "legacy-ro-product",
              salesChannelId: "sc_ro",
            },
            sk: {
              publicationStatus: "published",
              publicSlug: "slovensky-produkt-2",
              salesChannelId: "sc_sk",
            },
          },
          schemaVersion: 1,
        },
      },
      variants: [],
    }
    const exclusion = {
      decision: {
        approvedAt: "2026-08-20T12:00:00.000Z",
        approvedBy: "catalog-owner@example.com",
        reference: "RO-EXCLUSION-1",
      },
      key: { kind: "medusa_id", value: "prod_unmapped" },
      reason: "No exact product on the official Romanian source",
      source: {
        contentSha256: "b".repeat(64),
        retrievedAt: "2026-08-20T11:30:00.000Z",
        url: "https://herbatica.ro/sitemap_index.xml",
      },
    } as const
    const plan = buildRoCatalogImportPlan(
      { ...manifest, excludedProducts: [exclusion] },
      snapshot({ products: [...current.products, excludedProduct] }),
      { salesChannelId: "sc_ro" }
    )
    expect(plan.excludedItems).toMatchObject([
      { action: "draft", productId: "prod_unmapped" },
    ])
    const metadata = buildExcludedProductPublicationMetadata(
      excludedProduct.metadata,
      plan.excludedItems[0]
    )
    expect(metadata).toMatchObject({
      untouched: "source",
      url_registry_publication: {
        markets: {
          ro: {
            publicationStatus: "draft",
            publicSlug: "legacy-ro-product",
            salesChannelId: "sc_ro",
          },
          sk: {
            publicationStatus: "published",
            publicSlug: "slovensky-produkt-2",
            salesChannelId: "sc_sk",
          },
        },
      },
    })
    const rerunProduct = { ...excludedProduct, metadata }
    expect(
      buildRoCatalogImportPlan(
        { ...manifest, excludedProducts: [exclusion] },
        snapshot({ products: [...current.products, rerunProduct] }),
        { salesChannelId: "sc_ro" }
      ).excludedItems[0].action
    ).toBe("unchanged")
  })

  it("requires included and excluded products to exactly partition published inventory", () => {
    const current = snapshot()
    const unclaimed = {
      ...current.products[0],
      externalId: null,
      id: "prod_unclaimed",
      metadata: {},
      variants: [],
    }
    expect(() =>
      buildRoCatalogImportPlan(
        manifest,
        snapshot({ products: [...current.products, unclaimed] }),
        { salesChannelId: "sc_ro" }
      )
    ).toThrow("missing=[prod_unclaimed]")
    expect(() =>
      buildRoCatalogImportPlan(
        manifest,
        snapshot({
          products: [{ ...current.products[0], status: "draft" }],
        }),
        { salesChannelId: "sc_ro" }
      )
    ).toThrow("extra=[prod_1]")
  })

  it("rejects included and excluded keys that resolve to the same product", () => {
    expect(() =>
      buildRoCatalogImportPlan(
        {
          ...manifest,
          excludedProducts: [
            {
              decision: {
                approvedAt: "2026-08-20T12:00:00.000Z",
                approvedBy: "catalog-owner@example.com",
                reference: "RO-EXCLUSION-OVERLAP",
              },
              key: { kind: "medusa_id", value: "prod_1" },
              reason: "Reviewed collision fixture",
              source: {
                contentSha256: "c".repeat(64),
                retrievedAt: "2026-08-20T11:30:00.000Z",
                url: "https://herbatica.ro/sitemap_index.xml",
              },
            },
          ],
        },
        snapshot(),
        { salesChannelId: "sc_ro" }
      )
    ).toThrow("resolve to the same product prod_1")
  })

  it("emits a hash-bound description-only omission ledger from resolved IDs", () => {
    const previousSecret = process.env.RO_DEMO_OMISSION_AUTHORITY_SECRET
    process.env.RO_DEMO_OMISSION_AUTHORITY_SECRET = "test-secret-".repeat(4)
    const current = snapshot()
    const descriptionOnlyProduct = {
      ...product,
      productContent: { composition: "", other: "", usage: "", warning: "" },
    } as const
    try {
      const plan = buildRoCatalogImportPlan(
        {
          ...manifest,
          omissionMode: "official-ro-description-only",
          products: [descriptionOnlyProduct],
        },
        snapshot({
          contents: [
            {
              ...current.products[0].sourceContent,
              id: "pcont_1",
              productId: "prod_1",
            },
          ],
        }),
        { salesChannelId: "sc_ro" }
      )
      expect(plan.omissionLedger).toMatchObject({
        entries: [
          {
            omittedFields: ["usage", "composition", "warning", "other"],
            productContentId: "pcont_1",
            productId: "prod_1",
            sourceContentSha256: product.source.contentSha256,
            sourceUrl: product.source.url,
          },
        ],
        mode: "official-ro-description-only",
        schemaVersion: 1,
      })
      expect(plan.omissionLedger?.entries[0].roDescriptionSha256).toMatch(
        /^[a-f0-9]{64}$/
      )
      expect(plan.omissionLedgerSha256).toMatch(/^[a-f0-9]{64}$/)
      expect(
        plan.items[0].content.translation.translations.__demo_omission_authority
      ).toMatchObject({
        ledgerSha256: plan.omissionLedgerSha256,
        signature: expect.stringMatching(/^hmac-sha256:[a-f0-9]{64}$/),
      })
    } finally {
      if (previousSecret === undefined) {
        process.env.RO_DEMO_OMISSION_AUTHORITY_SECRET = undefined
      } else {
        process.env.RO_DEMO_OMISSION_AUTHORITY_SECRET = previousSecret
      }
    }
  })

  it("blocks apply when the Romanian region still uses EUR", () => {
    const state = snapshot({
      commerceReadiness: {
        ...snapshot().commerceReadiness,
        regions: [{ countryCodes: ["ro"], currencyCode: "eur", id: "reg_ro" }],
      },
    })
    expect(() =>
      buildRoCatalogImportPlan(manifest, state, {
        salesChannelId: "sc_ro",
      })
    ).toThrow("refusing to reinterpret another currency")
  })

  it("blocks a sellable variant whose actual RON price differs from approval", () => {
    const current = snapshot()
    const state = snapshot({
      products: [
        {
          ...current.products[0],
          variants: [
            {
              ...current.products[0].variants[0],
              prices: [{ amount: 5990, currencyCode: "ron" }],
            },
          ],
        },
      ],
    })
    expect(() =>
      buildRoCatalogImportPlan(manifest, state, {
        salesChannelId: "sc_ro",
      })
    ).toThrow("business-approved RON price 4990")
  })

  it("blocks disabled or unlinked RO payment providers", () => {
    const state = snapshot({
      commerceReadiness: {
        ...snapshot().commerceReadiness,
        paymentProviders: [
          { enabled: false, id: "pp_ro", regionIds: ["reg_ro"] },
        ],
      },
    })
    expect(() =>
      buildRoCatalogImportPlan(manifest, state, {
        salesChannelId: "sc_ro",
      })
    ).toThrow("payment provider pp_ro is not enabled")
  })

  it("blocks source-content backfill for an SK-published product", () => {
    const current = snapshot()
    const productState = current.products[0]
    expect(() =>
      buildRoCatalogImportPlan(
        manifest,
        snapshot({
          products: [
            {
              ...productState,
              metadata: {
                ...productState.metadata,
                url_registry_publication: {
                  markets: {
                    sk: {
                      publicationStatus: "published",
                      publicSlug: "slovensky-produkt",
                      salesChannelId: "sc_sk",
                    },
                  },
                  schemaVersion: 1,
                },
              },
            },
          ],
        }),
        { salesChannelId: "sc_ro" }
      )
    ).toThrow("backfill source content before RO import")
  })

  it("hashes plans deterministically and binds the source evidence", () => {
    const plan = buildRoCatalogImportPlan(manifest, snapshot(), {
      salesChannelId: "sc_ro",
    })
    expect(hashRoCatalogImportPlan(plan)).toMatch(/^[a-f0-9]{64}$/)
    expect(hashRoCatalogImportPlan(plan)).toBe(hashRoCatalogImportPlan(plan))

    const changedManifest: RoCatalogManifest = {
      ...manifest,
      products: [
        {
          ...product,
          source: { ...product.source, url: "https://herbatica.ro/alta-sursa" },
        },
      ],
    }
    const changedPlan = buildRoCatalogImportPlan(changedManifest, snapshot(), {
      salesChannelId: "sc_ro",
    })
    expect(hashRoCatalogImportPlan(changedPlan)).not.toBe(
      hashRoCatalogImportPlan(plan)
    )

    const changedCommerceManifestPlan = buildRoCatalogImportPlan(
      {
        ...manifest,
        postCommerceInventoryEvidence: {
          ...manifest.postCommerceInventoryEvidence,
          commerceManifestSha256: "a".repeat(64),
        },
      },
      snapshot(),
      { salesChannelId: "sc_ro" }
    )
    expect(hashRoCatalogImportPlan(changedCommerceManifestPlan)).not.toBe(
      hashRoCatalogImportPlan(plan)
    )

    const skChanged = snapshot({
      skProtection: {
        ...skProtection,
        baseline: { count: 1, sha256: "1".repeat(64) },
      },
    })
    expect(
      buildRoCatalogImportPlan(manifest, skChanged, {
        salesChannelId: "sc_ro",
      }).expectedSkBaseline
    ).not.toEqual(plan.expectedSkBaseline)
  })

  it("round-trips a real nested import plan through the readiness scope parser", () => {
    const plan = buildRoCatalogImportPlan(manifest, snapshot(), {
      salesChannelId: "sc_ro",
    })
    const planHash = hashRoCatalogImportPlan(plan)
    expect(
      parseRoCatalogScopePlanArtifact({
        plan,
        planHash,
        schemaVersion: 1,
      })
    ).toEqual({
      hash: plan.scopeSha256,
      planHash,
      scope: plan.scope,
      variantExpectations: [
        {
          keyKind: "ean",
          keyValue: "8580000000001",
          productId: "prod_1",
          roAvailability: "sellable",
          ronAmount: 4990,
        },
      ],
    })
  })

  it("plans a safely resumable rerun as unchanged after all records exist", () => {
    const initial = snapshot()
    const existing = snapshot({
      contents: [
        {
          ...initial.products[0].sourceContent,
          id: "pcont_1",
          productId: "prod_1",
        },
      ],
      products: [
        {
          ...initial.products[0],
          metadata: {
            ...initial.products[0].metadata,
            url_registry_publication: {
              markets: {
                sk: {
                  publicationStatus: "published",
                  publicSlug: "slovensky-produkt",
                  salesChannelId: "sc_sk",
                },
                ro: {
                  publicationStatus: "published",
                  publicSlug: "produs-romanesc",
                  salesChannelId: "sc_ro",
                },
              },
              schemaVersion: 1,
            },
          },
        },
      ],
      translations: [
        {
          id: "tr_product",
          localeCode: "ro-RO",
          reference: "product",
          referenceId: "prod_1",
          translations: product.translation,
        },
        {
          id: "tr_content",
          localeCode: "ro-RO",
          reference: "product_content",
          referenceId: "pcont_1",
          translations: product.productContent,
        },
      ],
    })
    const rerunPlan = buildRoCatalogImportPlan(manifest, existing)
    expect(rerunPlan.summary).toEqual({
      brandAssignmentsToCreate: 0,
      brandAssignmentsToUpdate: 0,
      brands: 0,
      brandTranslationsToCreate: 0,
      brandTranslationsToUpdate: 0,
      brandExclusionsToDraft: 0,
      categories: 0,
      categoryExclusionsToDraft: 0,
      categoryAssignmentsToCreate: 0,
      categoryAssignmentsToUpdate: 0,
      categoryTranslationsToCreate: 0,
      categoryTranslationsToUpdate: 0,
      contentRecordsToCreate: 0,
      excludedCategories: 0,
      excludedBrands: 0,
      excludedCategoryTranslationsToCreate: 0,
      excludedCategoryTranslationsToUpdate: 0,
      excludedProducts: 0,
      exclusionsToDraft: 0,
      products: 1,
      publicationsToUpdate: 0,
      translationsToCreate: 0,
      translationsToUpdate: 0,
      unchangedCategoryAssignments: 0,
      unchangedCategoryTranslations: 0,
      unchangedTranslations: 2,
    })
    expect(() => assertRoCatalogImportClosed(rerunPlan)).not.toThrow()
  })

  it("rejects a post-apply reread that still contains catalog work", () => {
    expect(() =>
      assertRoCatalogImportClosed(
        buildRoCatalogImportPlan(manifest, snapshot(), {
          salesChannelId: "sc_ro",
        })
      )
    ).toThrow("post-apply reread still has pending work")
  })

  it("plans exact category content and URL assignment without mutating source metadata", () => {
    const state = categorySnapshot()
    const plan = buildRoCatalogImportPlan(categoryManifest, state, {
      salesChannelId: "sc_ro",
    })
    expect(plan.categoryItems).toHaveLength(1)
    expect(plan.categoryItems[0]).toMatchObject({
      assignment: { action: "create", nextSourceVersion: 1, previous: null },
      categoryId: "pcat_1",
      translation: {
        action: "create",
        reference: "product_category",
        referenceId: "pcat_1",
        translations: category.translation,
      },
    })
    expect(state.categories[0].metadata.top_description_html).toBe(
      "<p>Slovenský horný text</p>"
    )
  })

  it("uses exact Medusa IDs to disambiguate duplicate category source keys", () => {
    const secondCategory = {
      ...category,
      key: { kind: "medusa_id", value: "pcat_2" },
      publicSlug: "suplimente-nutritive-doi",
      translation: { ...category.translation, name: "A doua categorie" },
    } as const
    const firstCategory = {
      ...category,
      key: { kind: "medusa_id", value: "pcat_1" },
    } as const
    const state = categorySnapshot({
      categories: [
        ...categorySnapshot().categories,
        {
          ...categorySnapshot().categories[0],
          id: "pcat_2",
        },
      ],
    })
    const plan = buildRoCatalogImportPlan(
      {
        ...manifest,
        categories: [firstCategory, secondCategory],
        categoryInventory: { activeCount: 2, rootCount: 2 },
      },
      state,
      { salesChannelId: "sc_ro" }
    )
    expect(plan.categoryItems.map(({ categoryId }) => categoryId)).toEqual([
      "pcat_1",
      "pcat_2",
    ])
  })

  it("plans an exact translated RO-only draft for an excluded ghost category", () => {
    const excludedCategory = {
      decision: {
        approvedAt: "2026-08-20T12:30:00.000Z",
        approvedBy: "catalog-owner@example.com",
        reference: "RO-CATEGORY-EXCLUSION-1",
      },
      key: { kind: "medusa_id", value: "pcat_ghost" },
      reason: "Reviewed duplicate category must not have a public RO route",
      source: {
        contentSha256: "d".repeat(64),
        retrievedAt: "2026-08-20T12:00:00.000Z",
        url: "https://herbatica.ro/suplimente-nutritive/",
      },
      translation: {
        ...category.translation,
        name: "Categorie duplicată indisponibilă",
      },
    } as const
    const base = categorySnapshot()
    const ghost = {
      ...base.categories[0],
      id: "pcat_ghost",
      metadata: { source_guid: "RO-CATEGORY-GUID-1" },
    }
    const manifestWithGhost = {
      ...categoryManifest,
      categories: [
        { ...category, key: { kind: "medusa_id", value: "pcat_1" } },
      ],
      categoryInventory: { activeCount: 2, rootCount: 2 },
      excludedCategories: [excludedCategory],
    } as const
    const ghostAssignment = {
      entityId: "pcat_ghost",
      id: "sfuasn_ghost",
      marketCode: "ro",
      publicationStatus: "published",
      publicSlug: "categorie-duplicata",
      salesChannelId: "sc_ro",
      sourceVersion: 2,
      updatedAt: "2026-08-20T12:00:00.000Z",
    } as const
    expect(() =>
      buildRoCatalogImportPlan(
        manifestWithGhost,
        categorySnapshot({
          categories: [...base.categories, ghost],
          categoryAssignments: [ghostAssignment],
        }),
        { salesChannelId: "sc_ro" }
      )
    ).toThrow("retire it, verify URL-registry delivery")

    const plan = buildRoCatalogImportPlan(
      manifestWithGhost,
      categorySnapshot({
        categories: [...base.categories, ghost],
        categoryAssignments: [
          { ...ghostAssignment, publicationStatus: "draft" },
        ],
      }),
      { salesChannelId: "sc_ro" }
    )
    expect(plan.excludedCategoryItems).toMatchObject([
      {
        action: "unchanged",
        categoryId: "pcat_ghost",
        nextSourceVersion: 2,
        translation: {
          action: "create",
          translations: excludedCategory.translation,
        },
      },
    ])
    expect(plan.summary).toMatchObject({
      categoryExclusionsToDraft: 0,
      excludedCategories: 1,
      excludedCategoryTranslationsToCreate: 1,
    })
  })

  it("reconciles category hierarchy and counts before planning writes", () => {
    expect(() =>
      buildRoCatalogImportPlan(
        {
          ...categoryManifest,
          categories: [{ ...category, expectedDirectProductCount: 1 }],
        },
        categorySnapshot(),
        { salesChannelId: "sc_ro" }
      )
    ).toThrow("product count mismatch")
  })

  it("plans an idempotent category rerun without changing its source version", () => {
    const existing = categorySnapshot({
      categoryAssignments: [
        {
          entityId: "pcat_1",
          id: "sfuasn_1",
          marketCode: "ro",
          publicationStatus: "published",
          publicSlug: "suplimente-nutritive",
          salesChannelId: "sc_ro",
          sourceVersion: 4,
          updatedAt: "2026-08-20T12:00:00.000Z",
        },
      ],
      translations: [
        {
          id: "tr_category",
          localeCode: "ro-RO",
          reference: "product_category",
          referenceId: "pcat_1",
          translations: { ...category.translation, retained: "value" },
        },
      ],
    })
    const item = buildRoCatalogImportPlan(categoryManifest, existing, {
      salesChannelId: "sc_ro",
    }).categoryItems[0]
    expect(item.assignment).toMatchObject({
      action: "unchanged",
      nextSourceVersion: 4,
    })
    expect(item.translation).toMatchObject({
      action: "unchanged",
      translations: { retained: "value" },
    })
  })

  it("rejects a category assigned to a non-RO sales channel", () => {
    expect(() =>
      buildRoCatalogImportPlan(
        {
          ...categoryManifest,
          categories: [{ ...category, salesChannelId: "sc_sk" }],
        },
        categorySnapshot(),
        { salesChannelId: "sc_ro" }
      )
    ).toThrow("is not configured for RO")
  })
})

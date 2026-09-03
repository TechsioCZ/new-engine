import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { hashCatalogTranslationBytes } from "../../../../src/scripts/catalog-translation-pipeline/canonical"
import type { CatalogTranslationPlan } from "../../../../src/scripts/catalog-translation-pipeline/types"
import {
  assertMarketCatalogPublicationPlanArtifact,
  buildMarketCatalogPublicationApplyReceipt,
  buildMarketCatalogPublicationRollbackArtifact,
  writeMarketCatalogPublicationPlanArtifact,
} from "../../../../src/scripts/market-catalog-publication/artifacts"
import { assertMarketCatalogPublicationTranslationEvidence } from "../../../../src/scripts/market-catalog-publication/evidence"
import {
  parseMarketCatalogPublicationCliOptions,
  parseMarketCatalogPublicationManifest,
} from "../../../../src/scripts/market-catalog-publication/manifest"
import {
  assertMarketCatalogPublicationClosed,
  buildMarketCatalogPublicationPlan,
  hashMarketCatalogPublicationPlan,
} from "../../../../src/scripts/market-catalog-publication/planner"
import type {
  MarketCatalogPublicationManifest,
  MarketCatalogPublicationSnapshot,
} from "../../../../src/scripts/market-catalog-publication/types"

const SHA = "a".repeat(64)
const SHA256_PATTERN = /^[a-f0-9]{64}$/
const temporaryDirectories: string[] = []

const environment = {
  databaseInstanceFingerprint: "b".repeat(64),
  environmentId: "catalog-test-blue",
  kind: "test" as const,
}

const manifest = (
  overrides: Partial<MarketCatalogPublicationManifest> = {}
): MarketCatalogPublicationManifest => ({
  brands: [
    { id: "brand_1", publicationStatus: "published", publicSlug: "znacka" },
  ],
  categories: [
    {
      id: "pcat_1",
      publicationStatus: "published",
      publicSlug: "kategorie",
    },
  ],
  environment,
  locale: "cs-CZ",
  market: "cz",
  products: [
    {
      id: "prod_1",
      publicationStatus: "published",
      publicSlug: "cesky-produkt",
    },
  ],
  salesChannelId: "sc_cz",
  schemaVersion: 1,
  translationInputSha256: SHA,
  ...overrides,
})

const translationPlan = (
  overrides: Partial<CatalogTranslationPlan> = {}
): CatalogTranslationPlan => ({
  environment,
  inputSha256: SHA,
  items: [],
  mode: "replace",
  protectedState: {
    databaseStateSha256: "c".repeat(64),
    entityIdentitySha256: "d".repeat(64),
    sharedInventory: { count: 1, sha256: "e".repeat(64) },
    sourceStateSha256: "f".repeat(64),
  },
  schemaVersion: 1,
  scope: {
    brandIds: ["brand_1"],
    categoryIds: ["pcat_1"],
    productContentIds: ["pcontent_1"],
    productIds: ["prod_1"],
    targetLocales: ["cs-CZ"],
  },
  scopeSha256: "1".repeat(64),
  sourceLocale: "sk-SK",
  summary: { creates: 0, entries: 4, unchanged: 4, updates: 0 },
  ...overrides,
})

const snapshot = (
  overrides: Partial<MarketCatalogPublicationSnapshot> = {}
): MarketCatalogPublicationSnapshot => ({
  assignments: [],
  products: [
    {
      assignments: { cz: null, hu: null, ro: null, sk: null },
      productId: "prod_1",
      salesChannelIds: ["sc_cz", "sc_sk"],
      sourceVersion: "2026-08-21T10:00:00.000Z",
    },
  ],
  salesChannel: {
    id: "sc_cz",
    metadata: {
      storefront_notification_markets: {
        cz: {
          country_code: "cz",
          locale: "cs-CZ",
          market_code: "cz",
          store_name: "Herbatica CZ",
          storefront_domain: "herbatica.cz",
        },
      },
    },
  },
  translationPlan: translationPlan(),
  ...overrides,
})

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true }))
  )
})

describe("market catalog publication", () => {
  it("plans exact CZ publication without creating products or inventory", () => {
    const plan = buildMarketCatalogPublicationPlan(
      manifest(),
      "2".repeat(64),
      snapshot()
    )

    expect(plan.scope).toEqual({
      brandIds: ["brand_1"],
      categoryIds: ["pcat_1"],
      productIds: ["prod_1"],
    })
    expect(plan.summary).toEqual({
      brandAssignmentsToCreate: 1,
      brandAssignmentsToUpdate: 0,
      brands: 1,
      categoryAssignmentsToCreate: 1,
      categoryAssignmentsToUpdate: 0,
      categories: 1,
      productPublicationsToUpdate: 1,
      products: 1,
    })
    expect(plan.items.products[0]?.desiredAssignment).toEqual({
      publicationStatus: "published",
      publicSlug: "cesky-produkt",
      salesChannelId: "sc_cz",
    })
    expect(plan).not.toHaveProperty("inventory")
  })

  it("closes only after all URL assignments and product publications match", () => {
    const ready = snapshot({
      assignments: [
        {
          entityId: "brand_1",
          entityKind: "brand",
          id: "assign_brand_1",
          marketCode: "cz",
          publicationStatus: "published",
          publicSlug: "znacka",
          salesChannelId: "sc_cz",
          sourceVersion: 1,
        },
        {
          entityId: "pcat_1",
          entityKind: "category",
          id: "assign_category_1",
          marketCode: "cz",
          publicationStatus: "published",
          publicSlug: "kategorie",
          salesChannelId: "sc_cz",
          sourceVersion: 1,
        },
      ],
      products: [
        {
          assignments: {
            cz: {
              publicationStatus: "published",
              publicSlug: "cesky-produkt",
              salesChannelId: "sc_cz",
            },
            hu: null,
            ro: null,
            sk: null,
          },
          productId: "prod_1",
          salesChannelIds: ["sc_cz"],
          sourceVersion: "2026-08-21T10:00:00.000Z",
        },
      ],
    })
    const plan = buildMarketCatalogPublicationPlan(
      manifest(),
      "2".repeat(64),
      ready
    )

    expect(() => assertMarketCatalogPublicationClosed(plan)).not.toThrow()
    expect(plan.summary.productPublicationsToUpdate).toBe(0)
  })

  it("rejects incomplete translations, mismatched identity scope, and cross-market channels", () => {
    expect(() =>
      buildMarketCatalogPublicationPlan(
        manifest(),
        "2".repeat(64),
        snapshot({
          translationPlan: translationPlan({
            summary: { creates: 0, entries: 4, unchanged: 3, updates: 1 },
          }),
        })
      )
    ).toThrow("fully applied")

    expect(() =>
      buildMarketCatalogPublicationPlan(
        manifest({ brands: [] }),
        "2".repeat(64),
        snapshot()
      )
    ).toThrow("brand publication scope")

    expect(() =>
      buildMarketCatalogPublicationPlan(
        manifest(),
        "2".repeat(64),
        snapshot({
          products: [
            {
              assignments: {
                cz: null,
                hu: {
                  publicationStatus: "published",
                  publicSlug: "masar-produkt",
                  salesChannelId: "sc_cz",
                },
                ro: null,
                sk: null,
              },
              productId: "prod_1",
              salesChannelIds: ["sc_cz"],
              sourceVersion: "2026-08-21T10:00:00.000Z",
            },
          ],
        })
      )
    ).toThrow("market hu")
  })

  it("validates market-locale pairing, unique slugs, and apply evidence paths", () => {
    expect(() =>
      parseMarketCatalogPublicationManifest({
        ...manifest(),
        locale: "hu-HU",
      })
    ).toThrow("requires locale cs-CZ")
    expect(() =>
      parseMarketCatalogPublicationManifest({
        ...manifest(),
        products: [
          ...manifest().products,
          {
            id: "prod_2",
            publicationStatus: "published",
            publicSlug: "cesky-produkt",
          },
        ],
      })
    ).toThrow("duplicate publicSlug")
    expect(() =>
      parseMarketCatalogPublicationCliOptions([
        "--apply",
        "--manifest",
        "/tmp/manifest.json",
        "--translation-input",
        "/tmp/input.json",
        "--plan-output",
        "/tmp/plan.json",
      ])
    ).toThrow("--apply requires")
  })

  it("binds a private reviewed plan and produces rollback/receipt evidence", async () => {
    const directory = await mkdtemp(join(tmpdir(), "market-publication-"))
    temporaryDirectories.push(directory)
    await chmod(directory, 0o700)
    const outputPath = join(directory, "plan.json")
    const plan = buildMarketCatalogPublicationPlan(
      manifest(),
      "2".repeat(64),
      snapshot()
    )
    const planHash = hashMarketCatalogPublicationPlan(plan)

    await writeMarketCatalogPublicationPlanArtifact(outputPath, plan, planHash)
    await expect(
      assertMarketCatalogPublicationPlanArtifact(outputPath, plan, planHash)
    ).resolves.toBeUndefined()
    expect(JSON.parse(await readFile(outputPath, "utf8"))).toMatchObject({
      planHash,
      schemaVersion: 1,
    })
    const rollback = buildMarketCatalogPublicationRollbackArtifact(
      plan,
      planHash,
      "2026-08-21T10:00:00.000Z"
    )
    const receipt = buildMarketCatalogPublicationApplyReceipt({
      appliedAt: "2026-08-21T10:01:00.000Z",
      plan,
      planHash,
      rollbackArtifactSha256: "3".repeat(64),
      targetStateSha256: "4".repeat(64),
    })
    expect(rollback.items.products[0]?.previousAssignment).toBeNull()
    expect(receipt.payloadSha256).toMatch(SHA256_PATTERN)
  })

  it("rejects test-only Czech lexical translations before publication", async () => {
    const directory = await mkdtemp(join(tmpdir(), "market-evidence-"))
    temporaryDirectories.push(directory)
    await chmod(directory, 0o700)
    const outputPath = join(directory, "cz-catalog-source-attestation.json")
    const field = (
      method:
        | "official-exact-unique-ean"
        | "source-null"
        | "temporary-ai-from-sk"
    ) => ({
      method,
      sourceArtifactSha256: "5".repeat(64),
      sourceRecordSha256: "6".repeat(64),
      sourceReference: "audited-cz-source",
    })
    const attestation = {
      records: [
        {
          fields: {
            description: field("temporary-ai-from-sk"),
            subtitle: field("source-null"),
            title: field("official-exact-unique-ean"),
          },
          publicationGrade: false,
          reference: "product",
          referenceId: "prod_1",
          sourceReference: "audited-cz-source",
          translations: {
            description: "Dočasný český popis",
            subtitle: null,
            title: "Oficiální český produkt",
          },
        },
      ],
      schemaVersion: 2,
    }
    const bytes = Buffer.from(`${JSON.stringify(attestation)}\n`)
    await writeFile(outputPath, bytes, { mode: 0o600 })
    const artifactSha256 = hashCatalogTranslationBytes(bytes)
    await expect(
      assertMarketCatalogPublicationTranslationEvidence(manifest(), {
        entries: [
          {
            localeCode: "cs-CZ",
            provenance: {
              artifactSha256,
              method: "ai-generated",
              sourceReference: "audited-cz-source",
            },
            reference: "product",
            referenceId: "prod_1",
            translations: attestation.records[0].translations,
          },
        ],
        environment,
        inventory: {
          brands: 128,
          categories: 209,
          productContents: 2151,
          products: 2151,
        },
        mode: "replace",
        schemaVersion: 1,
        sourceArtifacts: [{ path: outputPath, sha256: artifactSha256 }],
        sourceLocale: "sk-SK",
        targetLocale: "cs-CZ",
      })
    ).rejects.toThrow("description is not publication-grade")
  })
})

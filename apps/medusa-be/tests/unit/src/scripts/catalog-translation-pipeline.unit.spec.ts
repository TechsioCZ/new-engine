import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import {
  buildCatalogTranslationApplyReceipt,
  buildCatalogTranslationRollbackArtifact,
  writeCatalogTranslationApplyReceipt,
  writeCatalogTranslationPlanArtifact,
  writeCatalogTranslationRollbackArtifact,
} from "../../../../src/scripts/catalog-translation-pipeline/artifacts"
import { hashCatalogTranslationValue } from "../../../../src/scripts/catalog-translation-pipeline/canonical"
import {
  parseCatalogTranslationCliOptions,
  parseCatalogTranslationInput,
} from "../../../../src/scripts/catalog-translation-pipeline/manifest"
import {
  buildCatalogTranslationPlan,
  type CatalogTranslationSnapshot,
  hashCatalogTranslationPlan,
} from "../../../../src/scripts/catalog-translation-pipeline/planner"
import {
  assertCatalogTranslationTestEnvironment,
  buildCatalogTranslationDatabaseInstanceFingerprint,
} from "../../../../src/scripts/catalog-translation-pipeline/runtime"
import type {
  CatalogTranslationInput,
  ExistingCatalogTranslation,
} from "../../../../src/scripts/catalog-translation-pipeline/types"

const SHA = "a".repeat(64)
const temporaryDirectories: string[] = []

const inputValue = (): CatalogTranslationInput => ({
  entries: [
    {
      localeCode: "cs-CZ",
      provenance: {
        artifactSha256: SHA,
        method: "ai-generated",
        sourceReference: "batch-cz-1",
      },
      reference: "product",
      referenceId: "prod_1",
      translations: {
        description: "Český popis",
        subtitle: null,
        title: "Český název",
      },
    },
    {
      localeCode: "cs-CZ",
      provenance: {
        artifactSha256: "b".repeat(64),
        method: "ai-generated",
        sourceReference: "batch-cz-content-1",
      },
      reference: "product_content",
      referenceId: "pcontent_1",
      translations: {
        composition: "Složení",
        other: "Další informace",
        usage: "Použití",
        warning: "Upozornění",
      },
    },
    {
      localeCode: "cs-CZ",
      provenance: {
        artifactSha256: "b".repeat(64),
        method: "ai-generated",
        sourceReference: "batch-cz-category-1",
      },
      reference: "product_category",
      referenceId: "pcat_1",
      translations: {
        bottom_description_html: null,
        description: "Česká kategorie",
        meta_description: "SEO popis",
        meta_title: "SEO titul",
        name: "Kategorie",
        top_description_html: null,
      },
    },
    {
      localeCode: "cs-CZ",
      provenance: {
        artifactSha256: "b".repeat(64),
        method: "ai-generated",
        sourceReference: "batch-cz-brand-1",
      },
      reference: "brand",
      referenceId: "brand_1",
      translations: { title: "Značka" },
    },
  ],
  environment: {
    databaseInstanceFingerprint: "c".repeat(64),
    environmentId: "catalog-test-blue",
    kind: "test",
  },
  inventory: {
    brands: 128,
    categories: 209,
    productContents: 2151,
    products: 2151,
  },
  mode: "replace",
  schemaVersion: 1,
  sourceLocale: "sk-SK",
  sourceArtifacts: [
    { path: "/tmp/ai-source.jsonl", sha256: SHA },
    { path: "/tmp/reviewed-source.jsonl", sha256: "b".repeat(64) },
  ],
  targetLocale: "cs-CZ",
})

const normalizeSourceInputValue = (): CatalogTranslationInput => {
  const input = inputValue()
  const translationsByReference = {
    brand: { title: "Značka SK" },
    product: {
      description: "Slovenský popis",
      subtitle: null,
      title: "Slovenský názov",
    },
    product_category: {
      bottom_description_html: null,
      description: "Slovenská kategória",
      meta_description: "SEO popis SK",
      meta_title: "SEO titul SK",
      name: "Kategória",
      top_description_html: null,
    },
    product_content: {
      composition: "Zloženie",
      other: "Iné",
      usage: "Použitie",
      warning: "Pozor",
    },
  } as const
  return {
    ...input,
    entries: input.entries.map((entry) => ({
      ...entry,
      localeCode: "sk-SK",
      provenance: { ...entry.provenance, method: "canonical-source" },
      translations: translationsByReference[entry.reference],
    })),
    mode: "normalize-source",
    targetLocale: "sk-SK",
  }
}

const fullInputValue = (input: CatalogTranslationInput = inputValue()) => {
  const templates = Object.fromEntries(
    input.entries.map((entry) => [entry.reference, entry])
  )
  const entries = [
    ...Array.from({ length: 2151 }, (_, index) => ({
      ...templates.product,
      referenceId: `prod_${index}`,
    })),
    ...Array.from({ length: 2151 }, (_, index) => ({
      ...templates.product_content,
      referenceId: `pcontent_${index}`,
    })),
    ...Array.from({ length: 209 }, (_, index) => ({
      ...templates.product_category,
      referenceId: `pcat_${index}`,
    })),
    ...Array.from({ length: 128 }, (_, index) => ({
      ...templates.brand,
      referenceId: `brand_${index}`,
    })),
  ] as CatalogTranslationInput["entries"]
  return { ...input, entries }
}

const translation = (
  id: string,
  localeCode: string,
  translations: Readonly<Record<string, unknown>>
): ExistingCatalogTranslation => ({
  id,
  localeCode,
  reference: "product",
  referenceId: "prod_1",
  translations,
})

const protectedState = {
  entityIdentitySha256: "d".repeat(64),
  sharedInventory: { count: 7, sha256: "e".repeat(64) },
  sourceStateSha256: "f".repeat(64),
}

const snapshot = (
  targetTranslations: readonly ExistingCatalogTranslation[] = []
): CatalogTranslationSnapshot => ({
  existingTranslations: targetTranslations,
  protectedState,
  sourceRecords: [
    {
      reference: "product",
      referenceId: "prod_1",
      values: {
        description: "Slovenský popis",
        subtitle: null,
        title: "Slovenský názov",
      },
    },
    {
      reference: "product_content",
      referenceId: "pcontent_1",
      values: {
        composition: "Zloženie",
        other: "Iné",
        usage: "Použitie",
        warning: "Pozor",
      },
    },
    {
      reference: "product_category",
      referenceId: "pcat_1",
      values: {
        bottom_description_html: null,
        description: "Slovenská kategória",
        meta_description: "SEO popis SK",
        meta_title: "SEO titul SK",
        name: "Kategória",
        top_description_html: null,
      },
    },
    {
      reference: "brand",
      referenceId: "brand_1",
      values: { title: "Značka SK" },
    },
  ],
})

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((path) => rm(path, { force: true, recursive: true }))
  )
})

describe("catalog translation test pipeline", () => {
  it("parses exact provenance and rejects duplicate or production-bound input", () => {
    const fullInput = fullInputValue()
    expect(parseCatalogTranslationInput(fullInput).entries).toHaveLength(4639)
    expect(() =>
      parseCatalogTranslationInput({
        ...inputValue(),
        entries: [inputValue().entries[0], inputValue().entries[0]],
      })
    ).toThrow("duplicate translation identity")
    expect(() =>
      parseCatalogTranslationInput({
        ...inputValue(),
        environment: {
          ...inputValue().environment,
          environmentId: "production",
        },
      })
    ).toThrow("non-production test environment")
  })

  it("keeps canonical sk-SK normalization distinct from translated targets", () => {
    const sourceInput = normalizeSourceInputValue()
    expect(parseCatalogTranslationInput(fullInputValue(sourceInput)).mode).toBe(
      "normalize-source"
    )
    expect(() =>
      parseCatalogTranslationInput(
        fullInputValue({
          ...sourceInput,
          entries: sourceInput.entries.map((entry) => ({
            ...entry,
            provenance: { ...entry.provenance, method: "ai-generated" },
          })),
        })
      )
    ).toThrow("canonical sk-SK provenance")
    const plan = buildCatalogTranslationPlan(
      sourceInput,
      "1".repeat(64),
      snapshot()
    )
    expect(plan.mode).toBe("normalize-source")
    expect(plan.scope.targetLocales).toEqual(["sk-SK"])
    expect(
      plan.items.find(({ reference }) => reference === "product")
        ?.resultingTranslations
    ).toEqual(sourceInput.entries[0]?.translations)
    expect(() =>
      buildCatalogTranslationPlan(
        {
          ...sourceInput,
          entries: sourceInput.entries.map((entry) =>
            entry.reference === "product"
              ? {
                  ...entry,
                  translations: { ...entry.translations, title: "AI názov" },
                }
              : entry
          ),
        },
        "1".repeat(64),
        snapshot()
      )
    ).toThrow("differs from canonical")
  })

  it("requires an absolute dry-run plan and hash-bound apply receipt", () => {
    expect(
      parseCatalogTranslationCliOptions([
        "--input",
        "/tmp/input.json",
        "--plan-output=/tmp/plan.json",
      ])
    ).toEqual({
      apply: false,
      chunkSize: 100,
      inputPath: "/tmp/input.json",
      planOutputPath: "/tmp/plan.json",
    })
    expect(() =>
      parseCatalogTranslationCliOptions([
        "--input=/tmp/input.json",
        "--plan-output=/tmp/plan.json",
        "--apply",
        `--confirm-plan-hash=${SHA}`,
      ])
    ).toThrow(
      "requires --confirm-plan-hash, --rollback-output and --receipt-output"
    )
    expect(
      parseCatalogTranslationCliOptions([
        "--input=/tmp/input.json",
        "--plan-output=/tmp/plan.json",
        "--receipt-output=/tmp/receipt.json",
        "--rollback-output=/tmp/rollback.json",
        "--apply",
        `--confirm-plan-hash=${SHA}`,
      ]).apply
    ).toBe(true)
  })

  it("plans a preimage-bound replacement while preserving opaque target fields", () => {
    const plan = buildCatalogTranslationPlan(
      inputValue(),
      "1".repeat(64),
      snapshot([
        translation("tr_cs", "cs-CZ", {
          description: "",
          subtitle: "Existující podtitulek",
        }),
      ])
    )
    expect(plan.summary).toEqual({
      creates: 3,
      entries: 4,
      unchanged: 0,
      updates: 1,
    })
    expect(
      plan.items.find(({ reference }) => reference === "product")
        ?.resultingTranslations
    ).toEqual({
      description: "Český popis",
      subtitle: null,
      title: "Český název",
    })
    expect(plan.scope).toEqual({
      brandIds: ["brand_1"],
      categoryIds: ["pcat_1"],
      productContentIds: ["pcontent_1"],
      productIds: ["prod_1"],
      targetLocales: ["cs-CZ"],
    })
    expect(hashCatalogTranslationPlan(plan)).toMatch(/^[a-f0-9]{64}$/)
  })

  it("binds a copied nonblank target as the exact rollback preimage", () => {
    const plan = buildCatalogTranslationPlan(
      inputValue(),
      "1".repeat(64),
      snapshot([
        translation("tr_cs", "cs-CZ", {
          legacy: "remove-me",
          title: "Zkopírovaný slovenský název",
        }),
      ])
    )
    const productItem = plan.items.find(
      ({ reference }) => reference === "product"
    )
    expect(productItem?.action).toBe("update")
    expect(productItem?.previousTranslations).toEqual({
      legacy: "remove-me",
      title: "Zkopírovaný slovenský název",
    })
    expect(productItem?.resultingTranslations).not.toHaveProperty("legacy")
  })

  it("requires a matching explicit test environment and credential-free database fingerprint", () => {
    const environment = {
      CATALOG_TRANSLATION_DATABASE_INSTANCE_ID: "catalog-db-clone-1",
      CATALOG_TRANSLATION_PIPELINE_ENVIRONMENT_ID: "catalog-test-blue",
      CATALOG_TRANSLATION_PIPELINE_ENVIRONMENT_KIND: "test",
      DATABASE_URL:
        "postgresql://secret:password@DB.EXAMPLE.test:5433/catalog_test",
    }
    const databaseInstanceFingerprint =
      buildCatalogTranslationDatabaseInstanceFingerprint(environment)
    const input = {
      ...inputValue(),
      environment: {
        databaseInstanceFingerprint,
        environmentId: "catalog-test-blue",
        kind: "test" as const,
      },
    }
    expect(assertCatalogTranslationTestEnvironment(input, environment)).toEqual(
      input.environment
    )
    expect(() =>
      assertCatalogTranslationTestEnvironment(input, {
        ...environment,
        CATALOG_TRANSLATION_PIPELINE_ENVIRONMENT_KIND: "production",
      })
    ).toThrow("different or non-test environment")
    expect(JSON.stringify(databaseInstanceFingerprint)).not.toContain("secret")
  })

  it("publishes private no-clobber plan and hash-bound apply receipt artifacts", async () => {
    const directory = await mkdtemp(join(tmpdir(), "catalog-translation-"))
    temporaryDirectories.push(directory)
    const plan = buildCatalogTranslationPlan(
      inputValue(),
      "1".repeat(64),
      snapshot()
    )
    const planHash = hashCatalogTranslationPlan(plan)
    const planPath = join(directory, "plan.json")
    const receiptPath = join(directory, "receipt.json")
    const rollbackPath = join(directory, "rollback.json")
    await writeCatalogTranslationPlanArtifact(planPath, plan, planHash)
    await expect(
      writeCatalogTranslationPlanArtifact(planPath, plan, planHash)
    ).rejects.toMatchObject({ code: "EEXIST" })
    const rollback = buildCatalogTranslationRollbackArtifact(
      plan,
      planHash,
      "2026-08-21T11:59:00.000Z"
    )
    const rollbackArtifactSha256 =
      await writeCatalogTranslationRollbackArtifact(rollbackPath, rollback)
    const receipt = buildCatalogTranslationApplyReceipt({
      appliedAt: "2026-08-21T12:00:00.000Z",
      plan,
      planHash,
      protectedState,
      rollbackArtifactSha256,
      targetStateSha256: "2".repeat(64),
    })
    const { payloadSha256: _payloadSha256, ...payload } = receipt
    expect(receipt.payloadSha256).toBe(hashCatalogTranslationValue(payload))
    await writeCatalogTranslationApplyReceipt(receiptPath, receipt)
    expect(JSON.parse(await readFile(receiptPath, "utf8"))).toEqual(receipt)
  })
})

import { mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  assertFreshRoDatabaseInstanceFingerprint,
  buildDemoOmissionLedgerHash,
  buildRoCatalogReadinessReport,
  buildRoCatalogScopePlanHash,
  buildSharedInventoryBaseline,
  buildSkPublicationAuditBaseline,
  buildSkPublicationBaseline,
  normalizeRoCatalogComparableText,
  parseDemoOmissionLedgerPath,
  parseExpectedSkBaselineArgs,
  parseReadinessOutputPath,
  parseRoCatalogReadinessReportArtifact,
  parseRoDemoContentOmissionLedger,
  type RoCatalogReadinessInput,
  writeRoCatalogReadinessReport,
} from "../../../../src/scripts/ro-catalog-readiness"
import {
  hashRoDemoContentOmissionLedger,
  hashRoTwoPhaseProvenanceReceipt,
  parseRoDemoContentOmissionLedgerArtifact,
  parseRoTwoPhaseProvenanceReceipt,
} from "../../../../src/scripts/ro-catalog-readiness-contract"
import { buildRoDemoDatabaseInstanceFingerprint } from "../../../../src/scripts/ro-demo-commerce/runtime"
import { createRoDemoOmissionAuthority } from "../../../../src/utils/ro-demo-omission-authority"

const generatedAt = "2026-08-20T12:00:00.000Z"
const SHA256_PATTERN = /^[a-f0-9]{64}$/

const cutoverReceiptFixture = () => {
  const inventoryEnvelopeSha256 = "1".repeat(64)
  const priceAuthoritySha256 = "2".repeat(64)
  const commercePlanFileSha256 = "3".repeat(64)
  const skBaselineSha256 = "4".repeat(64)
  const scopeSha256 = "5".repeat(64)
  const rawLiveInventorySha256 = "0".repeat(64)
  const sharedInventorySha256 = "f".repeat(64)
  return {
    artifacts: {
      staticTaxonomyConvergence: {
        path: "urlr/static-taxonomy-convergence.json",
        sha256: "f".repeat(64),
      },
    },
    catalog: {
      bundle: { path: "catalog/bundle.json", sha256: "6".repeat(64) },
      importPlan: {
        path: "catalog/import-plan.json",
        planHash: "7".repeat(64),
        scopeSha256,
        sha256: "8".repeat(64),
      },
      manifest: { path: "catalog/manifest.json", sha256: "9".repeat(64) },
      omissionLedger: {
        path: "catalog/omission-ledger.json",
        sha256: "a".repeat(64),
      },
    },
    commerce: {
      applyReceipt: {
        path: "commerce/apply-receipt.json",
        sha256: "b".repeat(64),
      },
      manifest: {
        path: "commerce/manifest.json",
        sha256: "4".repeat(64),
      },
      plan: { path: "commerce/plan.json", sha256: commercePlanFileSha256 },
      priceAuthoritySha256,
      restoreArtifact: {
        path: "commerce/restore-artifact.json",
        sha256: "c".repeat(64),
      },
      skBaselineSha256,
    },
    kind: "herbatika-ro-demo-cutover-receipt",
    locale: "ro-RO",
    market: "ro",
    operations: {
      maintenance: {
        path: "operations/maintenance-proof.json",
        sha256: "b".repeat(64),
      },
      meilisearchConvergence: {
        path: "operations/meili-convergence.json",
        sha256: "c".repeat(64),
      },
      urlRegistryConvergence: {
        path: "operations/urlr-convergence.json",
        sha256: "d".repeat(64),
      },
    },
    postCommerce: {
      commerceApplyReceiptSha256: "b".repeat(64),
      commerceManifestSha256: "4".repeat(64),
      commercePlanFileSha256,
      commercePlanHash: "d".repeat(64),
      commerceRestoreArtifactSha256: "c".repeat(64),
      envelope: {
        path: "postcommerce/envelope.json",
        sha256: "e".repeat(64),
      },
      observedCommerceSnapshotSha256: "a".repeat(64),
      payloadSha256: "9".repeat(64),
      postCommerceSharedInventoryFingerprintCount: 2191,
      postCommerceSharedInventoryFingerprintSha256: sharedInventorySha256,
      postCommerceSkBaselineCount: 2151,
      postCommerceSkBaselineErrors: 0,
      postCommerceSkBaselineSha256: skBaselineSha256,
      preCommerceSharedInventoryFingerprintCount: 2191,
      preCommerceSharedInventoryFingerprintSha256: sharedInventorySha256,
      preCommerceSkBaselineArtifactSha256: "5".repeat(64),
      preCommerceSkBaselineCount: 2151,
      preCommerceSkBaselineErrors: 0,
      preCommerceSkBaselineSha256: skBaselineSha256,
      priceAuthoritySha256,
      rawLiveInventorySha256,
      sourceInventoryEnvelopeSha256: inventoryEnvelopeSha256,
    },
    preCommerce: {
      inventoryEnvelope: {
        path: "precommerce/inventory-envelope.json",
        sha256: inventoryEnvelopeSha256,
      },
      priceAuthority: {
        path: "precommerce/price-authority.json",
        sha256: priceAuthoritySha256,
      },
      rawLiveInventory: {
        path: "precommerce/raw-live-inventory.json",
        sha256: rawLiveInventorySha256,
      },
    },
    releaseId: "ro-demo-20260820",
    releaseIdentity: {
      backendBuildHash: "backend-build-20260820",
      backendDeploymentId: "backend-deploy-20260820",
      backendReleaseSha: "1".repeat(40),
      backendSlot: "blue",
      databaseFingerprint: "2".repeat(64),
      databaseInstanceFingerprint: "3".repeat(64),
      environmentId: "zane-production",
      locale: "ro-RO",
      marketCode: "ro",
      roOrigin: "https://test-engine-herbatika-ro-zane.web-revolution.cz",
      salesChannelId: "sc_store",
      skOrigin: "https://test-engine-herbatika-zane.web-revolution.cz",
      storefrontBuildHash: "storefront-build-20260820",
      storefrontDeploymentId: "storefront-deploy-20260820",
      storefrontReleaseSha: "3".repeat(40),
      storefrontSlot: "blue",
    },
    schemaVersion: 1,
  } as const
}

const readyInput = (): RoCatalogReadinessInput => ({
  assignments: [
    {
      entity_id: "pcat_1",
      entity_kind: "category",
      market_code: "sk",
      public_slug: "prirodna-kozmetika",
      publication_status: "published",
      sales_channel_id: "sc_store",
    },
    {
      entity_id: "pcat_1",
      entity_kind: "category",
      market_code: "ro",
      public_slug: "cosmetice-naturale",
      publication_status: "published",
      sales_channel_id: "sc_store",
    },
    {
      entity_id: "brand_1",
      entity_kind: "brand",
      market_code: "sk",
      public_slug: "herbatica",
      publication_status: "published",
      sales_channel_id: "sc_sk",
    },
    {
      entity_id: "brand_1",
      entity_kind: "brand",
      market_code: "ro",
      public_slug: "marca-herbatica",
      publication_status: "published",
      sales_channel_id: "sc_store",
    },
    {
      entity_id: "pcol_1",
      entity_kind: "collection",
      market_code: "sk",
      public_slug: "imunita",
      publication_status: "published",
      sales_channel_id: "sc_sk",
    },
    {
      entity_id: "pcol_1",
      entity_kind: "collection",
      market_code: "ro",
      public_slug: "imunitate",
      publication_status: "published",
      sales_channel_id: "sc_store",
    },
  ],
  brands: [
    {
      gpsr_contact_email: "gpsr@herbatica.sk",
      handle: "herbatica",
      id: "brand_1",
      title: "Herbatica",
    },
  ],
  categories: [
    {
      description: "Slovenský popis kategórie",
      id: "pcat_1",
      is_active: true,
      metadata: {
        bottom_description_html: "<p>Slovenský spodný text</p>",
        meta_description: "Slovenský SEO popis",
        meta_title: "Slovenský SEO titulok",
        top_description_html: "<p>Slovenský horný text</p>",
      },
      name: "Prírodná kozmetika",
    },
  ],
  collections: [
    {
      handle: "imunita",
      id: "pcol_1",
      metadata: { campaign: "sk-imunita" },
      title: "Imunita",
    },
  ],
  inventoryItemLinks: [
    {
      inventory_item_id: "iitem_1",
      required_quantity: 1,
      variant_id: "variant_1",
    },
  ],
  inventoryLevels: [
    {
      incoming_quantity: 0,
      inventory_item_id: "iitem_1",
      location_id: "sloc_1",
      reserved_quantity: 2,
      stocked_quantity: 10,
    },
  ],
  productContents: [
    {
      composition: "Čaga",
      id: "pcont_1",
      other: "",
      product_id: "prod_1",
      usage: "Dvakrát denne",
      warning: "Nevhodné pre deti",
    },
  ],
  products: [
    {
      description: "Slovenský popis produktu",
      id: "prod_1",
      metadata: {
        url_registry_publication: {
          markets: {
            ro: {
              publicationStatus: "published",
              publicSlug: "befungin-tinctura-cu-extract-de-chaga",
              salesChannelId: "sc_store",
            },
            sk: {
              publicationStatus: "published",
              publicSlug: "befungin-tinktura-s-extraktom-z-cagy",
              salesChannelId: "sc_sk",
            },
          },
          schemaVersion: 1,
        },
      },
      sales_channels: [{ id: "sc_store" }, { id: "sc_sk" }],
      subtitle: null,
      title: "Befungin tinktúra s extraktom z čagy",
      updated_at: "2026-08-20T10:00:00.000Z",
      variants: [
        {
          ean: "8580000000001",
          id: "variant_1",
          prices: [
            { amount: 2990, currency_code: "eur" },
            { amount: 4990, currency_code: "ron" },
          ],
          sku: "BEFUNGIN-100",
        },
      ],
    },
  ],
  paymentProviders: [{ id: "pp_stripe", is_enabled: true }],
  regionPaymentProviderLinks: [
    { payment_provider_id: "pp_stripe", region_id: "reg_ro" },
  ],
  regions: [
    {
      countries: [{ iso_2: "ro" }],
      currency_code: "ron",
      id: "reg_ro",
      name: "Romania",
    },
  ],
  shippingOptions: [
    {
      id: "so_ro",
      name: "Livrare în România",
      service_zone: { geo_zones: [{ country_code: "ro", type: "country" }] },
    },
  ],
  shippingPriceSets: [
    {
      price_set: { prices: [{ currency_code: "ron" }] },
      shipping_option_id: "so_ro",
    },
  ],
  taxRates: [
    {
      id: "txrate_ro",
      is_default: true,
      rate: 19,
      tax_region_id: "txreg_ro",
    },
  ],
  taxRegions: [{ country_code: "ro", id: "txreg_ro", province_code: null }],
  translations: [
    {
      id: "tr_product",
      locale_code: "ro-RO",
      reference: "product",
      reference_id: "prod_1",
      translations: {
        description: "Descriere română",
        title: "Tinctură Befungin cu extract de chaga",
      },
    },
    {
      id: "tr_content",
      locale_code: "ro-RO",
      reference: "product_content",
      reference_id: "pcont_1",
      translations: {
        composition: "Chaga",
        usage: "De două ori pe zi",
        warning: "Nu este potrivit pentru copii",
      },
    },
    {
      id: "tr_category",
      locale_code: "ro-RO",
      reference: "product_category",
      reference_id: "pcat_1",
      translations: {
        bottom_description_html: "<p>Text inferior românesc</p>",
        description: "Descrierea categoriei",
        meta_description: "Descriere SEO românească",
        meta_title: "Titlu SEO românesc",
        name: "Cosmetice naturale",
        top_description_html: "<p>Text superior românesc</p>",
      },
    },
    {
      id: "tr_ro_brand",
      locale_code: "ro-RO",
      reference: "brand",
      reference_id: "brand_1",
      translations: { title: "Marca Herbatica" },
    },
    {
      id: "tr_ro_collection",
      locale_code: "ro-RO",
      reference: "product_collection",
      reference_id: "pcol_1",
      translations: { title: "Imunitate" },
    },
    {
      id: "tr_sk_product",
      locale_code: "sk-SK",
      reference: "product",
      reference_id: "prod_1",
      translations: {
        description: "Slovenský popis produktu",
        title: "Befungin tinktúra s extraktom z čagy",
      },
    },
    {
      id: "tr_sk_content",
      locale_code: "sk-SK",
      reference: "product_content",
      reference_id: "pcont_1",
      translations: {
        composition: "Čaga",
        usage: "Dvakrát denne",
        warning: "Nevhodné pre deti",
      },
    },
    {
      id: "tr_sk_category",
      locale_code: "sk-SK",
      reference: "product_category",
      reference_id: "pcat_1",
      translations: { name: "Prírodná kozmetika" },
    },
    {
      id: "tr_sk_brand",
      locale_code: "sk-SK",
      reference: "brand",
      reference_id: "brand_1",
      translations: { title: "Herbatica" },
    },
    {
      id: "tr_sk_collection",
      locale_code: "sk-SK",
      reference: "product_collection",
      reference_id: "pcol_1",
      translations: { title: "Imunita" },
    },
  ],
})

const buildReport = (input: RoCatalogReadinessInput, at = generatedAt) =>
  buildRoCatalogReadinessReport(input, buildSkPublicationBaseline(input), at)

describe("RO catalog readiness audit", () => {
  it("reports a complete Romanian catalog as ready without mutating its input", () => {
    const input = readyInput()
    const before = structuredClone(input)

    const report = buildReport(input, generatedAt)

    expect(report).toMatchObject({
      generatedAt,
      issues: [],
      market: "ro",
      ready: true,
      roCompletenessProof: {
        algorithm: "sha256-canonical-json-v1",
        dataHash: expect.stringMatching(SHA256_PATTERN),
        demoOmissionLedgerHash: null,
        locale: "ro-RO",
        provenance: "in-memory-audit-input",
        schemaVersion: 1,
      },
      scope: "ro-published-products-and-catalog-assignments",
      roCatalogPublication: {
        brandIds: ["brand_1"],
        categoryIds: ["pcat_1"],
        collectionIds: ["pcol_1"],
      },
      skBaseline: {
        expected: { count: 4, sha256: expect.stringMatching(SHA256_PATTERN) },
        matched: true,
        observed: { count: 4, sha256: expect.stringMatching(SHA256_PATTERN) },
      },
      skPublication: {
        brands: 1,
        categories: 1,
        collections: 1,
        errors: 0,
        products: 1,
      },
      summary: {
        categories: 1,
        categoryUrlAssignments: 1,
        categoryLocalizedContentContracts: 1,
        errors: 0,
        productContentRecords: 1,
        products: 1,
        productUrlAssignments: 1,
        regionPaymentProviders: 1,
        regionsForRomania: 1,
        reviewedNeutralEqualitiesUsed: 0,
        roShippingOptions: 1,
        roShippingOptionsWithRonPrice: 1,
        roTaxRates: 1,
        roTaxRegions: 1,
        translations: 5,
        variants: 1,
        variantsWithRonPrice: 1,
        warnings: 0,
      },
    })
    expect(report.skBaseline.observed).toEqual(report.skBaseline.expected)
    expect(input).toEqual(before)
  })

  it("preflights exact SK publication translations for every public entity kind", () => {
    const input = readyInput()
    const report = buildReport(
      {
        ...input,
        translations: input.translations.filter(
          (translation) => translation.locale_code !== "sk-SK"
        ),
      },
      generatedAt
    )

    expect(
      report.issues.filter(
        (issue) => issue.code === "SK_PUBLISHED_TRANSLATION_MISSING"
      )
    ).toEqual([
      expect.objectContaining({ entityKind: "product", entityId: "prod_1" }),
      expect.objectContaining({ entityKind: "category", entityId: "pcat_1" }),
      expect.objectContaining({ entityKind: "brand", entityId: "brand_1" }),
      expect.objectContaining({
        entityKind: "collection",
        entityId: "pcol_1",
      }),
    ])
    expect(report.skPublication).toMatchObject({
      brands: 1,
      categories: 1,
      collections: 1,
      errors: 4,
      products: 1,
    })
    expect(report.ready).toBe(false)
  })

  it("rejects SK publication translations with empty required exact fields", () => {
    const input = readyInput()
    const report = buildReport(
      {
        ...input,
        translations: input.translations.map((translation) => {
          if (translation.locale_code !== "sk-SK") {
            return translation
          }
          return {
            ...translation,
            translations:
              translation.reference === "product_category"
                ? { name: "" }
                : { title: "" },
          }
        }),
      },
      generatedAt
    )

    expect(
      report.issues.filter(
        (issue) =>
          issue.code === "SK_PUBLISHED_TRANSLATION_REQUIRED_FIELD_MISSING"
      )
    ).toHaveLength(4)
    expect(report.skPublication.errors).toBe(4)
    expect(report.ready).toBe(false)
  })

  it("audits every published Romanian brand and collection assignment", () => {
    const input = readyInput()
    const report = buildReport(
      {
        ...input,
        translations: input.translations.map((translation) => {
          if (translation.id === "tr_ro_brand") {
            return { ...translation, translations: { title: "Herbatica" } }
          }
          if (translation.id === "tr_ro_collection") {
            return { ...translation, translations: { title: "" } }
          }
          return translation
        }),
      },
      generatedAt
    )

    expect(report.roCatalogPublication).toEqual({
      brandIds: ["brand_1"],
      categoryIds: ["pcat_1"],
      collectionIds: ["pcol_1"],
    })
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "RO_TRANSLATION_EQUALS_SOURCE",
          entityId: "brand_1",
          entityKind: "brand",
        }),
        expect.objectContaining({
          code: "MISSING_RO_TRANSLATED_FIELD",
          entityId: "pcol_1",
          entityKind: "collection",
        }),
      ])
    )
    expect(report.ready).toBe(false)
  })

  it("fails when the fresh post-apply SK baseline differs from the external pre-apply baseline", () => {
    const input = readyInput()
    const expected = buildSkPublicationBaseline(input)
    const postApplyInput = {
      ...input,
      translations: input.translations.map((translation) =>
        translation.id === "tr_sk_category"
          ? { ...translation, translations: { name: "Kozmetika" } }
          : translation
      ),
    }
    const report = buildRoCatalogReadinessReport(
      postApplyInput,
      expected,
      generatedAt
    )

    expect(report.skBaseline.matched).toBe(false)
    expect(report.skBaseline.observed.count).toBe(expected.count)
    expect(report.skBaseline.observed.sha256).not.toBe(expected.sha256)
    expect(report.issues).toContainEqual(
      expect.objectContaining({
        code: "SK_BASELINE_MISMATCH",
        entityKind: "catalog",
      })
    )
    expect(report.ready).toBe(false)
  })

  it("fails when fresh RO publication identities differ from the importer plan", () => {
    const input = readyInput()
    const report = buildRoCatalogReadinessReport(
      input,
      buildSkPublicationBaseline(input),
      generatedAt,
      {
        expectedScopePlanHash: "f".repeat(64),
        provenance: "fresh-medusa-database-read",
      }
    )

    expect(report.ready).toBe(false)
    expect(report.scopePlanProof).toMatchObject({
      expectedDataHash: "f".repeat(64),
      matched: false,
    })
    expect(report.issues).toContainEqual(
      expect.objectContaining({ code: "RO_SCOPE_PLAN_MISMATCH" })
    )
  })

  it("hashes the complete stable SK storefront projection", () => {
    const input = readyInput()
    const expected = buildSkPublicationBaseline(input)
    const postApplyInputs: RoCatalogReadinessInput[] = [
      {
        ...input,
        products: input.products.map((product) => ({
          ...product,
          description: "Nečakaná zmena slovenského popisu",
        })),
      },
      {
        ...input,
        productContents: input.productContents.map((content) => ({
          ...content,
          usage: "Nečakaná zmena slovenského použitia",
        })),
      },
      {
        ...input,
        translations: input.translations.map((translation) =>
          translation.id === "tr_sk_product"
            ? {
                ...translation,
                translations: {
                  ...translation.translations,
                  description: "Nečakaná zmena SK product prekladu",
                },
              }
            : translation
        ),
      },
      {
        ...input,
        translations: input.translations.map((translation) =>
          translation.id === "tr_sk_content"
            ? {
                ...translation,
                translations: {
                  ...translation.translations,
                  usage: "Nečakaná zmena SK content prekladu",
                },
              }
            : translation
        ),
      },
      {
        ...input,
        products: input.products.map((product) => ({
          ...product,
          variants: product.variants.map((variant) => ({
            ...variant,
            prices: variant.prices?.map((price) =>
              price.currency_code === "eur" ? { ...price, amount: 3000 } : price
            ),
          })),
        })),
      },
      {
        ...input,
        categories: input.categories.map((category) => ({
          ...category,
          metadata: {
            ...(category.metadata as Record<string, unknown>),
            top_description_html: "<p>Nečakaná zmena SK kategórie</p>",
          },
        })),
      },
    ]

    for (const postApplyInput of postApplyInputs) {
      const report = buildRoCatalogReadinessReport(
        postApplyInput,
        expected,
        generatedAt
      )
      expect(report.skBaseline.observed.sha256).not.toBe(expected.sha256)
      expect(report.skBaseline.matched).toBe(false)
      expect(report.issues).toContainEqual(
        expect.objectContaining({ code: "SK_BASELINE_MISMATCH" })
      )
      expect(report.ready).toBe(false)
    }

    const ronOnlyChange: RoCatalogReadinessInput = {
      ...input,
      products: input.products.map((product) => ({
        ...product,
        variants: product.variants.map((variant) => ({
          ...variant,
          prices: variant.prices?.map((price) =>
            price.currency_code === "ron" ? { ...price, amount: 5000 } : price
          ),
        })),
      })),
    }
    expect(buildSkPublicationBaseline(ronOnlyChange)).toEqual(expected)
  })

  it("requires an explicit, valid expected SK baseline CLI handoff", () => {
    const hash = "a".repeat(64)
    expect(
      parseExpectedSkBaselineArgs([
        `--expected-sk-baseline-hash=${hash}`,
        "--expected-sk-baseline-count",
        "4",
      ])
    ).toEqual({ count: 4, sha256: hash })
    expect(() => parseExpectedSkBaselineArgs([])).toThrow(
      "Missing required --expected-sk-baseline-hash value"
    )
    expect(() =>
      parseExpectedSkBaselineArgs([
        "--expected-sk-baseline-hash=invalid",
        "--expected-sk-baseline-count=4",
      ])
    ).toThrow("must be a lowercase SHA-256 value")
  })

  it("fingerprints shared inventory links and quantities independently", () => {
    const input = readyInput()
    const expected = buildSharedInventoryBaseline(input)
    for (const changed of [
      {
        ...input,
        inventoryItemLinks: input.inventoryItemLinks?.map((link) => ({
          ...link,
          required_quantity: 2,
        })),
      },
      {
        ...input,
        inventoryLevels: input.inventoryLevels?.map((level) => ({
          ...level,
          stocked_quantity: 11,
        })),
      },
      {
        ...input,
        inventoryLevels: input.inventoryLevels?.map((level) => ({
          ...level,
          reserved_quantity: 3,
        })),
      },
      {
        ...input,
        products: input.products.map((product) => ({
          ...product,
          variants: product.variants.map((variant) => ({
            ...variant,
            sku: `${variant.sku}-changed`,
          })),
        })),
      },
      {
        ...input,
        products: input.products.map((product) => ({
          ...product,
          variants: product.variants.map((variant) => ({
            ...variant,
            ean: "8580000000999",
          })),
        })),
      },
    ]) {
      expect(buildSharedInventoryBaseline(changed)).not.toEqual(expected)
    }
    expect(
      buildSharedInventoryBaseline({
        ...input,
        products: input.products.map((product) => ({
          ...product,
          variants: product.variants.map((variant) => ({
            ...variant,
            prices: [
              ...(variant.prices ?? []),
              { amount: 999, currency_code: "ron" },
            ],
          })),
        })),
      })
    ).toEqual(expected)
  })

  it("rejects a database clone switch despite an unchanged semantic fingerprint", () => {
    const reviewedEnvironment = {
      DATABASE_URL: "postgresql://user:secret@db-blue:5432/herbatika",
      RO_DEMO_DATABASE_INSTANCE_ID: "zane-postgres-blue",
    }
    const reviewed = buildRoDemoDatabaseInstanceFingerprint(reviewedEnvironment)

    expect(
      assertFreshRoDatabaseInstanceFingerprint(reviewed, reviewedEnvironment)
    ).toBe(reviewed)
    expect(() =>
      assertFreshRoDatabaseInstanceFingerprint(reviewed, {
        ...reviewedEnvironment,
        DATABASE_URL: "postgresql://user:secret@db-clone:5432/herbatika",
        RO_DEMO_DATABASE_INSTANCE_ID: "disposable-clone",
      })
    ).toThrow("Fresh database instance does not match")
  })

  it("requires exact RON only for plan-bound sellable variants", () => {
    const input = readyInput()
    const unavailableInput: RoCatalogReadinessInput = {
      ...input,
      products: input.products.map((product) => ({
        ...product,
        variants: product.variants.map((variant) => ({
          ...variant,
          prices: variant.prices?.filter(
            (price) => price.currency_code !== "ron"
          ),
        })),
      })),
    }
    const scope = {
      brandExcludedIds: [],
      brandIds: ["brand_1"],
      categoryExcludedIds: [],
      categoryPublishedIds: ["pcat_1"],
      collectionIds: ["pcol_1"],
      productExcludedIds: [],
      productPublishedIds: ["prod_1"],
    }
    const unavailable = {
      keyKind: "sku" as const,
      keyValue: "BEFUNGIN-100",
      productId: "prod_1",
      roAvailability: "unavailable" as const,
      ronAmount: null,
    }
    const report = buildRoCatalogReadinessReport(
      unavailableInput,
      buildSkPublicationBaseline(unavailableInput),
      generatedAt,
      {
        expectedScopePlan: scope,
        expectedScopePlanHash: buildRoCatalogScopePlanHash(scope),
        expectedVariantExpectations: [unavailable],
        provenance: "in-memory-audit-input",
      }
    )
    expect(report.ready).toBe(true)
    expect(report.roVariantScope).toMatchObject({ sellable: 0, unavailable: 1 })

    const wronglyPriced = buildRoCatalogReadinessReport(
      input,
      buildSkPublicationBaseline(input),
      generatedAt,
      {
        expectedScopePlan: scope,
        expectedScopePlanHash: buildRoCatalogScopePlanHash(scope),
        expectedVariantExpectations: [unavailable],
        provenance: "in-memory-audit-input",
      }
    )
    expect(wronglyPriced.ready).toBe(false)
    expect(wronglyPriced.issues).toContainEqual(
      expect.objectContaining({
        code: "UNAVAILABLE_RO_VARIANT_HAS_RON_PRICE",
      })
    )
  })

  it("carries invalid SK publication issues in the canonical preflight", () => {
    const input = readyInput()
    const invalid: RoCatalogReadinessInput = {
      ...input,
      translations: input.translations.filter(
        (translation) => translation.id !== "tr_sk_product"
      ),
    }
    const audit = buildSkPublicationAuditBaseline(invalid)

    expect(audit.publication.errors).toBeGreaterThan(0)
    expect(audit.issues).toContainEqual(
      expect.objectContaining({ code: "SK_PUBLISHED_TRANSLATION_MISSING" })
    )
  })

  it("writes private exact JSON atomically and never clobbers evidence", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ro-readiness-"))
    const outputPath = join(directory, "backend-ro-readiness.json")
    try {
      expect(parseReadinessOutputPath([`--output=${outputPath}`])).toBe(
        outputPath
      )
      expect(() =>
        parseReadinessOutputPath(["--output=relative.json"])
      ).toThrow("must be an absolute path")
      expect(() =>
        parseReadinessOutputPath([
          `--output=${outputPath}`,
          "--output",
          outputPath,
        ])
      ).toThrow("must be provided exactly once")

      const input = readyInput()
      const report = buildRoCatalogReadinessReport(
        input,
        buildSkPublicationBaseline(input),
        generatedAt,
        "fresh-medusa-database-read"
      )
      await writeRoCatalogReadinessReport(outputPath, report)

      const originalBytes = await readFile(outputPath, "utf8")

      expect(
        parseRoCatalogReadinessReportArtifact(JSON.parse(originalBytes))
      ).toEqual(report)
      expect(originalBytes.endsWith("\n")).toBe(true)
      expect((await stat(outputPath)).mode % 0o1000).toBe(0o600)

      await expect(
        writeRoCatalogReadinessReport(outputPath, {
          ...report,
          generatedAt: "2026-08-20T12:00:01.000Z",
        })
      ).rejects.toMatchObject({ code: "EEXIST" })
      expect(await readFile(outputPath, "utf8")).toBe(originalBytes)
      expect(await readdir(directory)).toEqual(["backend-ro-readiness.json"])
    } finally {
      await rm(directory, { force: true, recursive: true })
    }
  })

  it("fingerprints the exact Romanian translation evidence", () => {
    const input = readyInput()
    const expectedSkBaseline = buildSkPublicationBaseline(input)
    const original = buildRoCatalogReadinessReport(input, expectedSkBaseline)
    const changed = buildRoCatalogReadinessReport(
      {
        ...input,
        translations: input.translations.map((translation) =>
          translation.id === "tr_product"
            ? {
                ...translation,
                translations: {
                  ...translation.translations,
                  description: "Altă descriere românească",
                },
              }
            : translation
        ),
      },
      expectedSkBaseline
    )

    expect(changed.roCompletenessProof.dataHash).not.toBe(
      original.roCompletenessProof.dataHash
    )
    expect(changed.skBaseline.matched).toBe(true)
  })

  it("accepts exact empty structured content only through a bound demo omission ledger", () => {
    const input = readyInput()
    const description = "Descriere română"
    const omission = {
      omittedFields: ["usage", "composition", "warning", "other"] as const,
      productContentId: "pcont_1",
      productId: "prod_1",
      roDescriptionSha256: createHash("sha256")
        .update(description)
        .digest("hex"),
      sourceContentSha256: "b".repeat(64),
      sourceUrl: "https://herbatica.ro/produs/befungin/",
    }
    const secret = "readiness-test-secret-that-is-at-least-32-bytes"
    process.env.RO_DEMO_OMISSION_AUTHORITY_SECRET = secret
    const authority = createRoDemoOmissionAuthority(
      {
        ...omission,
        ledgerSha256: buildDemoOmissionLedgerHash([omission]),
        mode: "official-ro-description-only",
        schemaVersion: 1,
      },
      secret
    )
    const demoInput: RoCatalogReadinessInput = {
      ...input,
      demoContentOmissions: [omission],
      readinessMode: "demo",
      translations: input.translations.map((translation) =>
        translation.id === "tr_content"
          ? {
              ...translation,
              translations: {
                __demo_omission_authority: authority,
                composition: "",
                other: "",
                usage: "",
                warning: "",
              },
            }
          : translation
      ),
    }
    const report = buildRoCatalogReadinessReport(
      demoInput,
      buildSkPublicationBaseline(demoInput),
      generatedAt
    )

    expect(report.ready).toBe(true)
    expect(report.readinessMode).toBe("demo")
    expect(report.issues).toEqual([
      expect.objectContaining({
        code: "RO_DEMO_STRUCTURED_CONTENT_OMITTED",
        severity: "warning",
      }),
    ])
    expect(report.summary).toMatchObject({
      demoContentOmissionFields: 4,
      demoOmissionLedgerEntries: 1,
      demoProductsWithContentOmissions: 1,
      errors: 0,
      warnings: 1,
    })

    const hiddenDescription = "<script>alert(1)</script><p> </p>"
    const hiddenOmission = {
      ...omission,
      roDescriptionSha256: createHash("sha256")
        .update(hiddenDescription)
        .digest("hex"),
    }
    const hiddenAuthority = createRoDemoOmissionAuthority(
      {
        ...hiddenOmission,
        ledgerSha256: buildDemoOmissionLedgerHash([hiddenOmission]),
        mode: "official-ro-description-only",
        schemaVersion: 1,
      },
      secret
    )
    const hiddenReport = buildRoCatalogReadinessReport(
      {
        ...demoInput,
        demoContentOmissions: [hiddenOmission],
        translations: demoInput.translations.map((translation) => {
          if (translation.id === "tr_product") {
            return {
              ...translation,
              translations: {
                ...translation.translations,
                description: hiddenDescription,
              },
            }
          }
          if (translation.id === "tr_content") {
            return {
              ...translation,
              translations: {
                ...translation.translations,
                __demo_omission_authority: hiddenAuthority,
              },
            }
          }
          return translation
        }),
      },
      buildSkPublicationBaseline(demoInput),
      generatedAt
    )
    expect(hiddenReport.ready).toBe(false)
    expect(hiddenReport.issues).toContainEqual(
      expect.objectContaining({ code: "RO_DEMO_CONTENT_OMISSION_INVALID" })
    )

    const productionReport = buildRoCatalogReadinessReport(
      { ...demoInput, readinessMode: "production" },
      buildSkPublicationBaseline(demoInput),
      generatedAt
    )
    expect(productionReport.ready).toBe(false)
    expect(productionReport.issues).toContainEqual(
      expect.objectContaining({
        code: "RO_DEMO_OMISSION_FORBIDDEN_IN_PRODUCTION",
      })
    )
  })

  it("validates the strict official-description-only demo ledger contract", () => {
    const ledger = {
      entries: [
        {
          omittedFields: ["composition", "other", "usage", "warning"],
          productContentId: "pcont_1",
          productId: "prod_1",
          roDescriptionSha256: "a".repeat(64),
          sourceContentSha256: "b".repeat(64),
          sourceUrl: "https://www.herbatica.ro/produs/befungin/",
        },
      ],
      mode: "official-ro-description-only",
      schemaVersion: 1,
    }
    expect(parseRoDemoContentOmissionLedger(ledger).entries[0]).toMatchObject({
      omittedFields: ["usage", "composition", "warning", "other"],
      productId: "prod_1",
    })
    const pureLedger = parseRoDemoContentOmissionLedgerArtifact(ledger)
    expect(hashRoDemoContentOmissionLedger(pureLedger)).toBe(
      buildDemoOmissionLedgerHash(pureLedger.entries)
    )
    expect(() =>
      parseRoDemoContentOmissionLedger({
        ...ledger,
        entries: [
          {
            ...ledger.entries[0],
            omittedFields: ["usage"],
          },
        ],
      })
    ).toThrow("must contain every structured field exactly once")
    expect(() =>
      parseDemoOmissionLedgerPath([
        "--readiness-mode=production",
        "--demo-omission-ledger=/tmp/omissions.json",
      ])
    ).toThrow("forbidden in production readiness mode")
  })

  it("accepts exactly one price-authority post-commerce hash key", () => {
    const fixture = cutoverReceiptFixture()

    expect(parseRoTwoPhaseProvenanceReceipt(fixture).receipt).toEqual(fixture)

    const missingPriceAuthority = Object.fromEntries(
      Object.entries(fixture.postCommerce).filter(
        ([key]) => key !== "priceAuthoritySha256"
      )
    )
    expect(() =>
      parseRoTwoPhaseProvenanceReceipt({
        ...fixture,
        postCommerce: missingPriceAuthority,
      })
    ).toThrow("receipt.postCommerce is invalid")

    expect(() =>
      parseRoTwoPhaseProvenanceReceipt({
        ...fixture,
        postCommerce: {
          ...fixture.postCommerce,
          priceAuthoritySha256Copy: fixture.postCommerce.priceAuthoritySha256,
        },
      })
    ).toThrow("receipt.postCommerce is invalid")
  })

  it("parses the exact cutover receipt and rejects chain or path tampering", () => {
    const fixture = cutoverReceiptFixture()
    const parsed = parseRoTwoPhaseProvenanceReceipt(fixture)

    expect(parsed.receipt).toEqual(fixture)
    expect(parsed.receiptSha256).toBe(hashRoTwoPhaseProvenanceReceipt(fixture))
    expect(
      parseRoTwoPhaseProvenanceReceipt(fixture, parsed.receiptSha256)
    ).toEqual(parsed)

    expect(() =>
      parseRoTwoPhaseProvenanceReceipt({
        ...fixture,
        artifacts: {
          staticTaxonomyConvergence: {
            ...fixture.artifacts.staticTaxonomyConvergence,
            path: "../static-taxonomy-convergence.json",
          },
        },
      })
    ).toThrow("receipt.artifacts.staticTaxonomyConvergence is invalid")
    expect(() =>
      parseRoTwoPhaseProvenanceReceipt({
        ...fixture,
        postCommerce: {
          ...fixture.postCommerce,
          commercePlanFileSha256: "a".repeat(64),
        },
      })
    ).toThrow("chain is broken")
    expect(() =>
      parseRoTwoPhaseProvenanceReceipt({
        ...fixture,
        operations: {
          ...fixture.operations,
          maintenance: {
            ...fixture.operations.maintenance,
            path: "../maintenance-proof.json",
          },
        },
      })
    ).toThrow("receipt.operations.maintenance is invalid")
    expect(() =>
      parseRoTwoPhaseProvenanceReceipt({
        ...fixture,
        postCommerce: {
          ...fixture.postCommerce,
          postCommerceSharedInventoryFingerprintCount:
            fixture.postCommerce.postCommerceSharedInventoryFingerprintCount +
            1,
        },
      })
    ).toThrow("chain is broken")
    expect(() =>
      parseRoTwoPhaseProvenanceReceipt({
        ...fixture,
        postCommerce: {
          ...fixture.postCommerce,
          commerceManifestSha256: "e".repeat(64),
        },
      })
    ).toThrow("chain is broken")
    expect(() =>
      parseRoTwoPhaseProvenanceReceipt({
        ...fixture,
        releaseIdentity: {
          ...fixture.releaseIdentity,
          databaseFingerprint: "wrong-environment",
        },
      })
    ).toThrow("receipt.releaseIdentity is invalid")
    expect(() =>
      parseRoTwoPhaseProvenanceReceipt({
        ...fixture,
        releaseIdentity: {
          ...fixture.releaseIdentity,
          databaseInstanceFingerprint: "clone",
        },
      })
    ).toThrow("receipt.releaseIdentity is invalid")
    expect(() =>
      parseRoTwoPhaseProvenanceReceipt(fixture, "f".repeat(64))
    ).toThrow("receipt SHA-256 mismatch")
  })

  it("fails closed for missing Romanian content, URL assignments, region, and prices", () => {
    const input = readyInput()
    const broken: RoCatalogReadinessInput = {
      ...input,
      assignments: [],
      productContents: [],
      products: input.products.map((product) => ({
        ...product,
        variants: [{ id: "variant_1", prices: [{ currency_code: "eur" }] }],
      })),
      paymentProviders: [],
      regionPaymentProviderLinks: [],
      regions: [
        {
          countries: [{ iso_2: "ro" }],
          currency_code: "eur",
          id: "reg_ro",
          name: "Europe",
        },
      ],
      shippingOptions: [],
      shippingPriceSets: [],
      taxRates: [],
      taxRegions: [],
      translations: [
        ...input.translations.filter(
          (translation) => translation.locale_code === "sk-SK"
        ),
        {
          id: "tr_product",
          locale_code: "ro-RO",
          reference: "product",
          reference_id: "prod_1",
          translations: { title: "" },
        },
      ],
    }

    const report = buildReport(broken, generatedAt)
    const codes = new Set(report.issues.map((issue) => issue.code))

    expect(report.ready).toBe(false)
    expect(codes).toEqual(
      new Set([
        "MISSING_PRODUCT_CONTENT_SOURCE",
        "MISSING_PUBLISHED_RO_BRAND_ASSIGNMENT",
        "MISSING_RON_VARIANT_PRICE",
        "MISSING_PUBLISHED_RO_COLLECTION_ASSIGNMENT",
        "MISSING_RO_TRANSLATED_FIELD",
        "MISSING_RO_TRANSLATION",
        "MISSING_PUBLISHED_RO_CATEGORY_SLUG",
        "RO_PRODUCT_PUBLICATION_TRANSLATION_INCOMPLETE",
        "RO_REGION_CURRENCY_NOT_RON",
        "RO_REGION_HAS_NO_PAYMENT_PROVIDER",
        "RO_HAS_NO_SHIPPING_OPTION",
        "RO_TAX_REGION_CARDINALITY_INVALID",
      ])
    )
  })

  it("excludes RO-unassigned products without weakening their published SK baseline", () => {
    const input = readyInput()
    const excludedInput: RoCatalogReadinessInput = {
      ...input,
      productContents: [],
      products: input.products.map((product) => ({
        ...product,
        metadata: {
          url_registry_publication: {
            markets: {
              sk: {
                publicationStatus: "published",
                publicSlug: "befungin-tinktura-s-extraktom-z-cagy",
                salesChannelId: "sc_sk",
              },
            },
            schemaVersion: 1,
          },
        },
        variants: [{ id: "variant_1", prices: [{ currency_code: "eur" }] }],
      })),
      translations: input.translations.filter(
        (translation) =>
          translation.locale_code !== "ro-RO" ||
          (translation.reference !== "product" &&
            translation.reference !== "product_content")
      ),
    }
    const report = buildReport(excludedInput, generatedAt)

    expect(report.issues).toEqual([])
    expect(report.ready).toBe(true)
    expect(report.summary).toMatchObject({
      productContentRecords: 0,
      products: 0,
      variants: 0,
      variantsWithRonPrice: 0,
    })
    expect(report.roProductScope).toEqual({
      draft: 0,
      excluded: [{ id: "prod_1", reason: "ro-unassigned" }],
      globalPublished: 1,
      invalid: 0,
      published: 0,
      publishedIds: [],
      unassigned: 1,
    })
    expect(report.skPublication.products).toBe(1)
  })

  it("translates reviewed ghost categories while keeping their RO URL assignment draft", () => {
    const input = readyInput()
    const ghostId = "pcat_01KTA2V77E583E9W456C1JM295"
    const scoped: RoCatalogReadinessInput = {
      ...input,
      assignments: [
        ...input.assignments,
        {
          entity_id: ghostId,
          entity_kind: "category",
          market_code: "sk",
          public_slug: "duplikat",
          publication_status: "published",
          sales_channel_id: "sc_sk",
        },
        {
          entity_id: ghostId,
          entity_kind: "category",
          market_code: "ro",
          public_slug: "duplicat",
          publication_status: "draft",
          sales_channel_id: "sc_store",
        },
      ],
      categories: [
        ...input.categories,
        { id: ghostId, is_active: true, name: "Duplicitná kategória" },
      ],
      translations: [
        ...input.translations,
        {
          id: "tr_ghost_ro",
          locale_code: "ro-RO",
          reference: "product_category",
          reference_id: ghostId,
          translations: {
            bottom_description_html: null,
            description: null,
            meta_description: null,
            meta_title: null,
            name: "Categorie duplicată",
            top_description_html: null,
          },
        },
        {
          id: "tr_ghost_sk",
          locale_code: "sk-SK",
          reference: "product_category",
          reference_id: ghostId,
          translations: { name: "Duplicitná kategória" },
        },
      ],
    }
    const report = buildReport(scoped, generatedAt)

    expect(report.ready).toBe(true)
    expect(report.roCatalogPublication.categoryIds).toEqual(["pcat_1"])
    expect(report.roCategoryScope).toEqual({
      active: 2,
      authoritySha256:
        "54ebd183e28141bc449c07fbdb68463db1e059e1a2508ba364dad31d6f5c753e",
      draft: 1,
      excluded: [expect.objectContaining({ id: ghostId, state: "draft" })],
      invalid: 0,
      published: 1,
      translated: 2,
      unassigned: 0,
    })

    const withoutPreviousRoAssignment: RoCatalogReadinessInput = {
      ...scoped,
      assignments: scoped.assignments.filter(
        (assignment) =>
          !(assignment.entity_id === ghostId && assignment.market_code === "ro")
      ),
    }
    const unassignedReport = buildReport(
      withoutPreviousRoAssignment,
      generatedAt
    )
    expect(unassignedReport.ready).toBe(true)
    expect(unassignedReport.roCategoryScope).toMatchObject({
      draft: 0,
      excluded: [expect.objectContaining({ id: ghostId, state: "unassigned" })],
      unassigned: 1,
    })
  })

  it("rejects an RO product assignment linked to a channel the product does not carry", () => {
    const input = readyInput()
    const report = buildReport(
      {
        ...input,
        products: input.products.map((product) => ({
          ...product,
          sales_channels: [{ id: "sc_sk" }],
        })),
      },
      generatedAt
    )

    expect(report.ready).toBe(false)
    expect(report.issues).toContainEqual(
      expect.objectContaining({
        code: "RO_PRODUCT_CHANNEL_NOT_LINKED",
        entityId: "prod_1",
      })
    )
  })

  it("rejects copied source text in every critical Romanian catalog layer", () => {
    const input = readyInput()
    const translations = input.translations.map((translation) => {
      if (translation.reference === "product") {
        return {
          ...translation,
          translations: {
            ...translation.translations,
            title: "  BEFUNGIN TINKTÚRA S EXTRAKTOM Z ČAGY  ",
          },
        }
      }
      if (translation.reference === "product_content") {
        return {
          ...translation,
          translations: {
            ...translation.translations,
            composition: "<p>Čaga</p>",
          },
        }
      }
      return {
        ...translation,
        translations: {
          ...translation.translations,
          description: "Slovenský popis kategórie",
          name: "Prírodná kozmetika",
        },
      }
    })

    const report = buildReport({ ...input, translations }, generatedAt)

    expect(
      report.issues.filter(
        (issue) => issue.code === "RO_TRANSLATION_EQUALS_SOURCE"
      )
    ).toEqual([
      expect.objectContaining({ entityId: "prod_1", entityKind: "product" }),
      expect.objectContaining({ entityId: "pcont_1", entityKind: "product" }),
      expect.objectContaining({ entityId: "pcat_1", entityKind: "category" }),
      expect.objectContaining({
        entityId: "pcat_1",
        entityKind: "category",
        message: expect.stringContaining('field "description"'),
      }),
    ])
    expect(report.ready).toBe(false)
  })

  it("allows only an exact, reasoned, code-reviewed neutral equality", () => {
    const input = readyInput()
    const translations = input.translations.map((translation) =>
      translation.reference === "product"
        ? {
            ...translation,
            translations: {
              ...translation.translations,
              title: "Befungin tinktúra s extraktom z čagy",
            },
          }
        : translation
    )
    const report = buildReport(
      {
        ...input,
        reviewedNeutralEqualities: [
          {
            entityId: "prod_1",
            entityKind: "product",
            field: "title",
            normalizedValue: normalizeRoCatalogComparableText(
              "Befungin tinktúra s extraktom z čagy"
            ),
            reason: "Human-reviewed product proper name for this fixture.",
            reference: "product",
          },
        ],
        translations,
      },
      generatedAt
    )

    expect(report.ready).toBe(true)
    expect(report.summary.reviewedNeutralEqualitiesUsed).toBe(1)
  })

  it("accepts category rich content only through the exact locale-scoped contract", () => {
    const input = readyInput()
    const report = buildReport(
      {
        ...input,
        categories: input.categories.map((category) => ({
          ...category,
          metadata: {
            bottom_description_html: "<p>Slovenský spodný text</p>",
            meta_description: "Slovenský SEO popis",
            meta_title: "Slovenský SEO titulok",
            top_description_html: "<p>Slovenský horný text</p>",
          },
        })),
        translations: input.translations.map((translation) =>
          translation.reference === "product_category" &&
          translation.locale_code === "ro-RO"
            ? {
                ...translation,
                translations: {
                  ...translation.translations,
                  bottom_description_html: "Text inferior românesc",
                  meta_description: "Descriere SEO românească",
                  meta_title: "Titlu SEO românesc",
                  top_description_html: "Text superior românesc",
                },
              }
            : translation
        ),
      },
      generatedAt
    )

    expect(report.summary.categoryLocalizedContentContracts).toBe(1)
    expect(report.ready).toBe(true)
  })

  it("rejects missing, invalid, or source-copied category localized-content fields", () => {
    const input = readyInput()
    const report = buildReport(
      {
        ...input,
        categories: input.categories.map((category) => ({
          ...category,
          metadata: {
            bottom_description_html: "<p>Spodný slovenský text</p>",
            meta_description: "Slovenský SEO popis",
            meta_title: "Slovenský SEO titulok",
            top_description_html: "<p>Horný slovenský text</p>",
          },
        })),
        translations: input.translations.map((translation) => {
          if (
            translation.reference !== "product_category" ||
            translation.locale_code !== "ro-RO"
          ) {
            return translation
          }
          return {
            ...translation,
            translations: {
              bottom_description_html: 42,
              description: translation.translations.description,
              meta_description: "Slovenský SEO popis",
              meta_title: "Titlu SEO românesc",
              name: translation.translations.name,
            },
          }
        }),
      },
      generatedAt
    )

    expect(report.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "RO_CATEGORY_LOCALIZED_CONTENT_FIELD_INVALID",
        "RO_CATEGORY_LOCALIZED_CONTENT_FIELD_MISSING",
        "RO_TRANSLATION_EQUALS_SOURCE",
      ])
    )
    expect(report.summary.categoryLocalizedContentContracts).toBe(0)
    expect(report.ready).toBe(false)
  })

  it("requires the exact category Translation to own description even without a source description", () => {
    const input = readyInput()
    const report = buildReport(
      {
        ...input,
        categories: input.categories.map((category) => ({
          ...category,
          description: null,
        })),
        translations: input.translations.map((translation) =>
          translation.reference === "product_category" &&
          translation.locale_code === "ro-RO"
            ? {
                ...translation,
                translations: {
                  bottom_description_html:
                    translation.translations.bottom_description_html,
                  meta_description: translation.translations.meta_description,
                  meta_title: translation.translations.meta_title,
                  name: translation.translations.name,
                  top_description_html:
                    translation.translations.top_description_html,
                },
              }
            : translation
        ),
      },
      generatedAt
    )

    expect(report.issues).toContainEqual(
      expect.objectContaining({
        code: "RO_CATEGORY_LOCALIZED_CONTENT_FIELD_MISSING",
        entityId: "pcat_1",
        message: expect.stringContaining('field "description"'),
      })
    )
    expect(report.summary.categoryLocalizedContentContracts).toBe(0)
    expect(report.ready).toBe(false)
  })

  it("fails checkout readiness for disabled payment, EUR-only shipping, or a missing default tax rate", () => {
    const input = readyInput()
    const report = buildReport(
      {
        ...input,
        paymentProviders: [{ id: "pp_stripe", is_enabled: false }],
        shippingPriceSets: [
          {
            price_set: { prices: [{ currency_code: "eur" }] },
            shipping_option_id: "so_ro",
          },
        ],
        taxRates: [
          {
            id: "txrate_ro",
            is_default: false,
            rate: 19,
            tax_region_id: "txreg_ro",
          },
        ],
      },
      generatedAt
    )

    expect(new Set(report.issues.map((issue) => issue.code))).toEqual(
      new Set([
        "RO_REGION_HAS_NO_PAYMENT_PROVIDER",
        "RO_SHIPPING_OPTION_MISSING_RON_PRICE",
        "RO_TAX_REGION_HAS_NO_DEFAULT_RATE",
      ])
    )
    expect(report.ready).toBe(false)
  })

  it("rejects reused Slovak slugs when the Romanian titles differ", () => {
    const input = readyInput()
    const skProductSlug = (
      input.products[0]?.metadata as {
        url_registry_publication: {
          markets: { sk: { publicSlug: string } }
        }
      }
    ).url_registry_publication.markets.sk.publicSlug
    const broken: RoCatalogReadinessInput = {
      ...input,
      assignments: input.assignments.map((assignment) =>
        assignment.market_code === "ro"
          ? { ...assignment, public_slug: "prirodna-kozmetika" }
          : assignment
      ),
      products: input.products.map((product) => ({
        ...product,
        metadata: {
          url_registry_publication: {
            markets: {
              ro: {
                publicationStatus: "published",
                publicSlug: skProductSlug,
                salesChannelId: "sc_store",
              },
              sk: {
                publicationStatus: "published",
                publicSlug: skProductSlug,
                salesChannelId: "sc_sk",
              },
            },
            schemaVersion: 1,
          },
        },
      })),
    }

    const report = buildReport(broken, generatedAt)

    expect(
      report.issues.filter((issue) => issue.code === "RO_SLUG_REUSES_SK_SLUG")
    ).toEqual([
      expect.objectContaining({ entityId: "prod_1", entityKind: "product" }),
      expect.objectContaining({ entityId: "pcat_1", entityKind: "category" }),
    ])
    expect(report.ready).toBe(false)
  })

  it("detects duplicate Romanian slugs within an entity route namespace", () => {
    const input = readyInput()
    const sourceProduct = input.products[0]
    const sourceContent = input.productContents[0]
    expect(sourceProduct).toBeDefined()
    expect(sourceContent).toBeDefined()
    if (!(sourceProduct && sourceContent)) {
      throw new Error("ready fixture is incomplete")
    }
    const duplicateProduct = {
      ...sourceProduct,
      id: "prod_2",
      title: "Druhý produkt",
      metadata: {
        url_registry_publication: {
          markets: {
            ro: {
              publicationStatus: "published",
              publicSlug: "befungin-tinctura-cu-extract-de-chaga",
              salesChannelId: "sc_store",
            },
          },
          schemaVersion: 1,
        },
      },
      variants: [{ id: "variant_2", prices: [{ currency_code: "ron" }] }],
    }
    const report = buildReport(
      {
        ...input,
        productContents: [
          ...input.productContents,
          { ...sourceContent, id: "pcont_2", product_id: "prod_2" },
        ],
        products: [...input.products, duplicateProduct],
        translations: [
          ...input.translations,
          {
            id: "tr_product_2",
            locale_code: "ro-RO",
            reference: "product",
            reference_id: "prod_2",
            translations: {
              description: "Descriere",
              title: "Al doilea produs",
            },
          },
          {
            id: "tr_content_2",
            locale_code: "ro-RO",
            reference: "product_content",
            reference_id: "pcont_2",
            translations: {
              composition: "Chaga",
              usage: "Zilnic",
              warning: "Atenție",
            },
          },
        ],
      },
      generatedAt
    )

    expect(report.issues).toContainEqual(
      expect.objectContaining({
        code: "DUPLICATE_RO_PUBLIC_SLUG",
        entityId: "prod_2",
        entityKind: "product",
      })
    )
  })
})

import { createHash } from "node:crypto"

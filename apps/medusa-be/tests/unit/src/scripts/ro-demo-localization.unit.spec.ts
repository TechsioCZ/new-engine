import { createHash } from "node:crypto"
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  assertFinalDemoPartition,
  buildRomanianDemoLocalization,
  type DemoLocalizationInput,
  parseBoundPostCommerceEnvelope,
  parseDemoCatalogEntitiesJson,
  parseDemoLocalizationCliOptions,
  parseDemoOfficialJsonl,
  parseMergedDemoProductJsonl,
  parsePrecommercePriceAuthorityCliOptions,
  postCommerceSha256,
  stablePostCommerceJson,
  writeDemoLocalizationArtifacts,
} from "../../../../src/scripts/ro-demo-localization"

const sha = "a".repeat(64)
const SHA_256 = /^[a-f0-9]{64}$/
const required = <Value>(value: Value | undefined, label: string): Value => {
  if (value === undefined) {
    throw new Error(`${label} missing`)
  }
  return value
}
const fallbackSource = {
  contentSha256: sha,
  retrievedAt: "2026-08-20T10:00:00.000Z",
  url: "https://www.herbatica.ro/export/catalog.jsonl",
} as const
const postCommerceInventoryEvidence = {
  capturedAt: "2026-08-20T12:00:00.000Z",
  commerceApplyReceiptSha256: sha,
  commercePlanFileSha256: sha,
  commercePlanHash: sha,
  commerceRestoreArtifactSha256: sha,
  environment: {
    backendBuildHash: "a".repeat(40),
    backendDeploymentId: "deploy-test-blue",
    backendReleaseSha: "b".repeat(40),
    backendSlot: "blue",
    databaseFingerprint: sha,
    environmentId: "test-blue",
    locale: "ro-RO",
    marketCode: "ro",
    salesChannelId: "sc_ro",
  },
  kind: "ro-demo-post-commerce-envelope",
  observedCommerceSnapshotSha256: sha,
  payloadSha256: sha,
  postCommerceEnvelopeSha256: sha,
  postCommerceSharedInventoryFingerprint: { count: 1, sha256: sha },
  postCommerceSkBaseline: { count: 1, errors: [], sha256: sha },
  preCommerceSharedInventoryFingerprint: { count: 1, sha256: sha },
  preCommerceSkBaseline: { count: 1, errors: [], sha256: sha },
  priceAuthoritySha256: sha,
  rawLiveInventorySha256: sha,
  schemaVersion: 1,
  sourceInventoryEnvelopeSha256: sha,
} as const

const completeCategory = {
  copySource: "agent-generated-unreviewed",
  key: { kind: "medusa_id", value: "pcat_1" },
  publicSlug: "suplimente-nutritive",
  source: fallbackSource,
  translation: {
    bottom_description_html: null,
    description: "Selecție de suplimente nutritive Herbatica.",
    meta_description: "Suplimente nutritive Herbatica",
    meta_title: "Suplimente nutritive",
    name: "Suplimente nutritive",
    top_description_html: null,
  },
} as const

const input = (): DemoLocalizationInput => ({
  fallbackSource,
  generatedAt: "2026-08-20T12:00:00.000Z",
  inventory: {
    brands: [],
    categories: [
      {
        description: "Slovenský popis",
        directChildCount: 0,
        directProductCount: 1,
        key: { kind: "medusa_id", value: "pcat_1" },
        name: "Doplnok výživy",
        parentKey: null,
      },
    ],
    products: [
      {
        description: "Slovenský popis produktu",
        externalId: "prod_1",
        id: "prod_1",
        productContentId: "pcont_1",
        roExclusionDecision: {
          approvedAt: "2026-08-20T12:00:00.000Z",
          approvedBy: "demo-catalog-owner",
          reason: "No bijective official Romanian identity",
          reference: "RO-DEMO-EXCLUSION-1",
        },
        productContent: {
          composition: "Čaga 100 mg",
          other: "",
          usage: "Užívajte jednu dávku denne.",
          warning: "Nevhodné pre deti.",
        },
        title: "Befungin tinktúra extrakt sibírskej čagy",
        variants: [
          {
            ean: "8586021132118",
            ronPrice: {
              amount: 12_000,
              approval: {
                approvedAt: "2026-08-20T09:00:00.000Z",
                approvedBy: "demo-catalog-owner",
                reference: "DEMO-RON-1",
              },
            },
            sku: "4868",
          },
        ],
      },
      {
        description: null,
        externalId: "prod_anchor",
        id: "prod_anchor",
        productContentId: "pcont_anchor",
        roExclusionDecision: {
          approvedAt: "2026-08-20T12:00:00.000Z",
          approvedBy: "demo-catalog-owner",
          reason: "No bijective official Romanian identity",
          reference: "RO-DEMO-EXCLUSION-ANCHOR",
        },
        productContent: {
          composition: "",
          other: "",
          usage: "",
          warning: "",
        },
        title: "Kotva",
        variants: [{ ean: "9999999999999", sku: "ANCHOR" }],
      },
    ],
  },
  officialCategories: [completeCategory],
  officialProducts: [
    {
      canonicalSlug: "produs-ancora",
      description: "Descriere oficială pentru produsul ancoră.",
      ean: "9999999999999",
      matchingStatus: "exact-bijective",
      medusaProductId: "prod_anchor",
      sku: "ANCHOR",
      source: {
        ...fallbackSource,
        url: "https://www.herbatica.ro/produs-ancora/",
      },
      title: "Produs ancoră",
    },
  ],
  postCommerceInventoryEvidence,
  readiness: {
    currencyCode: "ron",
    paymentProviderIds: ["pp_ro_demo"],
    regionId: "reg_ro",
    shippingOptionIds: ["so_ro_demo"],
    taxRegionIds: ["txreg_ro"],
  },
  salesChannelId: "sc_ro",
})

describe("Romanian demo localization fallback", () => {
  it("maps frozen products by EAN and preserves canonical Romanian copy", () => {
    const value = input()
    const official = {
      canonicalSlug:
        "befungin-tinctura-cu-extract-de-chaga-siberian-100-ml-herbatica",
      descriptions: { short: { text: "Descriere oficială în limba română." } },
      ean: "8586021132118",
      matchingStatus: "exact-bijective",
      medusaProductId: "prod_1",
      sku: "4868",
      source: {
        htmlSha256: "b".repeat(64),
        retrievedAt: "2026-08-20T11:00:00.000Z",
        url: "https://www.herbatica.ro/extracte-din-plante/befungin/",
      },
      title: "Befungin - tinctură cu extract de chaga siberiană",
    } as const
    const bundle = buildRomanianDemoLocalization({
      ...value,
      officialProducts: [official],
    })

    expect(bundle.authorization).toBe("demo-generated-unreviewed")
    expect(bundle.manifest.omissionMode).toBe("official-ro-description-only")
    expect(bundle.coverage).toMatchObject({
      generatedProducts: 0,
      matchedOfficialProducts: 1,
      unmatchedOfficialProducts: 0,
    })
    expect(bundle.manifest.products[0]).toMatchObject({
      key: { kind: "ean", value: "8586021132118" },
      publicSlug:
        "befungin-tinctura-cu-extract-de-chaga-siberian-100-ml-herbatica",
      translation: {
        description: "Descriere oficială în limba română.",
        title: "Befungin - tinctură cu extract de chaga siberiană",
      },
    })
    expect(bundle.manifest.products[0]?.source.contentSha256).toBe(
      "b".repeat(64)
    )
    expect(bundle.manifest.products[0]?.productContent).toEqual({
      composition: "",
      other: "",
      usage: "",
      warning: "",
    })
    expect(bundle.demoOmissionLedger).toMatchObject({
      entries: [
        {
          omittedFields: ["usage", "composition", "warning", "other"],
          productContentId: "pcont_1",
          productId: "prod_1",
          sourceContentSha256: "b".repeat(64),
        },
      ],
      mode: "official-ro-description-only",
      schemaVersion: 1,
    })
    expect(bundle.demoOmissionLedgerSha256).toMatch(SHA_256)
  })

  it("resolves slug collisions deterministically and independently of inventory order", () => {
    const value = input()
    const first = value.inventory.products[0]
    if (!first) {
      throw new Error("fixture product missing")
    }
    const second = {
      ...first,
      externalId: "prod_2",
      id: "prod_2",
      productContentId: "pcont_2",
      variants: [{ ean: "8586021132119", sku: "4869" }],
    }
    const officialProducts = [
      {
        canonicalSlug: "acelasi-slug",
        description: "Descriere oficială unu.",
        ean: "8586021132118",
        matchingStatus: "exact-bijective",
        medusaProductId: "prod_1",
        sku: "4868",
        source: fallbackSource,
        title: "Produs unu",
      },
      {
        canonicalSlug: "acelasi-slug",
        description: "Descriere oficială doi.",
        ean: "8586021132119",
        matchingStatus: "exact-bijective",
        medusaProductId: "prod_2",
        sku: "4869",
        source: { ...fallbackSource, url: "https://www.herbatica.ro/doi/" },
        title: "Produs doi",
      },
    ]
    const forward = buildRomanianDemoLocalization({
      ...value,
      inventory: { ...value.inventory, products: [first, second] },
      officialProducts,
    })
    const reverse = buildRomanianDemoLocalization({
      ...value,
      inventory: { ...value.inventory, products: [second, first] },
      officialProducts: [...officialProducts].reverse(),
    })
    const forwardSlugs = forward.manifest.products.map(
      ({ publicSlug }) => publicSlug
    )
    const reverseSlugs = reverse.manifest.products.map(
      ({ publicSlug }) => publicSlug
    )

    expect(forwardSlugs).toEqual(reverseSlugs)
    expect(new Set(forwardSlugs).size).toBe(2)
    expect(
      forward.warnings.some(({ code }) => code === "slug-collision-resolved")
    ).toBe(true)
  })

  it("does not mutate or translate excluded Slovak inventory", () => {
    const value = input()
    const before = structuredClone(value)
    const bundle = buildRomanianDemoLocalization(value)

    expect(value).toEqual(before)
    expect(bundle.manifest.products).toHaveLength(1)
    expect(bundle.manifest.excludedProducts[0]).toMatchObject({
      key: { kind: "medusa_id", value: "prod_1" },
      reason: "No bijective official Romanian identity",
    })
    expect(bundle.exclusions.inventoryProducts).toHaveLength(1)
    expect(JSON.stringify(bundle.manifest)).not.toContain("Užívajte")
    expect(JSON.stringify(bundle.manifest)).not.toContain("Nevhodné pre deti")
  })

  it("produces exact stable hashes and an importer-compatible manifest", () => {
    const value = input()
    const first = buildRomanianDemoLocalization(value)
    const second = buildRomanianDemoLocalization(structuredClone(value))

    expect(first).toEqual(second)
    expect(first.inputSha256).toMatch(SHA_256)
    expect(first.manifestSha256).toMatch(SHA_256)
    expect(first.generationPlanSha256).toMatch(SHA_256)
    expect(first.manifest.locale).toBe("ro-RO")
    expect(first.manifest.market).toBe("ro")
    expect(() => assertFinalDemoPartition(first)).toThrow(
      "exactly one approved sellable RON variant"
    )
  })

  it("parses typed official product and category JSONL records", () => {
    const parsed = parseDemoOfficialJsonl(
      [
        JSON.stringify({
          kind: "product",
          product: { sku: "4868", source: fallbackSource },
        }),
        JSON.stringify({
          category: {
            copySource: "official-ro",
            key: { kind: "medusa_id", value: "pcat_1" },
            source: fallbackSource,
          },
          kind: "category",
        }),
      ].join("\n")
    )
    expect(parsed.products).toHaveLength(1)
    expect(parsed.categories).toHaveLength(1)
  })

  it("requires separate CLI artifacts and exposes no apply switch", () => {
    const options = parseDemoLocalizationCliOptions([
      "--category-source",
      "categories.jsonl",
      "--catalog-entities",
      "catalog-entities.json",
      "--post-commerce-envelope",
      "post-commerce-envelope.json",
      "--post-commerce-envelope-sha256",
      sha,
      "--merged-products",
      "merged-products.jsonl",
      "--output-directory",
      "artifacts",
    ])
    expect(options.outputDirectoryPath).toContain("artifacts")
    expect(() =>
      parseDemoLocalizationCliOptions([
        "--category-source",
        "categories.jsonl",
        "--catalog-entities",
        "catalog-entities.json",
        "--post-commerce-envelope",
        "post-commerce-envelope.json",
        "--post-commerce-envelope-sha256",
        sha,
        "--merged-products",
        "merged-products.jsonl",
        "--output-directory",
        "artifacts",
        "--apply",
      ])
    ).toThrow("Unknown option --apply")
  })

  it("parses only the readiness-free pre-commerce authority mode", () => {
    const options = parsePrecommercePriceAuthorityCliOptions([
      "--inventory",
      "inventory.json",
      "--merged-products",
      "products.jsonl",
      "--raw-live-inventory",
      "raw-live.json",
      "--pre-commerce-price-authority-output",
      "price-authority.json",
    ])
    expect(options.outputPath).toContain("price-authority.json")
    expect(() =>
      parsePrecommercePriceAuthorityCliOptions([
        "--inventory",
        "inventory.json",
        "--merged-products",
        "products.jsonl",
        "--raw-live-inventory",
        "raw-live.json",
        "--pre-commerce-price-authority-output",
        "price-authority.json",
        "--apply",
        "yes",
      ])
    ).toThrow("Unknown option --apply")
  })

  it("rejects a rehashed inner payload when the reviewed wrapper bytes changed", () => {
    const reviewed = JSON.stringify({ payloadSha256: "a".repeat(64) })
    const reviewedSha256 = createHash("sha256").update(reviewed).digest("hex")
    const tampered = JSON.stringify({ payloadSha256: "b".repeat(64) })
    expect(() =>
      parseBoundPostCommerceEnvelope(tampered, reviewedSha256)
    ).toThrow("Post-commerce envelope SHA-256 mismatch")
  })

  it("parses a byte-bound real post-commerce wrapper before final generation", () => {
    const value = input()
    const {
      officialCategories: _officialCategories,
      officialProducts: _officialProducts,
      postCommerceInventoryEvidence: _postCommerceInventoryEvidence,
      ...fileBase
    } = value
    const firstProduct = required(
      fileBase.inventory.products[0],
      "first inventory product"
    )
    const payload = JSON.parse(
      JSON.stringify({
        ...fileBase,
        brandExclusionAuthority: {
          approvedAt: "2026-08-20T12:00:00.000Z",
          approvedBy: "demo-catalog-owner",
          referencePrefix: "RO-DEMO-BRAND",
        },
        inventory: {
          ...fileBase.inventory,
          products: [
            { ...firstProduct, roExclusionDecision: undefined },
            required(
              fileBase.inventory.products[1],
              "second inventory product"
            ),
          ],
        },
        mergedEvidenceCapturedAt: "2026-08-20T18:25:00.000Z",
      })
    )
    const wrapper = {
      capturedAt: "2026-08-20T12:00:00.000Z",
      commerceApplyReceiptSha256: sha,
      commercePlanFileSha256: sha,
      commercePlanHash: sha,
      commerceRestoreArtifactSha256: sha,
      environment: {
        backendBuildHash: "a".repeat(40),
        backendDeploymentId: "deploy-test-blue",
        backendReleaseSha: "b".repeat(40),
        backendSlot: "blue",
        databaseFingerprint: sha,
        environmentId: "test-blue",
        locale: "ro-RO",
        marketCode: "ro",
        salesChannelId: "sc_ro",
      },
      kind: "ro-demo-post-commerce-envelope",
      observedCommerceSnapshotSha256: sha,
      payload,
      payloadSha256: postCommerceSha256(stablePostCommerceJson(payload)),
      postCommerceSharedInventoryFingerprint: { count: 1, sha256: sha },
      postCommerceSkBaseline: { count: 1, errors: [], sha256: sha },
      preCommerceSharedInventoryFingerprint: { count: 1, sha256: sha },
      preCommerceSkBaseline: { count: 1, errors: [], sha256: sha },
      priceAuthoritySha256: sha,
      rawLiveInventorySha256: sha,
      schemaVersion: 1,
      sourceInventoryEnvelopeSha256: sha,
    }
    const text = JSON.stringify(wrapper)
    const wrapperSha256 = createHash("sha256").update(text).digest("hex")
    const parsed = parseBoundPostCommerceEnvelope(text, wrapperSha256, {
      expectedCounts: {
        brandsExcluded: 0,
        brandsTotal: 0,
        categoriesExcluded: 0,
        categoriesTotal: 1,
        productsExcluded: 1,
        productsPublished: 1,
        productsTotal: 2,
      },
      now: new Date("2026-08-20T12:00:00.000Z"),
    })
    expect(parsed.sha256).toBe(wrapperSha256)
    expect(parsed.envelope.commercePlanHash).toBe(sha)
  })

  it("rejects unidentified records and ledgers unmatched official sources", () => {
    expect(() =>
      parseDemoOfficialJsonl(
        JSON.stringify({
          kind: "product",
          product: { source: fallbackSource },
        })
      )
    ).toThrow("must contain an SKU or EAN identity")

    const value = input()
    const bundle = buildRomanianDemoLocalization({
      ...value,
      officialProducts: [
        ...value.officialProducts,
        {
          ean: "NOT-IN-MEDUSA-EAN",
          matchingStatus: "exact-bijective",
          medusaProductId: "prod_not_in_medusa",
          sku: "NOT-IN-MEDUSA",
          source: fallbackSource,
        },
      ],
    })
    expect(bundle.coverage).toMatchObject({
      unmatchedInventoryProducts: 1,
      unmatchedOfficialProducts: 1,
    })
    expect(bundle.exclusions.officialProducts).toHaveLength(1)
    expect(bundle.manifest.products).toHaveLength(1)
    expect(bundle.manifest.excludedProducts[0]?.key).toEqual({
      kind: "medusa_id",
      value: "prod_1",
    })
  })

  it("uses the frozen Medusa binding and exact EAN instead of foreign shop SKU", () => {
    const value = input()
    const product = value.inventory.products[0]
    if (!product) {
      throw new Error("fixture product missing")
    }
    const bundle = buildRomanianDemoLocalization({
      ...value,
      inventory: {
        ...value.inventory,
        products: [
          {
            ...product,
            variants: [
              { ean: "EAN-A", sku: "SKU-A" },
              { ean: "EAN-B", sku: "SKU-B" },
            ],
          },
        ],
      },
      officialProducts: [
        {
          ean: "EAN-B",
          matchingStatus: "exact-bijective",
          medusaProductId: "prod_1",
          sku: "SKU-A",
          source: fallbackSource,
          title: "Produs românesc",
          description: "Descriere oficială în limba română.",
        },
      ],
    })
    expect(bundle.manifest.products[0]?.key).toEqual({
      kind: "ean",
      value: "EAN-B",
    })
    expect(bundle.manifest.products[0]?.variants).toEqual([
      {
        key: { kind: "sku", value: "SKU-A" },
        roAvailability: "unavailable",
      },
      {
        key: { kind: "sku", value: "SKU-B" },
        roAvailability: "unavailable",
      },
    ])
  })

  it("rejects a frozen product binding whose EAN identifies no variant", () => {
    const value = input()
    expect(() =>
      buildRomanianDemoLocalization({
        ...value,
        officialProducts: [
          {
            ean: "EAN-NOT-IN-INVENTORY",
            matchingStatus: "exact-bijective",
            medusaProductId: "prod_1",
            sku: "FOREIGN-SHOP-SKU",
            source: fallbackSource,
          },
        ],
      })
    ).toThrow("EAN does not identify exactly one variant")
  })

  it("falls back to Medusa product identity without normalizing an unsafe EAN", () => {
    const value = input()
    const product = required(value.inventory.products[0], "fixture product")
    const bundle = buildRomanianDemoLocalization({
      ...value,
      inventory: {
        ...value.inventory,
        products: [
          {
            ...product,
            variants: [{ ean: "8594196 390165", sku: "SHOPITEM-123" }],
          },
        ],
      },
      officialProducts: [
        {
          description: "Descriere oficială în limba română.",
          ean: "8594196 390165",
          matchingStatus: "exact-bijective",
          medusaProductId: "prod_1",
          sku: "053904",
          source: fallbackSource,
          title: "Produs românesc",
        },
      ],
    })
    expect(bundle.manifest.products[0]?.key).toEqual({
      kind: "medusa_id",
      value: "prod_1",
    })
    expect(bundle.manifest.products[0]?.variants[0]?.key).toEqual({
      kind: "sku",
      value: "SHOPITEM-123",
    })
  })

  it("validates nested official descriptions, every present hash, and identity whitespace", () => {
    expect(() =>
      parseDemoOfficialJsonl(
        JSON.stringify({
          kind: "product",
          product: {
            descriptions: { short: { text: 123 } },
            sku: "4868",
            source: fallbackSource,
          },
        })
      )
    ).toThrow("descriptions.short.text must be a string")
    expect(() =>
      parseDemoOfficialJsonl(
        JSON.stringify({
          kind: "product",
          product: {
            sku: "4868",
            source: {
              ...fallbackSource,
              contentSha256: 123,
              htmlSha256: sha,
            },
          },
        })
      )
    ).toThrow("valid lowercase source SHA-256")
    expect(() =>
      parseDemoOfficialJsonl(
        JSON.stringify({
          kind: "product",
          product: { sku: " 4868 ", source: fallbackSource },
        })
      )
    ).toThrow("must not contain outer whitespace")
    expect(() =>
      parseDemoOfficialJsonl(
        JSON.stringify({
          kind: "product",
          product: {
            sku: "4868",
            source: { ...fallbackSource, evidenceKind: "merged-record" },
          },
        })
      )
    ).toThrow("requires an explicit matchingStatus")
  })

  it("excludes identity-only official matches instead of exposing SK-derived copy", () => {
    const value = input()
    const bundle = buildRomanianDemoLocalization({
      ...value,
      officialProducts: [
        ...value.officialProducts,
        {
          ean: "8586021132118",
          matchingStatus: "exact-bijective",
          medusaProductId: "prod_1",
          sku: "4868",
          source: fallbackSource,
        },
      ],
    })
    expect(bundle.coverage).toMatchObject({
      matchedOfficialProducts: 1,
      unmatchedInventoryProducts: 1,
      unmatchedOfficialProducts: 1,
    })
    expect(bundle.manifest.products).toHaveLength(1)
    expect(bundle.manifest.excludedProducts).toContainEqual(
      expect.objectContaining({
        key: { kind: "medusa_id", value: "prod_1" },
      })
    )
    expect(JSON.stringify(bundle.manifest.products)).not.toContain("cagy")
  })

  it("ledgers duplicate official EAN groups instead of fuzzy matching", () => {
    const value = input()
    const bundle = buildRomanianDemoLocalization({
      ...value,
      officialProducts: [
        ...value.officialProducts,
        {
          ean: "8586021132118",
          matchingStatus: "excluded",
          source: fallbackSource,
        },
        {
          ean: "8586021132118",
          matchingStatus: "excluded",
          source: { ...fallbackSource, url: "https://www.herbatica.ro/alt/" },
        },
      ],
    })
    expect(bundle.coverage).toMatchObject({
      matchedOfficialProducts: 1,
      unmatchedInventoryProducts: 1,
      unmatchedOfficialProducts: 2,
    })
    expect(bundle.exclusions.officialProducts).toHaveLength(2)
    expect(bundle.manifest.products).toHaveLength(1)
    expect(bundle.manifest.excludedProducts).toHaveLength(1)
  })

  it("uses a frozen official record only for its bound Medusa product", () => {
    const value = input()
    const product = value.inventory.products[0]
    if (!product) {
      throw new Error("fixture product missing")
    }
    const bundle = buildRomanianDemoLocalization({
      ...value,
      inventory: {
        ...value.inventory,
        products: [product, { ...product, externalId: "prod_2", id: "prod_2" }],
      },
      officialProducts: [
        {
          description: "Descriere oficială în limba română.",
          ean: "8586021132118",
          matchingStatus: "exact-bijective",
          medusaProductId: "prod_1",
          sku: "4868",
          source: fallbackSource,
          title: "Produs românesc",
        },
      ],
    })
    expect(bundle.manifest.products).toHaveLength(1)
    expect(bundle.manifest.excludedProducts).toContainEqual(
      expect.objectContaining({
        key: { kind: "medusa_id", value: "prod_2" },
      })
    )
  })

  it("normalizes only outer category HTML whitespace and audits generated fields", () => {
    const value = input()
    const bundle = buildRomanianDemoLocalization({
      ...value,
      officialCategories: [
        {
          copySource: "official-ro",
          key: { kind: "medusa_id", value: "pcat_1" },
          publicSlug: "categorie-demo",
          source: fallbackSource,
          translation: {
            bottom_description_html: "\n  <p>Jos</p>\n",
            description: "Descriere categorie demo.",
            meta_description: "Categorie demo",
            meta_title: "Categorie demo",
            name: "Categorie demo",
            top_description_html:
              '\n  <p><a href="/sk-kategoria">Sus</a></p>\n',
          },
        },
      ],
    })
    expect(bundle.manifest.categories[0]?.translation).toMatchObject({
      bottom_description_html: "<p>Jos</p>",
      top_description_html: "<p><a>Sus</a></p>",
    })
    expect(
      bundle.provenance.find(
        ({ fieldPath }) => fieldPath === "translation.top_description_html"
      )
    ).toMatchObject({ generated: true, source: "official-ro" })
    expect(
      bundle.warnings.some(({ code }) => code === "category-links-stripped")
    ).toBe(true)
  })

  it("canonicalizes unordered snapshot arrays into the same complete bundle", () => {
    const value = input()
    const firstProduct = value.inventory.products[0]
    const firstCategory = value.inventory.categories[0]
    if (!(firstProduct && firstCategory)) {
      throw new Error("fixture inventory missing")
    }
    const secondProduct = {
      ...firstProduct,
      externalId: "prod_2",
      id: "prod_2",
      variants: [
        { ean: "8586021132120", sku: "4870" },
        { ean: "8586021132119", sku: "4869" },
      ],
    }
    const secondCategory = {
      ...firstCategory,
      directProductCount: 0,
      key: { kind: "medusa_id" as const, value: "pcat_2" },
      name: "Prírodná kozmetika",
    }
    const secondOfficialCategory = {
      ...completeCategory,
      key: { kind: "medusa_id" as const, value: "pcat_2" },
      publicSlug: "cosmetica-naturala",
      source: {
        ...fallbackSource,
        url: "https://www.herbatica.ro/cosmetica-naturala/",
      },
      translation: {
        ...completeCategory.translation,
        description: "Selecție de cosmetică naturală.",
        meta_description: "Cosmetică naturală Herbatica",
        meta_title: "Cosmetică naturală",
        name: "Cosmetică naturală",
      },
    }
    const forward = buildRomanianDemoLocalization({
      ...value,
      inventory: {
        brands: [],
        categories: [firstCategory, secondCategory],
        products: [
          firstProduct,
          secondProduct,
          required(value.inventory.products[1], "anchor product"),
        ],
      },
      officialCategories: [completeCategory, secondOfficialCategory],
      readiness: {
        ...value.readiness,
        paymentProviderIds: ["pp_b", "pp_a"],
        shippingOptionIds: ["so_b", "so_a"],
      },
    })
    const reverse = buildRomanianDemoLocalization({
      ...value,
      inventory: {
        brands: [],
        categories: [secondCategory, firstCategory],
        products: [
          { ...secondProduct, variants: [...secondProduct.variants].reverse() },
          firstProduct,
          required(value.inventory.products[1], "anchor product"),
        ],
      },
      officialCategories: [secondOfficialCategory, completeCategory],
      readiness: {
        ...value.readiness,
        paymentProviderIds: ["pp_a", "pp_b"],
        shippingOptionIds: ["so_a", "so_b"],
      },
    })
    expect(forward).toEqual(reverse)
  })

  it("hashes raw RO descriptions exactly like the importer omission plan", () => {
    const value = input()
    const bundle = buildRomanianDemoLocalization(value)
    const description = value.officialProducts[0]?.description
    if (!description) {
      throw new Error("fixture description missing")
    }
    expect(bundle.demoOmissionLedger.entries[0]).toMatchObject({
      omittedFields: ["usage", "composition", "warning", "other"],
      roDescriptionSha256: createHash("sha256")
        .update(description)
        .digest("hex"),
    })
  })

  it("rejects unsafe runtime inventory identities and malformed authority", () => {
    const value = input()
    const category = required(value.inventory.categories[0], "category")
    expect(() =>
      buildRomanianDemoLocalization({
        ...value,
        inventory: {
          ...value.inventory,
          categories: [
            {
              ...category,
              key: { kind: "source_guid", value: "legacy" },
            } as unknown as typeof category,
          ],
        },
      })
    ).toThrow("kind must be medusa_id")
    const product = required(value.inventory.products[0], "product")
    expect(() =>
      buildRomanianDemoLocalization({
        ...value,
        inventory: {
          ...value.inventory,
          products: [{ ...product, productContentId: " " }],
        },
      })
    ).toThrow("productContentId must be a nonblank string")
    expect(() =>
      buildRomanianDemoLocalization({
        ...value,
        inventory: {
          ...value.inventory,
          products: [
            {
              ...product,
              roExclusionDecision: {
                ...required(product.roExclusionDecision, "decision"),
                approvedAt: "yesterday",
              },
            },
          ],
        },
      })
    ).toThrow("approvedAt must be an ISO-8601 UTC timestamp")
    expect(() =>
      buildRomanianDemoLocalization({
        ...value,
        officialCategories: [
          {
            ...completeCategory,
            translation: {
              ...completeCategory.translation,
              name: "Prírodná kozmetika",
            },
          },
        ],
      })
    ).toThrow("contains a Slovak copy canary")
  })

  it("adapts only exact merged candidates and binds them to Medusa IDs", () => {
    const merged = (decision: "exclude-unreviewed" | "publish-candidate") =>
      JSON.stringify({
        approval: "demo-generated-unreviewed",
        canonical_slug: "produs-romanesc",
        canonical_url: "https://www.herbatica.ro/produs-romanesc/",
        demo_scope: { decision, reason: "evidence" },
        description_html: "<p>Descriere oficială.</p>",
        ean: "1234567890123",
        exclusionReason:
          decision === "exclude-unreviewed" ? "No exact match" : null,
        h1: "Produs românesc",
        medusa_match:
          decision === "publish-candidate"
            ? {
                medusa: { product_id: "prod_exact" },
                method: "exact_ean",
                official_identity: { ean: "1234567890123", sku: "SKU" },
                status: "matched",
              }
            : { method: null, official_identity: {}, status: "unmatched" },
        medusaProductId: decision === "publish-candidate" ? "prod_exact" : null,
        matchingStatus:
          decision === "publish-candidate" ? "matched" : "excluded",
        schema_version: 1,
        sku: "SKU",
        source: { content_sha256: null, retrieved_at: null },
        source_url: "https://www.herbatica.ro/produs-romanesc/",
      })
    const parsed = parseMergedDemoProductJsonl(
      [merged("publish-candidate"), merged("exclude-unreviewed")].join("\n"),
      "2026-08-20T12:00:00.000Z",
      { excluded: 1, published: 1, total: 2 }
    )
    expect(parsed).toMatchObject([
      {
        matchingStatus: "exact-bijective",
        medusaProductId: "prod_exact",
        source: { evidenceKind: "merged-record" },
      },
      { matchingStatus: "excluded" },
    ])
    expect(parsed[0]?.source.contentSha256).toMatch(SHA_256)
    expect(() =>
      parseMergedDemoProductJsonl(
        merged("publish-candidate"),
        "2026-08-20T12:00:00.000Z"
      )
    ).toThrow("partition must be 2099/2002/97")
  })

  it("rejects missing brand exclusion authority before mapping", () => {
    expect(() =>
      parseDemoCatalogEntitiesJson("{}", fallbackSource, {
        approvedAt: "2026-08-20T12:00:00.000Z",
        approvedBy: "demo-catalog-owner",
      } as unknown as {
        approvedAt: string
        approvedBy: string
        referencePrefix: string
      })
    ).toThrow("referencePrefix must be a nonblank string")
  })

  it("partitions decision-backed ghost categories without publishing them", () => {
    const value = input()
    const category = required(value.inventory.categories[0], "category")
    const publishedCategory = {
      ...category,
      key: { kind: "medusa_id" as const, value: "pcat_published" },
    }
    const publishedCopy = {
      ...completeCategory,
      key: publishedCategory.key,
      publicSlug: "categorie-publicata",
      source: {
        ...fallbackSource,
        url: "https://www.herbatica.ro/categorie-publicata/",
      },
      translation: {
        ...completeCategory.translation,
        name: "Categorie publicată",
      },
    }
    const bundle = buildRomanianDemoLocalization({
      ...value,
      inventory: {
        ...value.inventory,
        categories: [
          {
            ...category,
            roExclusionDecision: {
              approvedAt: "2026-08-20T12:00:00.000Z",
              approvedBy: "demo-catalog-owner",
              reason: "RO ghost duplicate",
              reference: "RO-CATEGORY-GHOST-1",
            },
          },
          publishedCategory,
        ],
      },
      officialCategories: [completeCategory, publishedCopy],
    })
    expect(bundle.manifest.categories).toHaveLength(1)
    expect(bundle.manifest.excludedCategories).toHaveLength(1)
    expect(bundle.manifest.excludedCategories[0]?.key).toEqual(category.key)
  })

  it("sorts two ghost category exclusions independently of input order", () => {
    const value = input()
    const base = required(value.inventory.categories[0], "category")
    const decision = (reference: string) => ({
      approvedAt: "2026-08-20T12:00:00.000Z",
      approvedBy: "demo-catalog-owner",
      reason: "RO ghost duplicate",
      reference,
    })
    const categories = [
      {
        ...base,
        key: { kind: "medusa_id" as const, value: "pcat_ghost_b" },
        roExclusionDecision: decision("GHOST-B"),
      },
      {
        ...base,
        key: { kind: "medusa_id" as const, value: "pcat_published" },
      },
      {
        ...base,
        key: { kind: "medusa_id" as const, value: "pcat_ghost_a" },
        roExclusionDecision: decision("GHOST-A"),
      },
    ]
    const copies = categories.map((category) => ({
      ...completeCategory,
      key: category.key,
      publicSlug: category.key.value.replace("pcat_", ""),
      source: {
        ...fallbackSource,
        url: `https://www.herbatica.ro/${category.key.value}/`,
      },
    }))
    const forward = buildRomanianDemoLocalization({
      ...value,
      inventory: { ...value.inventory, categories },
      officialCategories: copies,
    })
    const reverse = buildRomanianDemoLocalization({
      ...value,
      inventory: { ...value.inventory, categories: [...categories].reverse() },
      officialCategories: [...copies].reverse(),
    })
    expect(forward).toEqual(reverse)
    expect(
      forward.manifest.excludedCategories.map(({ key }) => key.value)
    ).toEqual(["pcat_ghost_a", "pcat_ghost_b"])
  })

  it("allows identityless variants only on decision-backed exclusions", () => {
    const value = input()
    const excluded = required(value.inventory.products[0], "excluded product")
    const anchor = required(value.inventory.products[1], "anchor product")
    const excludedBundle = buildRomanianDemoLocalization({
      ...value,
      inventory: {
        ...value.inventory,
        products: [
          { ...excluded, variants: [{ ean: null, sku: null }] },
          anchor,
        ],
      },
    })
    expect(excludedBundle.manifest.excludedProducts).toContainEqual(
      expect.objectContaining({ key: { kind: "medusa_id", value: "prod_1" } })
    )

    expect(() =>
      buildRomanianDemoLocalization({
        ...value,
        inventory: {
          ...value.inventory,
          products: [
            {
              ...excluded,
              variants: [...excluded.variants, { ean: null, sku: null }],
            },
          ],
        },
        officialProducts: [
          {
            description: "Descriere oficială.",
            ean: "8586021132118",
            matchingStatus: "exact-bijective",
            medusaProductId: "prod_1",
            sku: "4868",
            source: fallbackSource,
            title: "Produs oficial",
          },
        ],
      })
    ).toThrow("has neither SKU nor EAN")
  })

  it("does not copy one official product price onto additional variants", () => {
    const value = input()
    const product = required(value.inventory.products[0], "product")
    const approval = required(product.variants[0]?.ronPrice, "RON price")
    const bundle = buildRomanianDemoLocalization({
      ...value,
      inventory: {
        ...value.inventory,
        products: [
          {
            ...product,
            variants: [
              ...product.variants,
              {
                ean: "8586021132999",
                ronPrice: approval,
                sku: "4868-EXTRA",
              },
            ],
          },
        ],
      },
      officialProducts: [
        {
          description: "Descriere oficială.",
          ean: "8586021132118",
          matchingStatus: "exact-bijective",
          medusaProductId: "prod_1",
          sku: "4868",
          source: fallbackSource,
          title: "Produs oficial",
        },
      ],
    })
    expect(bundle.manifest.products[0]?.variants).toEqual([
      expect.objectContaining({
        key: { kind: "sku", value: "4868" },
        roAvailability: "sellable",
      }),
      {
        key: { kind: "sku", value: "4868-EXTRA" },
        roAvailability: "unavailable",
      },
    ])
  })

  it("publishes only official brands and partitions BLUE-only brands", () => {
    const value = input()
    const bundle = buildRomanianDemoLocalization({
      ...value,
      inventory: {
        ...value.inventory,
        brands: [
          {
            copySource: "official-ro",
            id: "brand_official",
            publicSlug: "marca-oficiala",
            source: fallbackSource,
            title: "Marca oficială",
          },
          {
            copySource: "agent-generated-unreviewed",
            id: "brand_blue_only",
            publicSlug: "marca-blue",
            roExclusionDecision: {
              approvedAt: "2026-08-20T12:00:00.000Z",
              approvedBy: "demo-catalog-owner",
              reason: "No official RO brand identity",
              reference: "RO-BRAND-EXCLUSION:brand_blue_only",
            },
            source: fallbackSource,
            title: "Marca BLUE",
          },
        ],
      },
    })
    expect(bundle.manifest.brandInventory).toEqual({ count: 2 })
    expect(bundle.manifest.brands).toHaveLength(1)
    expect(bundle.manifest.excludedBrands).toHaveLength(1)
    expect(bundle.manifest.excludedBrands[0]?.key).toEqual({
      kind: "medusa_id",
      value: "brand_blue_only",
    })
  })

  it("atomically publishes one artifact directory and never touches an existing set", async () => {
    const value = input()
    const bundle = buildRomanianDemoLocalization(value)
    const directory = await mkdtemp(join(tmpdir(), "ro-demo-artifacts-"))
    const outputDirectory = join(directory, "final")
    const markerPath = join(outputDirectory, "existing.txt")
    try {
      await mkdir(outputDirectory)
      await writeFile(markerPath, "existing", "utf8")
      await expect(
        writeDemoLocalizationArtifacts(outputDirectory, bundle)
      ).rejects.toThrow()
      await expect(
        access(join(outputDirectory, "bundle.json"))
      ).rejects.toThrow()
      await expect(
        access(join(outputDirectory, "manifest.json"))
      ).rejects.toThrow()
      await expect(
        access(join(outputDirectory, "omission-ledger.json"))
      ).rejects.toThrow()
      await expect(readFile(markerPath, "utf8")).resolves.toBe("existing")
    } finally {
      await rm(directory, { force: true, recursive: true })
    }
  })
})

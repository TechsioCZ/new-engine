import {
  link,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  type RoDemoApplyReceipt,
  type RoDemoRestoreArtifact,
  serializeRoDemoArtifact,
  sha256RoDemoArtifactBytes,
} from "../../../../src/scripts/ro-demo-commerce/artifacts"
import {
  hashRoDemoCommercePlan,
  hashSkCommerceBaseline,
} from "../../../../src/scripts/ro-demo-commerce/planner"
import {
  type PrecommerceExpectedCounts,
  type PrecommerceExpectedSourceRoots,
  parsePrecommercePriceAuthority,
  serializePrecommercePriceAuthority,
  sha256PrecommerceInventoryIdentity,
} from "../../../../src/scripts/ro-demo-commerce/precommerce-price-authority"
import type {
  RoDemoCommercePlan,
  RoDemoSnapshot,
} from "../../../../src/scripts/ro-demo-commerce/types"
import {
  assertObservedPostCommerceDeployment,
  assertPostCommerceArtifactPaths,
  buildPostCommerceEnvelope,
  type PostCommerceExpectedCounts,
  type PostCommerceObservation,
  type PostCommercePriceAuthority,
  parsePostCommerceEnvelope,
  parsePostCommerceEnvelopeCliOptions,
  postCommerceSha256,
  stablePostCommerceJson,
  writePostCommerceEnvelopeNoClobber,
} from "../../../../src/scripts/ro-demo-localization/postcommerce-envelope"
import type { DemoLocalizationFileInput } from "../../../../src/scripts/ro-demo-localization/types"

const capturedAt = "2026-08-20T20:00:00.000Z"
const evidence = {
  contentSha256: "a".repeat(64),
  retrievedAt: "2026-08-20T18:00:00.000Z",
  url: "https://www.herbatica.ro/export/catalog.jsonl",
} as const
const expectedCounts: PostCommerceExpectedCounts = {
  brandsExcluded: 0,
  brandsTotal: 1,
  categoriesExcluded: 0,
  categoriesTotal: 1,
  productsExcluded: 0,
  productsPublished: 1,
  productsTotal: 1,
}

const price = (amount: number, currencyCode: string) => ({
  amount,
  currencyCode,
  id: `price_${currencyCode}`,
  maxQuantity: null,
  minQuantity: null,
  priceListId: null,
  rules: [],
})

const sourceInventory = (): DemoLocalizationFileInput => ({
  brandExclusionAuthority: {
    approvedAt: "2026-08-20T18:00:00.000Z",
    approvedBy: "demo-owner",
    referencePrefix: "RO-DEMO-BRAND",
  },
  fallbackSource: evidence,
  generatedAt: "2026-08-20T19:00:00.000Z",
  inventory: {
    brands: [
      {
        copySource: "official-ro",
        id: "brand_1",
        publicSlug: "marca",
        source: evidence,
        title: "Marcă",
      },
    ],
    categories: [
      {
        description: "Slovenský popis",
        directChildCount: 0,
        directProductCount: 1,
        key: { kind: "medusa_id", value: "pcat_1" },
        name: "Kategória",
        parentKey: null,
      },
    ],
    products: [
      {
        description: "Slovenský popis",
        externalId: null,
        id: "prod_1",
        productContent: {
          composition: "",
          other: "",
          usage: "",
          warning: "",
        },
        productContentId: "pcont_1",
        title: "Befungin",
        variants: [
          { ean: "8586021132118", sku: "4868" },
          { ean: "8586021132119", sku: "4868-B" },
        ],
      },
    ],
  },
  mergedEvidenceCapturedAt: "2026-08-20T18:00:00.000Z",
  readiness: {
    currencyCode: "ron",
    paymentProviderIds: ["pending"],
    regionId: "pending",
    shippingOptionIds: ["pending"],
    taxRegionIds: ["pending"],
  },
  salesChannelId: "sc_ro",
})

const commerceSnapshot = (): RoDemoSnapshot => ({
  fulfillmentProviderIds: ["manual_manual"],
  fulfillmentSetIds: ["fuset_ro"],
  paymentProviders: [{ enabled: true, id: "pp_system_default" }],
  pricePreferences: [
    {
      attribute: "currency_code",
      id: "pricepref_ron",
      isTaxInclusive: true,
      value: "ron",
    },
    {
      attribute: "region_id",
      id: "pricepref_reg_ro",
      isTaxInclusive: true,
      value: "reg_ro",
    },
  ],
  regions: [
    {
      countryCodes: ["ro"],
      currencyCode: "ron",
      id: "reg_ro",
      isTaxInclusive: true,
      metadata: {
        demo: true,
        demo_source: "herbatica-ro-demo-commerce-v1",
        market_code: "ro",
        payment_display_label: "Plată demo (fără debitare)",
        ro_demo_checkout: { marker: "demo" },
        sales_channel_id: "sc_ro",
      },
      name: "Herbatica Romania Demo",
      paymentProviderIds: ["pp_system_default"],
    },
  ],
  salesChannelIds: ["sc_ro"],
  serviceZones: [
    {
      countryCodes: ["ro"],
      fulfillmentSetId: "fuset_ro",
      id: "serzo_ro",
      name: "Herbatica Romania Demo",
    },
  ],
  shippingOptions: [
    {
      code: "ro-demo-packeta-pickup",
      id: "so_pickup",
      source: "herbatica-ro-demo-commerce-v1",
    },
    {
      code: "ro-demo-packeta-address",
      id: "so_address",
      source: "herbatica-ro-demo-commerce-v1",
    },
    {
      code: "ro-demo-cargus",
      id: "so_cargus",
      source: "herbatica-ro-demo-commerce-v1",
    },
  ],
  shippingProfileIds: ["sp_default"],
  stores: [
    {
      id: "store_default",
      supportedCurrencies: [
        { currencyCode: "eur", isDefault: true },
        { currencyCode: "ron", isDefault: false },
      ],
    },
  ],
  taxRates: [
    {
      id: "txrate_21",
      isDefault: true,
      metadata: { demo_source: "herbatica-ro-demo-commerce-v1" },
      productIds: [],
      rate: 21,
      taxRegionId: "txreg_ro",
    },
    {
      id: "txrate_11",
      isDefault: false,
      metadata: { demo_source: "herbatica-ro-demo-commerce-v1" },
      productIds: [],
      rate: 11,
      taxRegionId: "txreg_ro",
    },
  ],
  taxRegions: [{ countryCode: "ro", id: "txreg_ro" }],
  variants: [
    {
      ean: "8586021132118",
      id: "variant_1",
      metadata: {},
      prices: [price(24.9, "eur"), price(120, "ron")],
      productId: "prod_1",
      productMetadata: {},
      sku: "4868",
    },
    {
      ean: "8586021132119",
      id: "variant_2",
      metadata: {},
      prices: [price(25.9, "eur")],
      productId: "prod_1",
      productMetadata: {},
      sku: "4868-B",
    },
  ],
})

const shipping = (
  code: string,
  id: string,
  amount: number,
  freeFrom?: number
) => ({
  code,
  countryCodes: ["ro"],
  data: {
    market_code: "ro",
    ro_demo_checkout: { marker: "demo" },
    source: "herbatica-ro-demo-commerce-v1",
  },
  fulfillmentSetId: "fuset_ro",
  id,
  prices: [
    { amount, currencyCode: "ron", rules: [] },
    ...(freeFrom
      ? [
          {
            amount: 0,
            currencyCode: "ron",
            rules: [
              { attribute: "item_total", operator: "gte", value: freeFrom },
            ],
          },
        ]
      : []),
  ],
  providerId: "manual_manual",
  serviceZoneId: "serzo_ro",
  shippingProfileId: "sp_default",
})

const observation = (): PostCommerceObservation => ({
  commerce: commerceSnapshot(),
  salesChannels: [
    {
      id: "sc_ro",
      metadata: { currency_code: "ron", market_code: "ro" },
    },
  ],
  shippingOptions: [
    shipping("ro-demo-packeta-pickup", "so_pickup", 14.99, 249),
    shipping("ro-demo-packeta-address", "so_address", 32.69),
    shipping("ro-demo-cargus", "so_cargus", 26.5),
  ],
})

const authorityCounts: PrecommerceExpectedCounts = {
  excludedProducts: 0,
  excludedVariants: 0,
  inventoryProducts: 1,
  inventoryVariants: 2,
  publishedProducts: 1,
  publishedVariants: 2,
  sellableVariants: 1,
  unavailableVariants: 1,
}
const authorityRoots: PrecommerceExpectedSourceRoots = {
  inventoryEnvelopeSha256: "a".repeat(64),
  mergedProductsSha256: "c".repeat(64),
  rawLiveInventorySha256: "d".repeat(64),
}
const priceApproval = {
  approvedAt: "2026-08-20T18:00:00.000Z",
  approvedBy: "user-demo-authorization",
  reference: `demo-generated-unreviewed:official-ron:1:${"f".repeat(64)}`,
} as const

const authority = (): PostCommercePriceAuthority => ({
  amountUnit: "major",
  authorization: "demo-generated-unreviewed",
  counts: authorityCounts,
  currencyCode: "ron",
  exclusions: [],
  inventoryIdentitySha256: sha256PrecommerceInventoryIdentity([
    {
      productId: "prod_1",
      variants: [
        { ean: "8586021132118", liveSku: "4868", variantId: "variant_1" },
        {
          ean: "8586021132119",
          liveSku: "4868-B",
          variantId: "variant_2",
        },
      ],
    },
  ]),
  kind: "ro-demo-precommerce-price-authority",
  locale: "ro-RO",
  market: "ro",
  products: [
    {
      productId: "prod_1",
      variants: [
        {
          ean: "8586021132118",
          evidence: {
            mergedLine: 1,
            mergedRecordSha256: "f".repeat(64),
            officialContentSha256: null,
            retrievedAt: "2026-08-20T18:00:00.000Z",
            sourceUrl: "https://www.herbatica.ro/befungin/",
          },
          liveSku: "4868",
          officialSku: "4868-RO",
          price: {
            amount: 120,
            approval: priceApproval,
            currencyCode: "ron",
          },
          roAvailability: "sellable",
          variantId: "variant_1",
        },
        {
          ean: "8586021132119",
          liveSku: "4868-B",
          officialSku: null,
          roAvailability: "unavailable",
          variantId: "variant_2",
        },
      ],
    },
  ],
  schemaVersion: 1,
  sourceRoots: authorityRoots,
})

const plan = (snapshot = commerceSnapshot()): RoDemoCommercePlan => ({
  binding: {
    codProviderId: "pp_cash_on_delivery_default",
    fulfillmentProviderId: "manual_manual",
    fulfillmentSetId: "fuset_ro",
    gopayProviderIds: [],
    regionName: "Herbatica Romania Demo",
    salesChannelId: "sc_ro",
    shippingProfileId: "sp_default",
    systemPaymentProviderId: "pp_system_default",
  },
  codPolicy: {
    configuredFee: 9.45,
    configuredMinimumOrder: 40,
    enabled: false,
    reason: "disabled",
  },
  detachRomaniaFromRegion: null,
  inventoryIdentitySha256: null,
  market: "ro",
  payment: {
    demoCheckout: { marker: "demo" } as never,
    displayLabel: "Plată demo (fără debitare)",
    fallback: true,
    providerId: "pp_system_default",
    providerIds: ["pp_system_default"],
  },
  priceAuthoritySha256: "b".repeat(64),
  priceAuthorityKind: "ro-demo-precommerce-price-authority",
  pricePreferences: {
    currency: { action: "unchanged", existingId: "pricepref_ron" },
    region: { action: "unchanged", existingId: "pricepref_reg_ro" },
  },
  region: {
    action: "unchanged",
    existingId: "reg_ro",
    metadata: snapshot.regions[0]?.metadata ?? {},
    name: "Herbatica Romania Demo",
    paymentProviderIds: ["pp_system_default"],
  },
  salesChannelId: "sc_ro",
  skBaselineHash: "",
  serviceZone: {
    action: "unchanged",
    existingId: "serzo_ro",
    name: "Herbatica Romania Demo",
  },
  shipping: [
    {
      action: "update",
      amount: 14.99,
      code: "ro-demo-packeta-pickup",
      existingId: "so_pickup",
      freeFrom: 249,
      label: "Packeta – punct de ridicare",
    },
    {
      action: "update",
      amount: 32.69,
      code: "ro-demo-packeta-address",
      existingId: "so_address",
      label: "Packeta – livrare la adresă",
    },
    {
      action: "update",
      amount: 26.5,
      code: "ro-demo-cargus",
      existingId: "so_cargus",
      label: "Cargus",
    },
  ],
  storeCurrency: {
    action: "unchanged",
    existingCurrencies: [
      { currencyCode: "eur", isDefault: true },
      { currencyCode: "ron", isDefault: false },
    ],
    storeId: "store_default",
  },
  taxAssignments: [{ productId: "prod_1", rate: 21, source: "demo-default" }],
  taxRates: {
    elevenAction: "unchanged",
    existingOwnedElevenId: "txrate_11",
    existingOwnedTwentyOneId: "txrate_21",
    twentyOneAction: "unchanged",
  },
  taxRegion: { action: "unchanged", existingId: "txreg_ro" },
  variantPrices: [
    {
      action: "unchanged",
      amount: 120,
      currentRonPrice: price(120, "ron"),
      productId: "prod_1",
      variantId: "variant_1",
    },
  ],
  warnings: [],
})

const build = (
  overrides: Partial<Parameters<typeof buildPostCommerceEnvelope>[0]> = {}
) => {
  const observed = overrides.observation ?? observation()
  const draftPlan = overrides.commercePlan ?? plan(observed.commerce)
  const authorityBytes = serializePrecommercePriceAuthority(authority())
  const parsedAuthority = parsePrecommercePriceAuthority(
    authorityBytes,
    authorityCounts,
    authorityRoots
  )
  const priceAuthoritySha256 = postCommerceSha256(authorityBytes)
  const reviewedPlan = {
    ...draftPlan,
    priceAuthoritySha256,
    skBaselineHash:
      draftPlan.skBaselineHash || hashSkCommerceBaseline(observed.commerce),
  }
  const commercePlanHash = hashRoDemoCommercePlan(reviewedPlan)
  const commerceRestoreArtifact: RoDemoRestoreArtifact = {
    demo: true,
    kind: "ro-demo-commerce-restore",
    market: "ro",
    planHash: commercePlanHash,
    priceAuthorityKind: reviewedPlan.priceAuthorityKind,
    priceAuthoritySha256,
    schemaVersion: 1,
    snapshot: observed.commerce,
  }
  const commerceRestoreArtifactSha256 = sha256RoDemoArtifactBytes(
    serializeRoDemoArtifact(commerceRestoreArtifact)
  )
  const commercePostState: RoDemoApplyReceipt["postState"] = {
    paymentProviderIds: reviewedPlan.payment.providerIds,
    regionId: "reg_ro",
    salesChannelId: reviewedPlan.salesChannelId,
    serviceZoneId: "serzo_ro",
    shippingOptions: reviewedPlan.shipping.map(({ code }) => ({
      code,
      id: `so_${code.replace("ro-demo-packeta-", "").replace("ro-demo-", "")}`,
    })),
    taxRateIds: ["txrate_11", "txrate_21"],
    taxRegionIds: ["txreg_ro"],
    variantPrices: reviewedPlan.variantPrices.map(
      ({ amount, productId, variantId }) => ({ amount, productId, variantId })
    ),
  }
  const commerceApplyReceipt: RoDemoApplyReceipt = {
    demo: true,
    kind: "ro-demo-commerce-apply-receipt",
    market: "ro",
    planHash: commercePlanHash,
    postState: commercePostState,
    postStateSha256: sha256RoDemoArtifactBytes(
      serializeRoDemoArtifact(commercePostState)
    ),
    priceAuthorityKind: reviewedPlan.priceAuthorityKind,
    priceAuthoritySha256,
    restoreArtifactSha256: commerceRestoreArtifactSha256,
    schemaVersion: 1,
    skBaselineHashAfter: reviewedPlan.skBaselineHash,
    skBaselineHashBefore: reviewedPlan.skBaselineHash,
  }
  const commerceApplyReceiptSha256 = sha256RoDemoArtifactBytes(
    serializeRoDemoArtifact(commerceApplyReceipt)
  )
  return buildPostCommerceEnvelope({
    backendBuildHash: "build-123",
    backendDeploymentId: "dpl_123",
    backendReleaseSha: "1".repeat(40),
    backendSlot: "blue",
    capturedAt,
    commerceApplyReceipt,
    commerceApplyReceiptSha256,
    commercePlan: reviewedPlan,
    commercePlanFileSha256: commercePlanHash,
    commercePlanHash,
    commerceRestoreArtifact,
    commerceRestoreArtifactSha256,
    environmentId: "zane-herbatika-blue",
    expectedCounts,
    observation: observed,
    postCommerceSharedInventoryFingerprint: {
      count: 2,
      sha256: "9".repeat(64),
    },
    preCommerceSharedInventoryFingerprint: {
      count: 2,
      sha256: "9".repeat(64),
    },
    priceAuthority: parsedAuthority,
    priceAuthoritySha256,
    rawLiveInventorySha256: authorityRoots.rawLiveInventorySha256,
    sourceInventory: sourceInventory(),
    sourceInventoryEnvelopeSha256: "a".repeat(64),
    ...overrides,
    ...(overrides.commercePlanFileSha256
      ? {}
      : { commercePlanFileSha256: commercePlanHash }),
    ...(overrides.commercePlanHash ? {} : { commercePlanHash }),
  })
}

describe("post-commerce localization envelope", () => {
  it("binds reviewed artifacts to fresh IDs and exact live RON prices", () => {
    const envelope = build()
    expect(envelope.kind).toBe("ro-demo-post-commerce-envelope")
    expect(envelope.preCommerceSkBaseline).toEqual(
      envelope.postCommerceSkBaseline
    )
    expect(envelope.payload.readiness).toEqual({
      currencyCode: "ron",
      paymentProviderIds: ["pp_system_default"],
      regionId: "reg_ro",
      shippingOptionIds: ["so_address", "so_cargus", "so_pickup"],
      taxRegionIds: ["txreg_ro"],
    })
    expect(envelope.payload.inventory.products[0]?.variants).toEqual([
      {
        ean: "8586021132118",
        ronPrice: {
          amount: 120,
          approval: priceApproval,
        },
        sku: "4868",
      },
      { ean: "8586021132119", sku: "4868-B" },
    ])
    expect(envelope.payloadSha256).toBe(
      postCommerceSha256(stablePostCommerceJson(envelope.payload))
    )
  })

  it("rejects substituted commerce receipt or restore hashes", () => {
    expect(() => build({ commerceApplyReceiptSha256: "e".repeat(64) })).toThrow(
      "receipt/restore chain"
    )
    expect(() =>
      build({ commerceRestoreArtifactSha256: "e".repeat(64) })
    ).toThrow("receipt/restore chain")
  })

  it("parses only a fresh exact wrapper with an intact payload hash", () => {
    const envelope = build()
    expect(
      parsePostCommerceEnvelope(JSON.stringify(envelope), {
        expectedCounts,
        now: new Date("2026-08-20T20:05:00.000Z"),
      })
    ).toEqual(envelope)
    expect(() =>
      parsePostCommerceEnvelope(
        JSON.stringify({
          ...envelope,
          payload: { ...envelope.payload, salesChannelId: "sc_tampered" },
        }),
        {
          expectedCounts,
          now: new Date("2026-08-20T20:05:00.000Z"),
        }
      )
    ).toThrow("payloadSha256")
    expect(() =>
      parsePostCommerceEnvelope(JSON.stringify(envelope), {
        expectedCounts,
        now: new Date("2026-08-20T21:00:00.000Z"),
      })
    ).toThrow("stale")
  })

  it("fails closed on SK drift, RON drift, or product identity drift", () => {
    const observed = observation()
    const reviewedPlan = {
      ...plan(observed.commerce),
      priceAuthoritySha256: postCommerceSha256(
        serializePrecommercePriceAuthority(authority())
      ),
      skBaselineHash: "c".repeat(64),
    }
    expect(() =>
      build({
        commercePlan: reviewedPlan,
        commercePlanFileSha256: hashRoDemoCommercePlan(reviewedPlan),
        commercePlanHash: hashRoDemoCommercePlan(reviewedPlan),
      })
    ).toThrow("SK baseline does not match fresh state")

    const baseRonDrift = observation()
    const ronDrift: PostCommerceObservation = {
      ...baseRonDrift,
      commerce: {
        ...baseRonDrift.commerce,
        variants: baseRonDrift.commerce.variants.map((variant, index) =>
          index === 0
            ? { ...variant, prices: [price(24.9, "eur"), price(121, "ron")] }
            : variant
        ),
      },
    }
    expect(() => build({ observation: ronDrift })).toThrow(
      "fresh receipt variant price"
    )

    const baseIdentityDrift = observation()
    const identityDrift: PostCommerceObservation = {
      ...baseIdentityDrift,
      commerce: {
        ...baseIdentityDrift.commerce,
        variants: baseIdentityDrift.commerce.variants.map((variant, index) =>
          index === 0 ? { ...variant, ean: "different" } : variant
        ),
      },
    }
    expect(() => build({ observation: identityDrift })).toThrow(
      "inventory identity does not match price authority"
    )
  })

  it("has no apply mode and requires every reviewed hash", () => {
    const sha = "a".repeat(64)
    expect(
      parsePostCommerceEnvelopeCliOptions([
        "--commerce-apply-receipt",
        "apply-receipt.json",
        "--commerce-apply-receipt-sha256",
        sha,
        "--inventory",
        "inventory.json",
        "--inventory-sha256",
        sha,
        "--price-authority",
        "prices.json",
        "--price-authority-sha256",
        sha,
        "--commerce-plan",
        "plan.json",
        "--commerce-plan-file-sha256",
        sha,
        "--commerce-plan-hash",
        sha,
        "--commerce-restore-artifact",
        "restore-artifact.json",
        "--commerce-restore-artifact-sha256",
        sha,
        "--expected-backend-build-hash",
        "build-123",
        "--expected-backend-deployment-id",
        "dpl_123",
        "--expected-backend-release-sha",
        "1".repeat(40),
        "--expected-backend-slot",
        "blue",
        "--expected-environment-id",
        "zane-herbatika-blue",
        "--raw-live-inventory",
        "raw.json",
        "--raw-live-inventory-sha256",
        sha,
        "--pre-commerce-shared-inventory-fingerprint",
        "inventory-fingerprint.json",
        "--pre-commerce-shared-inventory-fingerprint-sha256",
        sha,
        "--output",
        "post-envelope.json",
      ])
    ).toMatchObject({
      commerceApplyReceiptSha256: sha,
      commercePlanFileSha256: sha,
      commercePlanHash: sha,
      commerceRestoreArtifactSha256: sha,
      inventorySha256: sha,
      priceAuthoritySha256: sha,
    })
    expect(() =>
      parsePostCommerceEnvelopeCliOptions(["--apply", "true"])
    ).toThrow("Unknown option --apply")
  })

  it("rejects a different environment, deployment, build, release, or slot", () => {
    const expected = {
      expectedBackendBuildHash: "build-123",
      expectedBackendDeploymentId: "dpl_123",
      expectedBackendReleaseSha: "1".repeat(40),
      expectedBackendSlot: "blue" as const,
      expectedEnvironmentId: "zane-herbatika-blue",
    }
    const observed = {
      BACKEND_BUILD_HASH: "build-123",
      RELEASE_SHA: "1".repeat(40),
      RO_DEMO_ENVIRONMENT_ID: "zane-herbatika-blue",
      ZANE_DEPLOYMENT_ID: "dpl_123",
      ZANE_DEPLOYMENT_SLOT: "blue",
    }
    expect(assertObservedPostCommerceDeployment(expected, observed)).toEqual({
      backendBuildHash: "build-123",
      backendDeploymentId: "dpl_123",
      backendReleaseSha: "1".repeat(40),
      backendSlot: "blue",
      environmentId: "zane-herbatika-blue",
    })
    for (const changed of [
      { ...observed, BACKEND_BUILD_HASH: "build-other" },
      { ...observed, RELEASE_SHA: "2".repeat(40) },
      { ...observed, RO_DEMO_ENVIRONMENT_ID: "wrong-environment" },
      { ...observed, ZANE_DEPLOYMENT_ID: "dpl_other" },
      { ...observed, ZANE_DEPLOYMENT_SLOT: "green" },
    ]) {
      expect(() =>
        assertObservedPostCommerceDeployment(expected, changed)
      ).toThrow("does not match the reviewed deployment")
    }
  })

  it("refuses existing, aliased, or symlinked output/input paths", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ro-post-envelope-paths-"))
    try {
      const canonicalDirectory = await realpath(directory)
      const names = [
        "apply-receipt.json",
        "inventory.json",
        "plan.json",
        "restore.json",
        "shared.json",
        "authority.json",
        "raw.json",
      ]
      await Promise.all(
        names.map((name, index) =>
          writeFile(join(canonicalDirectory, name), `artifact-${index}\n`)
        )
      )
      const sha = "a".repeat(64)
      const args = [
        "--commerce-apply-receipt",
        join(canonicalDirectory, names[0] as string),
        "--commerce-apply-receipt-sha256",
        sha,
        "--inventory",
        join(canonicalDirectory, names[1] as string),
        "--inventory-sha256",
        sha,
        "--price-authority",
        join(canonicalDirectory, names[5] as string),
        "--price-authority-sha256",
        sha,
        "--commerce-plan",
        join(canonicalDirectory, names[2] as string),
        "--commerce-plan-file-sha256",
        sha,
        "--commerce-plan-hash",
        sha,
        "--commerce-restore-artifact",
        join(canonicalDirectory, names[3] as string),
        "--commerce-restore-artifact-sha256",
        sha,
        "--expected-backend-build-hash",
        "build-123",
        "--expected-backend-deployment-id",
        "dpl_123",
        "--expected-backend-release-sha",
        "1".repeat(40),
        "--expected-backend-slot",
        "blue",
        "--expected-environment-id",
        "zane-herbatika-blue",
        "--raw-live-inventory",
        join(canonicalDirectory, names[6] as string),
        "--raw-live-inventory-sha256",
        sha,
        "--pre-commerce-shared-inventory-fingerprint",
        join(canonicalDirectory, names[4] as string),
        "--pre-commerce-shared-inventory-fingerprint-sha256",
        sha,
        "--output",
        join(canonicalDirectory, "post-envelope.json"),
      ]
      const options = parsePostCommerceEnvelopeCliOptions(args)
      await expect(
        assertPostCommerceArtifactPaths(options)
      ).resolves.toBeUndefined()

      await writeFile(options.outputPath, "reviewed-existing\n")
      await expect(assertPostCommerceArtifactPaths(options)).rejects.toThrow(
        "already exists"
      )
      await expect(
        writePostCommerceEnvelopeNoClobber(
          options.outputPath,
          "must-not-overwrite\n"
        )
      ).rejects.toMatchObject({ code: "EEXIST" })
      expect(await readFile(options.outputPath, "utf8")).toBe(
        "reviewed-existing\n"
      )

      const aliasedOutput = { ...options, outputPath: options.inventoryPath }
      await expect(
        assertPostCommerceArtifactPaths(aliasedOutput)
      ).rejects.toThrow("must not alias")

      const receiptSymlink = join(canonicalDirectory, "receipt-symlink.json")
      await symlink(options.commerceApplyReceiptPath, receiptSymlink)
      await expect(
        assertPostCommerceArtifactPaths({
          ...options,
          commerceApplyReceiptPath: receiptSymlink,
          outputPath: join(canonicalDirectory, "fresh-output.json"),
        })
      ).rejects.toThrow("without symlink aliases")

      const rawHardlink = join(canonicalDirectory, "raw-hardlink.json")
      await link(options.commerceApplyReceiptPath, rawHardlink)
      await expect(
        assertPostCommerceArtifactPaths({
          ...options,
          outputPath: join(canonicalDirectory, "fresh-output.json"),
          rawLiveInventoryPath: rawHardlink,
        })
      ).rejects.toThrow("must be distinct")
    } finally {
      await rm(directory, { force: true, recursive: true })
    }
  })
})

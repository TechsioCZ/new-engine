import { createHash } from "node:crypto"
import { describe, expect, it, vi } from "vitest"
import { parseRoCatalogJson } from "../../../../src/scripts/ro-catalog-import/manifest"
import { buildRoCatalogImportPlan } from "../../../../src/scripts/ro-catalog-import/planner"
import type { RoCatalogSnapshot } from "../../../../src/scripts/ro-catalog-import/types"
import {
  serializeRoDemoArtifact,
  sha256RoDemoArtifactBytes,
  type RoDemoApplyReceipt,
  type RoDemoRestoreArtifact,
} from "../../../../src/scripts/ro-demo-commerce/artifacts"
import { parseRoDemoPriceAuthority } from "../../../../src/scripts/ro-demo-commerce/manifest"
import {
  buildRoDemoCommercePlan,
  hashRoDemoCommercePlan,
} from "../../../../src/scripts/ro-demo-commerce/planner"
import {
  buildPrecommercePriceAuthority,
  type PrecommerceExpectedCounts,
} from "../../../../src/scripts/ro-demo-commerce/precommerce-price-authority"
import type {
  RoDemoBinding,
  RoDemoCommercePlan,
  RoDemoDeploymentIdentity,
  RoDemoSnapshot,
} from "../../../../src/scripts/ro-demo-commerce/types"
import { RO_DEMO_SOURCE } from "../../../../src/scripts/ro-demo-commerce/types"
import {
  buildRomanianDemoLocalization,
  type DemoLocalizationFileInput,
} from "../../../../src/scripts/ro-demo-localization"
import {
  buildPostCommerceEnvelope,
  type PostCommerceExpectedCounts,
  type PostCommerceObservation,
  parsePostCommerceEnvelope,
} from "../../../../src/scripts/ro-demo-localization/postcommerce-envelope"

const SOURCE_SHA = "a".repeat(64)
const CAPTURED_AT = "2026-08-20T10:00:00.000Z"
const GENERATED_AT = "2026-08-20T12:00:00.000Z"
const RON_AMOUNT = 12_000
const PRECOMMERCE_COUNTS: PrecommerceExpectedCounts = {
  excludedProducts: 0,
  excludedVariants: 0,
  inventoryProducts: 1,
  inventoryVariants: 1,
  publishedProducts: 1,
  publishedVariants: 1,
  sellableVariants: 1,
  unavailableVariants: 0,
}
const POSTCOMMERCE_COUNTS: PostCommerceExpectedCounts = {
  brandsExcluded: 0,
  brandsTotal: 0,
  categoriesExcluded: 0,
  categoriesTotal: 1,
  productsExcluded: 0,
  productsPublished: 1,
  productsTotal: 1,
}

const binding: RoDemoBinding = {
  codProviderId: "pp_cash_on_delivery_default",
  fulfillmentProviderId: "manual_manual",
  fulfillmentSetId: "fuset_eu",
  gopayProviderIds: ["pp_gopay"],
  regionName: "Herbatica Romania Demo",
  salesChannelId: "sc_ro",
  shippingProfileId: "sp_default",
  systemPaymentProviderId: "pp_system_default",
}

const deploymentIdentity: RoDemoDeploymentIdentity = {
  backendBuildHash: "d".repeat(40),
  backendDeploymentId: "deployment_ro_demo_001",
  backendReleaseSha: "e".repeat(40),
  backendSlot: "blue",
  databaseFingerprint: "f".repeat(64),
  environmentId: "zane-herbatika-blue",
}

const deepFreeze = <Value>(value: Value): Readonly<Value> => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child)
    }
    Object.freeze(value)
  }
  return value
}

const required = <Value>(value: Value | undefined, label: string): Value => {
  if (value === undefined) {
    throw new Error(`${label} is missing`)
  }
  return value
}

const commerceSnapshot = (): RoDemoSnapshot => ({
  fulfillmentProviderIds: ["manual_manual"],
  fulfillmentSetIds: ["fuset_eu"],
  paymentProviders: [
    { enabled: true, id: "pp_cash_on_delivery_default" },
    { enabled: true, id: "pp_system_default" },
  ],
  pricePreferences: [],
  regions: [
    {
      countryCodes: ["sk", "ro"],
      currencyCode: "eur",
      id: "reg_europe",
      isTaxInclusive: true,
      metadata: {},
      name: "Europe",
      paymentProviderIds: ["pp_system_default"],
    },
  ],
  salesChannelIds: ["sc_ro"],
  serviceZones: [
    {
      countryCodes: ["sk"],
      fulfillmentSetId: "fuset_eu",
      id: "serzo_eu",
      name: "Europe",
    },
  ],
  shippingOptions: [],
  shippingProfileIds: ["sp_default"],
  stores: [
    {
      id: "store_default",
      supportedCurrencies: [{ currencyCode: "eur", isDefault: true }],
    },
  ],
  taxRates: [],
  taxRegions: [],
  variants: [
    {
      ean: "8586021132118",
      id: "variant_befungin",
      metadata: {},
      prices: [
        {
          amount: 24.9,
          currencyCode: "eur",
          id: "price_eur",
          maxQuantity: null,
          minQuantity: null,
          priceListId: null,
          rules: [],
        },
      ],
      productId: "prod_befungin",
      productMetadata: {},
      sku: "4868",
    },
  ],
})

type MockAppliedCommerce = Readonly<{
  observation: PostCommerceObservation
  paymentProviderIds: readonly string[]
  regionId: string
  ronAmount: number
  salesChannelId: string
  shippingOptionIds: readonly string[]
  taxRegionIds: readonly string[]
}>

const applyCommercePlanMock = vi.fn(
  (plan: RoDemoCommercePlan): MockAppliedCommerce => {
    const [price] = plan.variantPrices
    if (!(price && price.action === "create")) {
      throw new Error("mock apply expected one new base RON price")
    }
    const regionId = "reg_ro_applied"
    const serviceZoneId = "serzo_ro_applied"
    const shippingOptionIds = plan.shipping.map(
      ({ code }) => `so_${code.replaceAll("-", "_")}_applied`
    )
    const taxRegionIds = ["txreg_ro_applied"]
    const before = commerceSnapshot()
    const existingRegion = required(before.regions[0], "existing region")
    const taxRegionId = required(taxRegionIds[0], "tax region")
    const observation: PostCommerceObservation = {
      commerce: {
        ...before,
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
            value: regionId,
          },
        ],
        regions: [
          {
            ...existingRegion,
            countryCodes: ["sk"],
          },
          {
            countryCodes: ["ro"],
            currencyCode: "ron",
            id: regionId,
            isTaxInclusive: true,
            metadata: plan.region.metadata,
            name: plan.region.name,
            paymentProviderIds: plan.payment.providerIds,
          },
        ],
        serviceZones: [
          ...before.serviceZones,
          {
            countryCodes: ["ro"],
            fulfillmentSetId: plan.binding.fulfillmentSetId,
            id: serviceZoneId,
            name: plan.serviceZone.name,
          },
        ],
        shippingOptions: plan.shipping.map(({ code }, index) => ({
          code,
          id: required(shippingOptionIds[index], `shipping option ${index}`),
          source: RO_DEMO_SOURCE,
        })),
        stores: before.stores.map((store) => ({
          ...store,
          supportedCurrencies: [
            ...store.supportedCurrencies,
            { currencyCode: "ron", isDefault: false },
          ],
        })),
        taxRates: [
          {
            id: "taxrate_ro_21",
            isDefault: true,
            metadata: { demo_source: RO_DEMO_SOURCE },
            productIds: [],
            rate: 21,
            taxRegionId,
          },
          {
            id: "taxrate_ro_11",
            isDefault: false,
            metadata: { demo_source: RO_DEMO_SOURCE },
            productIds: plan.taxAssignments
              .filter(({ rate }) => rate === 11)
              .map(({ productId }) => productId),
            rate: 11,
            taxRegionId,
          },
        ],
        taxRegions: [{ countryCode: "ro", id: taxRegionId }],
        variants: before.variants.map((variant) => ({
          ...variant,
          prices: [
            ...variant.prices,
            {
              amount: price.amount,
              currencyCode: "ron",
              id: "price_ron_applied",
              maxQuantity: null,
              minQuantity: null,
              priceListId: null,
              rules: [],
            },
          ],
        })),
      },
      salesChannels: [
        {
          id: plan.salesChannelId,
          metadata: { currency_code: "ron", market_code: "ro" },
        },
      ],
      shippingOptions: plan.shipping.map((shipping, index) => ({
        code: shipping.code,
        countryCodes: ["ro"],
        data: {
          market_code: "ro",
          ro_demo_checkout: plan.payment.demoCheckout,
          source: RO_DEMO_SOURCE,
        },
        fulfillmentSetId: plan.binding.fulfillmentSetId,
        id: required(shippingOptionIds[index], `shipping option ${index}`),
        prices: [
          { amount: shipping.amount, currencyCode: "ron", rules: [] },
          ...(shipping.freeFrom
            ? [
                {
                  amount: 0,
                  currencyCode: "ron",
                  rules: [
                    {
                      attribute: "item_total",
                      operator: "gte",
                      value: shipping.freeFrom,
                    },
                  ],
                },
              ]
            : []),
        ],
        providerId: plan.binding.fulfillmentProviderId,
        serviceZoneId,
        shippingProfileId: plan.binding.shippingProfileId,
      })),
    }
    return {
      observation,
      paymentProviderIds: plan.payment.providerIds,
      regionId,
      ronAmount: price.amount,
      salesChannelId: plan.salesChannelId,
      shippingOptionIds,
      taxRegionIds,
    }
  }
)

const importerSnapshot = (
  applied: MockAppliedCommerce,
  skProtection: RoCatalogSnapshot["skProtection"]
): RoCatalogSnapshot => ({
  brandAssignments: [],
  brands: [],
  categories: [
    {
      description: "Slovenský popis kategórie",
      directProductIds: [],
      id: "pcat_extracts",
      isActive: true,
      metadata: {},
      name: "Rastlinné extrakty",
      parentId: null,
    },
  ],
  categoryAssignments: [],
  collectionIds: [],
  commerceReadiness: {
    paymentProviders: applied.paymentProviderIds.map((id) => ({
      enabled: true,
      id,
      regionIds: [applied.regionId],
    })),
    regions: [
      {
        countryCodes: ["ro"],
        currencyCode: "ron",
        id: applied.regionId,
      },
    ],
    shippingOptions: applied.shippingOptionIds.map((id) => ({
      countryCodes: ["ro"],
      id,
    })),
    taxRegions: applied.taxRegionIds.map((id) => ({
      countryCode: "ro",
      id,
    })),
  },
  contents: [
    {
      composition: "",
      id: "pcont_befungin",
      other: "",
      productId: "prod_befungin",
      usage: "",
      warning: "",
    },
  ],
  products: [
    {
      categoryIds: [],
      description: "Slovenský popis",
      externalId: "prod_befungin",
      id: "prod_befungin",
      metadata: {
        url_registry_publication: {
          markets: {
            sk: {
              publicationStatus: "published",
              publicSlug: "befungin-tinktura",
              salesChannelId: "sc_sk",
            },
          },
          schemaVersion: 1,
        },
      },
      salesChannelIds: ["sc_sk", applied.salesChannelId],
      sourceContent: {
        composition: "Čaga",
        other: "",
        usage: "Podľa návodu.",
        warning: "Uchovávajte mimo dosahu detí.",
      },
      status: "published",
      title: "Befungin tinktúra",
      variants: [
        {
          ean: "8586021132118",
          id: "variant_befungin",
          prices: [
            { amount: 24.9, currencyCode: "eur" },
            { amount: applied.ronAmount, currencyCode: "ron" },
          ],
          sku: "4868",
        },
      ],
    },
  ],
  salesChannels: [
    {
      id: applied.salesChannelId,
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
  ],
  skProtection,
  translations: [],
})

describe("RO demo two-phase catalog contract", () => {
  it("uses price authority before commerce and only generates/imports from a fresh post-commerce envelope", () => {
    applyCommercePlanMock.mockClear()
    const preEnvelope = deepFreeze<DemoLocalizationFileInput>({
      brandExclusionAuthority: {
        approvedAt: GENERATED_AT,
        approvedBy: "demo-catalog-owner",
        referencePrefix: "RO-DEMO-BRAND",
      },
      fallbackSource: {
        contentSha256: SOURCE_SHA,
        retrievedAt: CAPTURED_AT,
        url: "https://www.herbatica.ro/export/catalog.jsonl",
      },
      generatedAt: GENERATED_AT,
      inventory: {
        brands: [],
        categories: [
          {
            description: "Slovenský popis kategórie",
            directChildCount: 0,
            directProductCount: 0,
            key: { kind: "medusa_id", value: "pcat_extracts" },
            name: "Rastlinné extrakty",
            parentKey: null,
          },
        ],
        products: [
          {
            description: "Slovenský popis produktu",
            externalId: "prod_befungin",
            id: "prod_befungin",
            productContentId: "pcont_befungin",
            productContent: {
              composition: "Čaga",
              other: "",
              usage: "Podľa návodu.",
              warning: "Uchovávajte mimo dosahu detí.",
            },
            title: "Befungin tinktúra",
            variants: [
              {
                ean: "8586021132118",
                sku: "4868",
              },
            ],
          },
        ],
      },
      mergedEvidenceCapturedAt: CAPTURED_AT,
      readiness: {
        currencyCode: "ron",
        paymentProviderIds: [],
        regionId: "pending",
        shippingOptionIds: [],
        taxRegionIds: [],
      },
      salesChannelId: "sc_ro",
    })
    const officialProducts = [
      {
        canonicalSlug:
          "befungin-tinctura-cu-extract-de-chaga-siberian-100-ml-herbatica",
        description: "Descriere oficială în limba română.",
        ean: "8586021132118",
        matchingStatus: "exact-bijective" as const,
        medusaProductId: "prod_befungin",
        sku: "4868",
        source: {
          contentSha256: SOURCE_SHA,
          retrievedAt: CAPTURED_AT,
          url: "https://www.herbatica.ro/extracte-din-plante/befungin/",
        },
        title: "Befungin – tinctură cu extract de chaga siberiană",
      },
    ]
    const officialCategories = [
      {
        copySource: "agent-generated-unreviewed" as const,
        key: { kind: "medusa_id" as const, value: "pcat_extracts" },
        publicSlug: "extracte-din-plante",
        source: {
          contentSha256: SOURCE_SHA,
          retrievedAt: CAPTURED_AT,
          url: "https://www.herbatica.ro/extracte-din-plante/",
        },
        translation: {
          bottom_description_html: null,
          description: "Selecție demonstrativă de extracte din plante.",
          meta_description: "Extracte din plante Herbatica",
          meta_title: "Extracte din plante",
          name: "Extracte din plante",
          top_description_html: null,
        },
      },
    ]
    const frozenEnvelopeBytes = JSON.stringify(preEnvelope)

    expect(preEnvelope.inventory.products[0]?.variants[0]?.ronPrice).toBe(
      undefined
    )

    const inventoryEnvelopeJson = JSON.stringify(preEnvelope)
    const rawLiveInventoryJson = JSON.stringify({
      products: [
        {
          id: "prod_befungin",
          variants: [
            {
              ean: "8586021132118",
              id: "variant_befungin",
              sku: "4868",
            },
          ],
        },
      ],
    })
    const mergedProductsJsonl = JSON.stringify({
      approval: "demo-generated-unreviewed",
      canonical_url: "https://www.herbatica.ro/extracte-din-plante/befungin/",
      demo_scope: { decision: "publish-candidate" },
      ean: "8586021132118",
      matchingStatus: "matched",
      medusa_match: {
        medusa: {
          matching_variant_ids: ["variant_befungin"],
          product_id: "prod_befungin",
        },
        method: "exact_ean",
        official_identity: { ean: "8586021132118", sku: "4868" },
        status: "matched",
      },
      medusaProductId: "prod_befungin",
      price: { amount: RON_AMOUNT, currency: "RON" },
      schema_version: 1,
      sku: "4868",
      source: { content_sha256: SOURCE_SHA, retrieved_at: CAPTURED_AT },
    })
    const sourceRoots = {
      inventoryEnvelopeSha256: createHash("sha256")
        .update(inventoryEnvelopeJson)
        .digest("hex"),
      mergedProductsSha256: createHash("sha256")
        .update(mergedProductsJsonl)
        .digest("hex"),
      rawLiveInventorySha256: createHash("sha256")
        .update(rawLiveInventoryJson)
        .digest("hex"),
    }
    const authorityBuild = buildPrecommercePriceAuthority(
      { inventoryEnvelopeJson, mergedProductsJsonl, rawLiveInventoryJson },
      PRECOMMERCE_COUNTS,
      1,
      sourceRoots
    )
    const priceAuthority = parseRoDemoPriceAuthority(
      authorityBuild.canonicalJson,
      PRECOMMERCE_COUNTS,
      sourceRoots
    )
    const priceAuthoritySha256 = authorityBuild.sha256
    const preCommerceSnapshot = commerceSnapshot()
    const commercePlan = buildRoDemoCommercePlan(
      priceAuthority,
      priceAuthoritySha256,
      binding,
      { deploymentIdentity, snapshot: preCommerceSnapshot }
    )

    expect(commercePlan.priceAuthoritySha256).toBe(priceAuthoritySha256)
    expect(commercePlan.variantPrices).toEqual([
      expect.objectContaining({
        action: "create",
        amount: RON_AMOUNT,
        productId: "prod_befungin",
        variantId: "variant_befungin",
      }),
    ])

    const applied = applyCommercePlanMock(commercePlan)
    expect(applyCommercePlanMock).toHaveBeenCalledOnce()
    expect(JSON.stringify(preEnvelope)).toBe(frozenEnvelopeBytes)

    const commercePlanHash = hashRoDemoCommercePlan(commercePlan)
    const commercePlanFileSha256 = createHash("sha256")
      .update(JSON.stringify(commercePlan))
      .digest("hex")
    const commerceRestoreArtifact: RoDemoRestoreArtifact = {
      demo: true,
      deploymentIdentity,
      kind: "ro-demo-commerce-restore",
      market: "ro",
      planHash: commercePlanHash,
      priceAuthorityKind: commercePlan.priceAuthorityKind,
      priceAuthoritySha256,
      schemaVersion: 1,
      snapshot: preCommerceSnapshot,
    }
    const commerceRestoreArtifactSha256 = sha256RoDemoArtifactBytes(
      serializeRoDemoArtifact(commerceRestoreArtifact)
    )
    const commercePostState: RoDemoApplyReceipt["postState"] = {
      paymentProviderIds: commercePlan.payment.providerIds,
      regionId: applied.regionId,
      salesChannelId: applied.salesChannelId,
      serviceZoneId: required(
        applied.observation.commerce.serviceZones.find(({ countryCodes }) =>
          countryCodes.includes("ro")
        )?.id,
        "applied RO service zone"
      ),
      shippingOptions: commercePlan.shipping.map(({ code }) => ({
        code,
        id: required(
          applied.observation.shippingOptions.find(
            (option) => option.code === code
          )?.id,
          `applied shipping option ${code}`
        ),
      })),
      taxRateIds: applied.observation.commerce.taxRates
        .map(({ id }) => id)
        .sort(),
      taxRegionIds: applied.taxRegionIds,
      variantPrices: commercePlan.variantPrices.map(
        ({ amount, productId, variantId }) => ({
          amount,
          productId,
          variantId,
        })
      ),
    }
    const commerceApplyReceipt: RoDemoApplyReceipt = {
      demo: true,
      deploymentIdentity,
      kind: "ro-demo-commerce-apply-receipt",
      market: "ro",
      planHash: commercePlanHash,
      postState: commercePostState,
      postStateSha256: sha256RoDemoArtifactBytes(
        serializeRoDemoArtifact(commercePostState)
      ),
      priceAuthorityKind: commercePlan.priceAuthorityKind,
      priceAuthoritySha256,
      restoreArtifactSha256: commerceRestoreArtifactSha256,
      schemaVersion: 1,
      skBaselineHashAfter: commercePlan.skBaselineHash,
      skBaselineHashBefore: commercePlan.skBaselineHash,
    }
    const commerceApplyReceiptSha256 = sha256RoDemoArtifactBytes(
      serializeRoDemoArtifact(commerceApplyReceipt)
    )
    const sharedInventoryFingerprint = {
      count: 1,
      sha256: "c".repeat(64),
    }
    const builtPostEnvelope = buildPostCommerceEnvelope({
      backendBuildHash: deploymentIdentity.backendBuildHash,
      backendDeploymentId: deploymentIdentity.backendDeploymentId,
      backendReleaseSha: deploymentIdentity.backendReleaseSha,
      backendSlot: deploymentIdentity.backendSlot,
      capturedAt: GENERATED_AT,
      commerceApplyReceipt,
      commerceApplyReceiptSha256,
      commercePlan,
      commercePlanFileSha256,
      commercePlanHash,
      commerceRestoreArtifact,
      commerceRestoreArtifactSha256,
      environmentId: deploymentIdentity.environmentId,
      expectedCounts: POSTCOMMERCE_COUNTS,
      observation: applied.observation,
      postCommerceSharedInventoryFingerprint: sharedInventoryFingerprint,
      preCommerceSharedInventoryFingerprint: sharedInventoryFingerprint,
      priceAuthority: authorityBuild.artifact,
      priceAuthoritySha256,
      rawLiveInventorySha256: sourceRoots.rawLiveInventorySha256,
      sourceInventory: preEnvelope,
      sourceInventoryEnvelopeSha256: sourceRoots.inventoryEnvelopeSha256,
    })
    const postEnvelopeText = JSON.stringify(builtPostEnvelope)
    const postEnvelope = parsePostCommerceEnvelope(postEnvelopeText, {
      expectedCounts: POSTCOMMERCE_COUNTS,
      now: new Date(GENERATED_AT),
    })
    const postCommerceEnvelopeSha256 = createHash("sha256")
      .update(postEnvelopeText)
      .digest("hex")
    const {
      brandExclusionAuthority: _brandExclusionAuthority,
      mergedEvidenceCapturedAt: _mergedEvidenceCapturedAt,
      ...generatorPayload
    } = postEnvelope.payload
    const { payload: _postCommercePayload, ...postCommerceEvidence } =
      postEnvelope
    const bundle = buildRomanianDemoLocalization({
      ...generatorPayload,
      officialCategories,
      officialProducts,
      postCommerceInventoryEvidence: {
        ...postCommerceEvidence,
        postCommerceEnvelopeSha256,
      },
    })

    expect(bundle.manifest.readiness).toEqual(postEnvelope.payload.readiness)
    expect(bundle.manifest.products[0]?.variants[0]).toMatchObject({
      roAvailability: "sellable",
      ronPrice: { amount: RON_AMOUNT, currencyCode: "ron" },
    })

    const parsedManifest = parseRoCatalogJson(JSON.stringify(bundle.manifest))
    const currentSnapshot = importerSnapshot(applied, {
      baseline: {
        count:
          parsedManifest.postCommerceInventoryEvidence
            .postCommerceSkBaseline.count,
        sha256:
          parsedManifest.postCommerceInventoryEvidence
            .postCommerceSkBaseline.sha256,
      },
      issues: [],
      publication: {
        brands: 0,
        categories: 0,
        collections: 0,
        errors: 0,
        products: 0,
      },
      sharedInventoryBaseline:
        parsedManifest.postCommerceInventoryEvidence
          .postCommerceSharedInventoryFingerprint,
    })
    const snapshotBytes = JSON.stringify(currentSnapshot)
    const previousSecret = process.env.RO_DEMO_OMISSION_AUTHORITY_SECRET
    process.env.RO_DEMO_OMISSION_AUTHORITY_SECRET = "test-secret-".repeat(4)
    try {
      const dryRunPlan = buildRoCatalogImportPlan(
        parsedManifest,
        currentSnapshot,
        { salesChannelId: applied.salesChannelId }
      )

      expect(dryRunPlan.items).toHaveLength(1)
      expect(dryRunPlan.items[0]).toMatchObject({
        productId: "prod_befungin",
        publication: { salesChannelId: "sc_ro" },
      })
      expect(dryRunPlan.scope).toMatchObject({
        productExcludedIds: [],
        productPublishedIds: ["prod_befungin"],
      })
      expect(dryRunPlan.expectedSkBaseline).toEqual(
        currentSnapshot.skProtection.baseline
      )
      expect(JSON.stringify(currentSnapshot)).toBe(snapshotBytes)
    } finally {
      if (previousSecret === undefined) {
        // biome-ignore lint/performance/noDelete: exact environment restoration requires absence, not a stringified undefined value.
        delete process.env.RO_DEMO_OMISSION_AUTHORITY_SECRET
      } else {
        process.env.RO_DEMO_OMISSION_AUTHORITY_SECRET = previousSecret
      }
    }
  })
})

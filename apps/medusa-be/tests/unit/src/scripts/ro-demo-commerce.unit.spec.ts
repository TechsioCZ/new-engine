import { describe, expect, it } from "vitest"
import type { RoCatalogManifest } from "../../../../src/scripts/ro-catalog-import/types"
import {
  parseRoDemoCliOptions,
  parseRoDemoManifest,
  parseRoDemoPriceAuthority,
} from "../../../../src/scripts/ro-demo-commerce/manifest"
import {
  buildRoDemoCommercePlan as buildRoDemoCommercePlanWithDeployment,
  hashRoDemoCommercePlan,
  hashSkCommerceBaseline,
  serializeRoDemoCommercePlan,
} from "../../../../src/scripts/ro-demo-commerce/planner"
import {
  type PrecommerceExpectedCounts,
  type PrecommercePriceAuthorityArtifact,
  RO_DEMO_FROZEN_PRECOMMERCE_SOURCE_ROOTS,
  serializePrecommercePriceAuthority,
  sha256PrecommerceInventoryIdentity,
} from "../../../../src/scripts/ro-demo-commerce/precommerce-price-authority"
import { buildVariantPriceUpdatePayload } from "../../../../src/scripts/ro-demo-commerce/runtime"
import type {
  RoDemoBinding,
  RoDemoDeploymentIdentity,
  RoDemoSnapshot,
} from "../../../../src/scripts/ro-demo-commerce/types"

const HASH = "a".repeat(64)
const deploymentIdentity: RoDemoDeploymentIdentity = {
  backendBuildHash: "build-blue",
  backendDeploymentId: "deployment-blue",
  backendReleaseSha: "b".repeat(40),
  backendSlot: "blue",
  databaseFingerprint: "c".repeat(64),
  databaseInstanceFingerprint: "d".repeat(64),
  environmentId: "herbatika-production",
}
const deploymentArgs = [
  "--expected-backend-build-hash",
  deploymentIdentity.backendBuildHash,
  "--expected-backend-deployment-id",
  deploymentIdentity.backendDeploymentId,
  "--expected-backend-release-sha",
  deploymentIdentity.backendReleaseSha,
  "--expected-backend-slot",
  deploymentIdentity.backendSlot,
  "--expected-commerce-manifest-sha256",
  HASH,
  "--expected-database-fingerprint",
  deploymentIdentity.databaseFingerprint,
  "--expected-database-instance-fingerprint",
  deploymentIdentity.databaseInstanceFingerprint,
  "--expected-environment-id",
  deploymentIdentity.environmentId,
  "--expected-price-authority-sha256",
  HASH,
  "--expected-sk-commerce-baseline-sha256",
  "e".repeat(64),
]
const buildRoDemoCommercePlan = (
  ...args: [
    Parameters<typeof buildRoDemoCommercePlanWithDeployment>[0],
    Parameters<typeof buildRoDemoCommercePlanWithDeployment>[1],
    Parameters<typeof buildRoDemoCommercePlanWithDeployment>[2],
    RoDemoSnapshot,
  ]
) =>
  buildRoDemoCommercePlanWithDeployment(args[0], args[1], args[2], {
    commerceManifestSha256: HASH,
    deploymentIdentity,
    snapshot: args[3],
  })
const SHA_256 = /^[a-f0-9]{64}$/
const binding: RoDemoBinding = {
  codProviderId: "pp_cash_on_delivery_default",
  fulfillmentProviderId: "manual_manual",
  fulfillmentSetId: "fuset_eu",
  gopayProviderIds: ["pp_gopay"],
  regionName: "Herbatica Romania Demo",
  salesChannelId: "sc_storefront",
  shippingProfileId: "sp_default",
  systemPaymentProviderId: "pp_system_default",
}

const catalog = (amount = 120): RoCatalogManifest => ({
  categories: [],
  locale: "ro-RO",
  market: "ro",
  products: [
    {
      key: { kind: "sku", value: "4868" },
      productContent: { composition: "", other: "", usage: "", warning: "" },
      publicationStatus: "published",
      publicSlug:
        "befungin-tinctura-cu-extract-de-chaga-siberian-100-ml-herbatica",
      source: {
        contentSha256: HASH,
        retrievedAt: "2026-08-20T10:00:00.000Z",
        url: "https://www.herbatica.ro/extracte-din-plante/befungin/",
      },
      translation: { description: "Descriere", title: "Befungin" },
      variants: [
        {
          key: { kind: "ean", value: "8586021132118" },
          roAvailability: "sellable",
          ronPrice: {
            amount,
            approval: {
              approvedAt: "2026-08-20T09:00:00.000Z",
              approvedBy: "demo",
              reference: "official-ro-page",
            },
            currencyCode: "ron",
          },
        },
      ],
    },
  ],
  readiness: {
    currencyCode: "ron",
    paymentProviderIds: ["pending"],
    regionId: "pending",
    shippingOptionIds: ["pending"],
    taxRegionIds: ["pending"],
  },
  schemaVersion: 1,
})

const smallAuthorityCounts = {
  excludedProducts: 0,
  excludedVariants: 0,
  inventoryProducts: 1,
  inventoryVariants: 1,
  publishedProducts: 1,
  publishedVariants: 1,
  sellableVariants: 1,
  unavailableVariants: 0,
} as const satisfies PrecommerceExpectedCounts

const priceAuthority = (): PrecommercePriceAuthorityArtifact => ({
  amountUnit: "major",
  authorization: "demo-generated-unreviewed",
  counts: smallAuthorityCounts,
  currencyCode: "ron",
  exclusions: [],
  inventoryIdentitySha256: sha256PrecommerceInventoryIdentity([
    {
      productId: "prod_befungin",
      variants: [
        {
          ean: "8586021132118",
          liveSku: "4868",
          variantId: "variant_befungin",
        },
      ],
    },
  ]),
  kind: "ro-demo-precommerce-price-authority",
  locale: "ro-RO",
  market: "ro",
  products: [
    {
      productId: "prod_befungin",
      variants: [
        {
          ean: "8586021132118",
          evidence: {
            mergedLine: 1,
            mergedRecordSha256: HASH,
            officialContentSha256: HASH,
            retrievedAt: "2026-08-20T10:00:00.000Z",
            sourceUrl: "https://www.herbatica.ro/extracte-din-plante/befungin/",
          },
          liveSku: "4868",
          officialSku: "4868",
          price: {
            amount: 120,
            approval: {
              approvedAt: "2026-08-20T09:00:00.000Z",
              approvedBy: "user-demo-authorization",
              reference: `demo-generated-unreviewed:official-ron:1:${HASH}`,
            },
            currencyCode: "ron",
          },
          roAvailability: "sellable",
          variantId: "variant_befungin",
        },
      ],
    },
  ],
  schemaVersion: 1,
  sourceRoots: RO_DEMO_FROZEN_PRECOMMERCE_SOURCE_ROOTS,
})

const snapshot = (overrides: Partial<RoDemoSnapshot> = {}): RoDemoSnapshot => ({
  fulfillmentProviderIds: ["manual_manual"],
  fulfillmentSetIds: ["fuset_eu"],
  paymentProviders: [
    { enabled: true, id: "pp_cash_on_delivery_default" },
    { enabled: true, id: "pp_gopay" },
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
  salesChannelIds: ["sc_storefront"],
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
      supportedCurrencies: [
        { currencyCode: "eur", isDefault: true },
        { currencyCode: "czk", isDefault: false },
      ],
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
  ...overrides,
})

describe("RO demo commerce manifest", () => {
  it("requires both explicit demo consent and the confirmed hash for apply", () => {
    expect(() =>
      parseRoDemoCliOptions([
        ...deploymentArgs,
        "--manifest",
        "demo.json",
        "--plan-output",
        "/tmp/ro-plan.json",
        "--apply",
      ])
    ).toThrow("--apply requires --demo and --confirm-plan-hash")
    expect(
      parseRoDemoCliOptions([
        ...deploymentArgs,
        "--manifest",
        "demo.json",
        "--plan-output",
        "/tmp/ro-plan.json",
        "--apply",
        "--demo",
        "--confirm-plan-hash",
        HASH,
        "--receipt-output",
        "/tmp/ro-receipt.json",
        "--restore-output",
        "/tmp/ro-restore.json",
      ])
    ).toEqual({
      apply: true,
      confirmPlanHash: HASH,
      demo: true,
      expectedCommerceManifestSha256: HASH,
      expectedDeployment: deploymentIdentity,
      expectedPriceAuthoritySha256: HASH,
      expectedSkCommerceBaselineSha256: "e".repeat(64),
      manifestPath: "demo.json",
      planOutputPath: "/tmp/ro-plan.json",
      receiptOutputPath: "/tmp/ro-receipt.json",
      restoreOutputPath: "/tmp/ro-restore.json",
    })
  })

  it("rejects a manifest that is not explicitly demo-only RO", () => {
    expect(() =>
      parseRoDemoManifest(
        JSON.stringify({
          binding,
          demo: false,
          locale: "ro-RO",
          market: "ro",
          priceAuthorityPath: "prices.json",
          schemaVersion: 1,
        })
      )
    ).toThrow("demo=true")
  })

  it("parses a readiness-independent official RON price authority", () => {
    const authority = parseRoDemoPriceAuthority(
      serializePrecommercePriceAuthority(priceAuthority()),
      smallAuthorityCounts
    )
    expect(authority.variants[0]?.amount).toBe(120)
    expect(authority).not.toHaveProperty("readiness")
  })

  it("rejects readiness placeholders and sellable variants without approved RON", () => {
    expect(() =>
      parseRoDemoPriceAuthority(
        `${JSON.stringify({ ...priceAuthority(), readiness: {} })}\n`,
        smallAuthorityCounts
      )
    ).toThrow("fields must be exactly")
    expect(() =>
      parseRoDemoPriceAuthority(
        `${JSON.stringify({
          ...priceAuthority(),
          products: priceAuthority().products.map((product) => ({
            ...product,
            variants: product.variants.map(({ price: _, ...variant }) =>
              variant.roAvailability === "sellable" ? variant : { ...variant }
            ),
          })),
        })}\n`,
        smallAuthorityCounts
      )
    ).toThrow("fields must be exactly")
  })
})

describe("RO demo commerce planner", () => {
  it("plans official RON shipping defaults, GoPay-only payment, and never derives price from EUR", () => {
    const plan = buildRoDemoCommercePlan(
      catalog(120),
      HASH,
      binding,
      snapshot()
    )
    expect(plan.variantPrices).toEqual([
      {
        action: "create",
        amount: 120,
        currentRonPrice: null,
        productId: "prod_befungin",
        variantId: "variant_befungin",
      },
    ])
    expect(plan.shipping).toEqual([
      {
        action: "create",
        amount: 14.99,
        code: "ro-demo-packeta-pickup",
        freeFrom: 249,
        existingId: null,
        label: "Packeta – punct de ridicare",
      },
      {
        action: "create",
        amount: 32.69,
        code: "ro-demo-packeta-address",
        existingId: null,
        label: "Packeta – livrare la adresă",
      },
      {
        action: "create",
        amount: 26.5,
        code: "ro-demo-cargus",
        existingId: null,
        label: "Cargus",
      },
    ])
    expect(plan.codPolicy).toEqual({
      configuredFee: 9.45,
      configuredMinimumOrder: 40,
      enabled: false,
      reason:
        "checkout does not yet enforce the minimum and fee; provider is intentionally unlinked",
    })
    expect(plan.payment).toEqual({
      demoCheckout: null,
      displayLabel: "Plată online prin GoPay",
      fallback: false,
      providerId: "pp_gopay",
      providerIds: ["pp_gopay"],
    })
    expect(plan.taxAssignments).toEqual([
      { productId: "prod_befungin", rate: 21, source: "demo-default" },
    ])
    expect(plan.warnings.join(" ")).toContain("demo default 21%")
  })

  it("uses enabled GoPay and source VAT metadata when available", () => {
    const current = snapshot({
      paymentProviders: [
        { enabled: true, id: "pp_cash_on_delivery_default" },
        { enabled: true, id: "pp_gopay" },
        { enabled: true, id: "pp_system_default" },
      ],
      variants: [
        {
          ...snapshot().variants[0],
          productMetadata: { ro_vat_rate: 11 },
        },
      ],
    })
    const plan = buildRoDemoCommercePlan(catalog(), HASH, binding, current)
    expect(plan.payment).toEqual({
      demoCheckout: null,
      displayLabel: "Plată online prin GoPay",
      fallback: false,
      providerId: "pp_gopay",
      providerIds: ["pp_gopay"],
    })
    expect(plan.taxAssignments).toEqual([
      { productId: "prod_befungin", rate: 11, source: "product-metadata" },
    ])
  })

  it("refuses carrier checkout without GoPay or the no-debit demo provider", () => {
    expect(() =>
      buildRoDemoCommercePlan(
        catalog(),
        HASH,
        binding,
        snapshot({
          paymentProviders: [
            { enabled: true, id: "pp_cash_on_delivery_default" },
            { enabled: false, id: "pp_gopay" },
            { enabled: false, id: "pp_system_default" },
          ],
        })
      )
    ).toThrow("neither an approved GoPay provider nor the explicit no-debit")
  })

  it("plans an exact marked no-debit RO fallback when GoPay is unavailable", () => {
    const plan = buildRoDemoCommercePlan(
      catalog(),
      HASH,
      binding,
      snapshot({
        paymentProviders: [
          { enabled: true, id: "pp_cash_on_delivery_default" },
          { enabled: false, id: "pp_gopay" },
          { enabled: true, id: "pp_system_default" },
        ],
      })
    )
    expect(plan.payment).toMatchObject({
      displayLabel: "Plată demo (fără debitare)",
      fallback: true,
      providerId: "pp_system_default",
      providerIds: ["pp_system_default"],
    })
    expect(plan.payment.demoCheckout).toEqual({
      binding_sha256: expect.stringMatching(SHA_256),
      label: "Plată demo (fără debitare)",
      locale: "ro-RO",
      market: "ro",
      payment_mode: "no-debit-demo",
      provider_id: "pp_system_default",
      schema_version: 1,
      source: "herbatica-ro-demo-commerce-v1",
    })
    expect(plan.region.metadata.ro_demo_checkout).toEqual(
      plan.payment.demoCheckout
    )
  })

  it("refuses every payment provider outside the exact selected RO set", () => {
    expect(() =>
      buildRoDemoCommercePlan(
        catalog(),
        HASH,
        binding,
        snapshot({
          regions: [
            snapshot().regions[0],
            {
              countryCodes: ["ro"],
              currencyCode: "ron",
              id: "reg_ro_demo",
              isTaxInclusive: true,
              metadata: {},
              name: binding.regionName,
              paymentProviderIds: ["pp_gopay", "pp_other"],
            },
          ],
        })
      )
    ).toThrow("outside the exact planned set")
  })

  it("refuses unsafe RON mutation when a variant has rule-scoped base prices", () => {
    expect(() =>
      buildRoDemoCommercePlan(
        catalog(),
        HASH,
        binding,
        snapshot({
          variants: [
            {
              ...snapshot().variants[0],
              prices: [
                {
                  ...snapshot().variants[0].prices[0],
                  rules: [
                    {
                      attribute: "region_id",
                      operator: "eq",
                      value: "reg_europe",
                    },
                  ],
                },
                {
                  amount: 120,
                  currencyCode: "ron",
                  id: "price_ron",
                  maxQuantity: null,
                  minQuantity: null,
                  priceListId: null,
                  rules: [],
                },
              ],
            },
          ],
        })
      )
    ).toThrow("rule-scoped base prices")
  })

  it.each([
    {
      label: "base",
      price: {
        amount: 120,
        currencyCode: "ron",
        id: "price_ron_base",
        maxQuantity: null,
        minQuantity: null,
        priceListId: null,
        rules: [],
      },
    },
    {
      label: "price-list",
      price: {
        amount: 99,
        currencyCode: "ron",
        id: "price_ron_list",
        maxQuantity: null,
        minQuantity: null,
        priceListId: "plist_ro",
        rules: [],
      },
    },
    {
      label: "rule-scoped",
      price: {
        amount: 110,
        currencyCode: "ron",
        id: "price_ron_rule",
        maxQuantity: null,
        minQuantity: null,
        priceListId: null,
        rules: [
          {
            attribute: "region_id",
            operator: "eq",
            value: "reg_ro",
          },
        ],
      },
    },
  ])("refuses an unavailable variant with a $label RON price", ({ price }) => {
    const unavailableCatalog: RoCatalogManifest = {
      ...catalog(),
      products: catalog().products.map((product) => ({
        ...product,
        variants: product.variants.map(({ ronPrice: _, ...variant }) => ({
          ...variant,
          roAvailability: "unavailable" as const,
        })),
      })),
    }
    expect(() =>
      buildRoDemoCommercePlan(
        unavailableCatalog,
        HASH,
        binding,
        snapshot({
          variants: [
            {
              ...snapshot().variants[0],
              prices: [...snapshot().variants[0].prices, price],
            },
          ],
        })
      )
    ).toThrow("already has a RON price")
  })

  it("refuses to mutate a target region that owns any non-RO country", () => {
    expect(() =>
      buildRoDemoCommercePlan(
        catalog(),
        HASH,
        binding,
        snapshot({
          regions: [
            {
              ...snapshot().regions[0],
              name: binding.regionName,
            },
          ],
        })
      )
    ).toThrow("owns non-RO countries")
  })

  it("refuses collisions with shipping options not owned by the demo tool", () => {
    expect(() =>
      buildRoDemoCommercePlan(
        catalog(),
        HASH,
        binding,
        snapshot({
          shippingOptions: [
            { code: "ro-demo-cargus", id: "so_foreign", source: null },
          ],
        })
      )
    ).toThrow("not owned by the RO demo tool")
  })

  it("refuses an existing Romanian default VAT rate other than 21%", () => {
    expect(() =>
      buildRoDemoCommercePlan(
        catalog(),
        HASH,
        binding,
        snapshot({
          taxRates: [
            {
              id: "txrate_wrong",
              isDefault: true,
              metadata: {},
              productIds: [],
              rate: 19,
              taxRegionId: "txreg_ro",
            },
          ],
          taxRegions: [{ countryCode: "ro", id: "txreg_ro" }],
        })
      )
    ).toThrow("must be exactly 21%")
  })

  it("refuses an unowned RO tax override that overlaps demo 11% products", () => {
    expect(() =>
      buildRoDemoCommercePlan(
        catalog(),
        HASH,
        binding,
        snapshot({
          taxRates: [
            {
              id: "txrate_foreign_11",
              isDefault: false,
              metadata: {},
              productIds: ["prod_befungin"],
              rate: 11,
              taxRegionId: "txreg_ro",
            },
          ],
          taxRegions: [{ countryCode: "ro", id: "txreg_ro" }],
          variants: snapshot().variants.map((variant) => ({
            ...variant,
            productMetadata: { ro_vat_rate: 11 },
          })),
        })
      )
    ).toThrow("unowned Romanian tax rate overlaps demo 11% products")
  })

  it("hashes the full plan deterministically and includes source manifest bytes", () => {
    const first = buildRoDemoCommercePlan(catalog(), HASH, binding, snapshot())
    const second = buildRoDemoCommercePlan(catalog(), HASH, binding, snapshot())
    expect(hashRoDemoCommercePlan(first)).toBe(hashRoDemoCommercePlan(second))
    expect(
      hashRoDemoCommercePlan({
        ...second,
        priceAuthoritySha256: "b".repeat(64),
      })
    ).not.toBe(hashRoDemoCommercePlan(first))
    expect(serializeRoDemoCommercePlan(first)).toBe(
      serializeRoDemoCommercePlan(first)
    )
    expect(serializeRoDemoCommercePlan(first).endsWith("\n")).toBe(true)
    const skDrift = snapshot({
      regions: [{ ...snapshot().regions[0], currencyCode: "czk" }],
    })
    expect(
      hashRoDemoCommercePlan(
        buildRoDemoCommercePlan(catalog(), HASH, binding, skDrift)
      )
    ).not.toBe(hashRoDemoCommercePlan(first))
  })

  it("SK baseline ignores only RO country detachment but detects SK currency or price drift", () => {
    const original = snapshot()
    const detached = snapshot({
      regions: [{ ...original.regions[0], countryCodes: ["sk"] }],
    })
    expect(hashSkCommerceBaseline(detached)).toBe(
      hashSkCommerceBaseline(original)
    )
    expect(
      hashSkCommerceBaseline(
        snapshot({
          regions: [{ ...original.regions[0], currencyCode: "ron" }],
        })
      )
    ).not.toBe(hashSkCommerceBaseline(original))
    expect(
      hashSkCommerceBaseline(
        snapshot({
          variants: [
            {
              ...original.variants[0],
              prices: [
                {
                  amount: 999,
                  currencyCode: "eur",
                  id: "price_eur",
                  maxQuantity: null,
                  minQuantity: null,
                  priceListId: null,
                  rules: [],
                },
              ],
            },
          ],
        })
      )
    ).not.toBe(hashSkCommerceBaseline(original))
  })
})

describe("RO demo commerce runtime price payload", () => {
  it("updates only base prices and never reinterprets a price-list row", () => {
    const current = {
      ...snapshot().variants[0],
      prices: [
        ...snapshot().variants[0].prices,
        {
          amount: 19.9,
          currencyCode: "eur",
          id: "price_promo",
          maxQuantity: null,
          minQuantity: null,
          priceListId: "plist_sale",
          rules: [],
        },
      ],
    }
    const payload = buildVariantPriceUpdatePayload(current, {
      action: "create",
      amount: 120,
      currentRonPrice: null,
      productId: current.productId,
      variantId: current.id,
    })
    expect(payload.prices).toEqual([
      {
        amount: 24.9,
        currency_code: "eur",
        id: "price_eur",
        max_quantity: null,
        min_quantity: null,
      },
      { amount: 120, currency_code: "ron" },
    ])
    expect(JSON.stringify(payload)).not.toContain("price_promo")
  })

  it("fails instead of dropping rules from an existing base price", () => {
    const current = {
      ...snapshot().variants[0],
      prices: snapshot().variants[0].prices.map((price) => ({
        ...price,
        rules: [
          {
            attribute: "region_id",
            operator: "eq",
            value: "reg_europe",
          },
        ],
      })),
    }
    expect(() =>
      buildVariantPriceUpdatePayload(current, {
        action: "create",
        amount: 120,
        currentRonPrice: null,
        productId: current.productId,
        variantId: current.id,
      })
    ).toThrow("rule-scoped base prices")
  })
})

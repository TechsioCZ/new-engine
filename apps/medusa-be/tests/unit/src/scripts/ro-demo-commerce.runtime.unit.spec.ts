import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { RoCatalogManifest } from "../../../../src/scripts/ro-catalog-import/types"
import {
  parseRoDemoApplyReceipt,
  parseRoDemoRestoreArtifact,
  sha256RoDemoArtifactBytes,
} from "../../../../src/scripts/ro-demo-commerce/artifacts"
import {
  buildRoDemoCommercePlan as buildRoDemoCommercePlanWithDeployment,
  hashRoDemoCommercePlan,
  hashSkCommerceBaseline,
  serializeRoDemoCommercePlan,
} from "../../../../src/scripts/ro-demo-commerce/planner"
import type {
  RoDemoBinding,
  RoDemoSnapshot,
} from "../../../../src/scripts/ro-demo-commerce/types"

const mocks = vi.hoisted(() => ({
  createRegions: vi.fn(),
  createShippingOptions: vi.fn(),
  createTaxRates: vi.fn(),
  createTaxRegions: vi.fn(),
  loadInput: vi.fn(),
  updateProductVariants: vi.fn(),
  updateRegions: vi.fn(),
  updateShippingOptions: vi.fn(),
  updateStores: vi.fn(),
  updateTaxRates: vi.fn(),
}))

vi.mock("@medusajs/medusa/core-flows", () => ({
  createRegionsWorkflow: () => ({ run: mocks.createRegions }),
  createShippingOptionsWorkflow: () => ({
    run: mocks.createShippingOptions,
  }),
  createTaxRatesWorkflow: () => ({ run: mocks.createTaxRates }),
  createTaxRegionsWorkflow: () => ({ run: mocks.createTaxRegions }),
  updateProductVariantsWorkflow: () => ({
    run: mocks.updateProductVariants,
  }),
  updateRegionsWorkflow: () => ({ run: mocks.updateRegions }),
  updateShippingOptionsWorkflow: () => ({
    run: mocks.updateShippingOptions,
  }),
  updateStoresWorkflow: () => ({ run: mocks.updateStores }),
  updateTaxRatesWorkflow: () => ({ run: mocks.updateTaxRates }),
}))

vi.mock(
  "../../../../src/scripts/ro-demo-commerce/manifest",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("../../../../src/scripts/ro-demo-commerce/manifest")
      >()
    return { ...actual, loadRoDemoInput: mocks.loadInput }
  }
)

import roDemoCommerce, {
  applyRoDemoCommerce,
  buildRoDemoDatabaseFingerprint,
  buildRoDemoDatabaseInstanceFingerprint,
  inspectRoDemoCommerce,
} from "../../../../src/scripts/ro-demo-commerce/runtime"

const HASH = "b".repeat(64)
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
    deploymentIdentity: {
      backendBuildHash: "build-blue",
      backendDeploymentId: "deployment-blue",
      backendReleaseSha: "b".repeat(40),
      backendSlot: "blue",
      databaseFingerprint: buildRoDemoDatabaseFingerprint(
        args[3],
        "sc_storefront"
      ),
      databaseInstanceFingerprint: buildRoDemoDatabaseInstanceFingerprint({
        DATABASE_URL: "postgresql://medusa:secret@db-blue.internal:5432/medusa",
        RO_DEMO_DATABASE_INSTANCE_ID: "zane-postgres-primary",
      }),
      environmentId: "herbatika-production",
    },
    snapshot: args[3],
  })
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

const catalog: RoCatalogManifest = {
  categories: [],
  locale: "ro-RO",
  market: "ro",
  products: [
    {
      key: { kind: "sku", value: "4868" },
      productContent: { composition: "", other: "", usage: "", warning: "" },
      publicationStatus: "published",
      publicSlug: "befungin-tinctura-cu-extract-de-chaga-siberian",
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
            amount: 120,
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
}

const loadedInput = (
  priceAuthoritySha256 = HASH,
  commerceManifestSha256 = HASH
) => ({
  absoluteManifestPath: "/secure/ro-demo-commerce.json",
  commerceManifestSha256,
  manifest: {
    binding,
    demo: true as const,
    locale: "ro-RO" as const,
    market: "ro" as const,
    priceAuthorityPath: "./ro-prices.json",
    schemaVersion: 1 as const,
  },
  priceAuthority: catalog,
  priceAuthorityPath: "/secure/ro-prices.json",
  priceAuthoritySha256,
})

const initialSnapshot = (): RoDemoSnapshot => ({
  fulfillmentProviderIds: ["manual_manual"],
  fulfillmentSetIds: ["fuset_eu"],
  paymentProviders: [{ enabled: true, id: "pp_gopay" }],
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
      productMetadata: { ro_vat_rate: 11 },
      sku: "4868",
    },
  ],
})

const deploymentArgs = () => [
  "--expected-backend-build-hash",
  "build-blue",
  "--expected-backend-deployment-id",
  "deployment-blue",
  "--expected-backend-release-sha",
  "b".repeat(40),
  "--expected-backend-slot",
  "blue",
  "--expected-commerce-manifest-sha256",
  HASH,
  "--expected-database-fingerprint",
  buildRoDemoDatabaseFingerprint(initialSnapshot(), binding.salesChannelId),
  "--expected-database-instance-fingerprint",
  buildRoDemoDatabaseInstanceFingerprint({
    DATABASE_URL: "postgresql://medusa:secret@db-blue.internal:5432/medusa",
    RO_DEMO_DATABASE_INSTANCE_ID: "zane-postgres-primary",
  }),
  "--expected-environment-id",
  "herbatika-production",
  "--expected-price-authority-sha256",
  HASH,
  "--expected-sk-commerce-baseline-sha256",
  hashSkCommerceBaseline(initialSnapshot()),
]

type HarnessOptions = Readonly<{
  damageSkOnHandoff?: boolean
  damageSkOnPriceWrite?: boolean
}>

const createHarness = (options: HarnessOptions = {}) => {
  const state = { snapshot: initialSnapshot() }
  const events: string[] = []
  const logger = { info: vi.fn(), warn: vi.fn() }

  const replaceSnapshot = (patch: Partial<RoDemoSnapshot>) => {
    state.snapshot = { ...state.snapshot, ...patch }
  }

  const query = {
    graph: vi.fn(async ({ entity }: Readonly<{ entity: string }>) => {
      const snapshot = state.snapshot
      switch (entity) {
        case "region":
          return {
            data: snapshot.regions.map((region) => ({
              countries: region.countryCodes.map((iso_2) => ({ iso_2 })),
              currency_code: region.currencyCode,
              id: region.id,
              is_tax_inclusive: region.isTaxInclusive,
              metadata: region.metadata,
              name: region.name,
              payment_providers: region.paymentProviderIds.map((id) => ({
                id,
              })),
            })),
          }
        case "payment_provider":
          return {
            data: snapshot.paymentProviders.map((provider) => ({
              id: provider.id,
              is_enabled: provider.enabled,
            })),
          }
        case "price_preference":
          return {
            data: snapshot.pricePreferences.map((preference) => ({
              attribute: preference.attribute,
              id: preference.id,
              is_tax_inclusive: preference.isTaxInclusive,
              value: preference.value,
            })),
          }
        case "sales_channel":
          return { data: snapshot.salesChannelIds.map((id) => ({ id })) }
        case "fulfillment_provider":
          return {
            data: snapshot.fulfillmentProviderIds.map((id) => ({ id })),
          }
        case "fulfillment_set":
          return {
            data: snapshot.fulfillmentSetIds.map((id) => ({ id })),
          }
        case "shipping_profile":
          return {
            data: snapshot.shippingProfileIds.map((id) => ({ id })),
          }
        case "store":
          return {
            data: snapshot.stores.map((store) => ({
              id: store.id,
              supported_currencies: store.supportedCurrencies.map(
                (currency) => ({
                  currency_code: currency.currencyCode,
                  is_default: currency.isDefault,
                })
              ),
            })),
          }
        case "service_zone":
          return {
            data: snapshot.serviceZones.map((zone) => ({
              fulfillment_set_id: zone.fulfillmentSetId,
              geo_zones: zone.countryCodes.map((country_code) => ({
                country_code,
              })),
              id: zone.id,
              name: zone.name,
            })),
          }
        case "shipping_option":
          return {
            data: snapshot.shippingOptions.map((option) => ({
              data: { source: option.source },
              id: option.id,
              type: { code: option.code, id: `type_${option.id}` },
            })),
          }
        case "tax_region":
          return {
            data: snapshot.taxRegions.map((region) => ({
              country_code: region.countryCode,
              id: region.id,
            })),
          }
        case "tax_rate":
          return {
            data: snapshot.taxRates.map((rate) => ({
              id: rate.id,
              is_default: rate.isDefault,
              metadata: rate.metadata,
              rate: rate.rate,
              rules: rate.productIds.map((reference_id) => ({
                reference: "product",
                reference_id,
              })),
              tax_region_id: rate.taxRegionId,
            })),
          }
        case "product_variant":
          return {
            data: snapshot.variants.map((variant) => ({
              ean: variant.ean,
              id: variant.id,
              metadata: variant.metadata,
              prices: variant.prices.map((price) => ({
                amount: price.amount,
                currency_code: price.currencyCode,
                id: price.id,
                max_quantity: price.maxQuantity,
                min_quantity: price.minQuantity,
                price_list_id: price.priceListId,
                price_rules: price.rules,
              })),
              product: {
                id: variant.productId,
                metadata: variant.productMetadata,
              },
              product_id: variant.productId,
              sku: variant.sku,
            })),
          }
        default:
          throw new Error(`unexpected query entity ${entity}`)
      }
    }),
  }

  const pricing = {
    createPricePreferences: vi.fn(
      async (
        input: Readonly<{
          attribute: "currency_code" | "region_id"
          is_tax_inclusive: boolean
          value: string
        }>
      ) => {
        events.push(`preference:create:${input.attribute}`)
        replaceSnapshot({
          pricePreferences: [
            ...state.snapshot.pricePreferences,
            {
              attribute: input.attribute,
              id: `pref_${input.attribute}`,
              isTaxInclusive: input.is_tax_inclusive,
              value: input.value,
            },
          ],
        })
      }
    ),
    listPricePreferences: vi.fn(
      async (filter: Readonly<{ attribute: string; value: string }>) =>
        state.snapshot.pricePreferences
          .filter(
            (preference) =>
              preference.attribute === filter.attribute &&
              preference.value === filter.value
          )
          .map((preference) => ({
            id: preference.id,
            is_tax_inclusive: preference.isTaxInclusive,
          }))
    ),
    updatePricePreferences: vi.fn(
      async (
        selector: Readonly<{ id: string }>,
        update: Readonly<{ is_tax_inclusive: boolean }>
      ) => {
        events.push("preference:update")
        replaceSnapshot({
          pricePreferences: state.snapshot.pricePreferences.map((preference) =>
            preference.id === selector.id
              ? {
                  ...preference,
                  isTaxInclusive: update.is_tax_inclusive,
                }
              : preference
          ),
        })
      }
    ),
  }

  const fulfillment = {
    createServiceZones: vi.fn(
      async (
        input: Readonly<{
          fulfillment_set_id: string
          geo_zones: readonly Readonly<{ country_code: string }>[]
          name: string
        }>
      ) => {
        events.push("service-zone:create")
        const id = "serzo_ro"
        replaceSnapshot({
          serviceZones: [
            ...state.snapshot.serviceZones,
            {
              countryCodes: input.geo_zones.map((zone) => zone.country_code),
              fulfillmentSetId: input.fulfillment_set_id,
              id,
              name: input.name,
            },
          ],
        })
        return { id }
      }
    ),
  }

  const regionModule = {
    upsertRegions: vi.fn(
      async (
        updates: readonly Readonly<{
          countries?: readonly string[]
          id?: string
        }>[]
      ) => {
        events.push("region:country-handoff")
        replaceSnapshot({
          regions: state.snapshot.regions.map((existing) => {
            const update = updates.find(({ id }) => id === existing.id)
            return update?.countries
              ? { ...existing, countryCodes: update.countries }
              : existing
          }),
        })
        if (
          options.damageSkOnHandoff &&
          updates.some(({ countries }) => countries?.includes("ro"))
        ) {
          replaceSnapshot({
            variants: state.snapshot.variants.map((variant) => ({
              ...variant,
              prices: variant.prices.map((price) =>
                price.currencyCode === "eur"
                  ? { ...price, amount: price.amount + 1 }
                  : price
              ),
            })),
          })
        }
        return []
      }
    ),
  }

  mocks.updateStores.mockImplementation(
    async ({ input }: Readonly<{ input: Record<string, unknown> }>) => {
      events.push("store:update")
      const update = input.update as {
        supported_currencies: readonly Readonly<{
          currency_code: string
          is_default: boolean
        }>[]
      }
      replaceSnapshot({
        stores: state.snapshot.stores.map((store) => ({
          ...store,
          supportedCurrencies: update.supported_currencies.map((currency) => ({
            currencyCode: currency.currency_code,
            isDefault: currency.is_default,
          })),
        })),
      })
    }
  )
  mocks.updateRegions.mockImplementation(
    async ({ input }: Readonly<{ input: Record<string, unknown> }>) => {
      const selector = input.selector as { id: string }
      const update = input.update as Record<string, unknown>
      events.push(`region:update:${selector.id}`)
      replaceSnapshot({
        regions: state.snapshot.regions.map((region) =>
          region.id === selector.id
            ? {
                ...region,
                countryCodes:
                  (update.countries as readonly string[] | undefined) ??
                  region.countryCodes,
                currencyCode:
                  (update.currency_code as string | undefined) ??
                  region.currencyCode,
                isTaxInclusive:
                  (update.is_tax_inclusive as boolean | undefined) ??
                  region.isTaxInclusive,
                metadata:
                  (update.metadata as Record<string, unknown> | undefined) ??
                  region.metadata,
                paymentProviderIds:
                  (update.payment_providers as readonly string[] | undefined) ??
                  region.paymentProviderIds,
              }
            : region
        ),
      })
    }
  )
  mocks.createRegions.mockImplementation(
    async ({ input }: Readonly<{ input: Record<string, unknown> }>) => {
      events.push("region:create")
      const region = (input.regions as readonly Record<string, unknown>[])[0]
      const id = "reg_ro"
      replaceSnapshot({
        regions: [
          ...state.snapshot.regions,
          {
            countryCodes: region.countries as readonly string[],
            currencyCode: region.currency_code as string,
            id,
            isTaxInclusive: region.is_tax_inclusive === true,
            metadata: region.metadata as Record<string, unknown>,
            name: region.name as string,
            paymentProviderIds: region.payment_providers as readonly string[],
          },
        ],
      })
      return { result: [{ id }] }
    }
  )
  mocks.createShippingOptions.mockImplementation(
    async ({
      input,
    }: Readonly<{ input: readonly Record<string, unknown>[] }>) => {
      events.push("shipping:create")
      replaceSnapshot({
        shippingOptions: [
          ...state.snapshot.shippingOptions,
          ...input.map((option, index) => ({
            code: (option.type as { code: string }).code,
            id: `ship_${index}`,
            source: (option.data as { source: string }).source,
          })),
        ],
      })
    }
  )
  mocks.updateShippingOptions.mockImplementation(async () => {
    events.push("shipping:update")
  })
  mocks.createTaxRegions.mockImplementation(async () => {
    events.push("tax-region:create")
    replaceSnapshot({
      taxRegions: [
        ...state.snapshot.taxRegions,
        { countryCode: "ro", id: "txreg_ro" },
      ],
    })
    return { result: [{ id: "txreg_ro" }] }
  })
  mocks.createTaxRates.mockImplementation(
    async ({
      input,
    }: Readonly<{ input: readonly Record<string, unknown>[] }>) => {
      events.push("tax-rates:create")
      replaceSnapshot({
        taxRates: [
          ...state.snapshot.taxRates,
          ...input.map((rate, index) => ({
            id: `txrate_${rate.rate}_${index}`,
            isDefault: rate.is_default === true,
            metadata: rate.metadata as Record<string, unknown>,
            productIds: (
              rate.rules as readonly Readonly<{
                reference_id: string
              }>[]
            ).map((rule) => rule.reference_id),
            rate: rate.rate as number,
            taxRegionId: rate.tax_region_id as string,
          })),
        ],
      })
    }
  )
  mocks.updateTaxRates.mockImplementation(async () => {
    events.push("tax-rates:update")
  })
  mocks.updateProductVariants.mockImplementation(
    async ({ input }: Readonly<{ input: Record<string, unknown> }>) => {
      events.push("variant-prices:update")
      const updates = input.product_variants as readonly Readonly<{
        id: string
        prices: readonly Readonly<{
          amount: number
          currency_code: string
          id?: string
          max_quantity?: null | number
          min_quantity?: null | number
        }>[]
      }>[]
      replaceSnapshot({
        variants: state.snapshot.variants.map((variant) => {
          const update = updates.find(
            (candidate) => candidate.id === variant.id
          )
          if (!update) {
            return variant
          }
          return {
            ...variant,
            prices: update.prices.map((price, index) => ({
              amount: price.amount,
              currencyCode: price.currency_code,
              id: price.id ?? `price_${price.currency_code}_${index}`,
              maxQuantity: price.max_quantity ?? null,
              minQuantity: price.min_quantity ?? null,
              priceListId: null,
              rules: [],
            })),
          }
        }),
      })
      if (options.damageSkOnPriceWrite) {
        replaceSnapshot({
          variants: state.snapshot.variants.map((variant) => ({
            ...variant,
            prices: variant.prices.map((price) =>
              price.currencyCode === "eur"
                ? { ...price, amount: price.amount + 1 }
                : price
            ),
          })),
        })
      }
    }
  )
  const container = {
    resolve: (key: unknown) => {
      if (key === ContainerRegistrationKeys.QUERY) {
        return query
      }
      if (key === ContainerRegistrationKeys.LOGGER) {
        return logger
      }
      if (key === Modules.PRICING) {
        return pricing
      }
      if (key === Modules.FULFILLMENT) {
        return fulfillment
      }
      if (key === Modules.REGION) {
        return regionModule
      }
      throw new Error(`unexpected container key ${String(key)}`)
    },
  } as ExecArgs["container"]

  return {
    container,
    events,
    fulfillment,
    logger,
    pricing,
    query,
    regionModule,
    state,
  }
}

const temporaryDirectories: string[] = []

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("BACKEND_BUILD_HASH", "build-blue")
  vi.stubEnv("ZANE_DEPLOYMENT_ID", "deployment-blue")
  vi.stubEnv("RELEASE_SHA", "b".repeat(40))
  vi.stubEnv("ZANE_DEPLOYMENT_SLOT", "blue")
  vi.stubEnv("RO_DEMO_ENVIRONMENT_ID", "herbatika-production")
  vi.stubEnv(
    "DATABASE_URL",
    "postgresql://medusa:secret@db-blue.internal:5432/medusa"
  )
  vi.stubEnv("RO_DEMO_DATABASE_INSTANCE_ID", "zane-postgres-primary")
  mocks.loadInput.mockResolvedValue(loadedInput())
})

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true }))
  )
})

describe("RO demo commerce runtime", () => {
  it("binds identical catalog contents to a credential-safe database instance identity", () => {
    const primary = buildRoDemoDatabaseInstanceFingerprint({
      DATABASE_URL: "postgresql://medusa:first-secret@db.internal:5432/medusa",
      RO_DEMO_DATABASE_INSTANCE_ID: "zane-postgres-primary",
    })
    expect(
      buildRoDemoDatabaseInstanceFingerprint({
        DATABASE_URL:
          "postgresql://other-user:second-secret@DB.INTERNAL/medusa",
        RO_DEMO_DATABASE_INSTANCE_ID: "zane-postgres-primary",
      })
    ).toBe(primary)
    expect(
      buildRoDemoDatabaseInstanceFingerprint({
        DATABASE_URL: "postgresql://medusa:secret@clone.internal:5432/medusa",
        RO_DEMO_DATABASE_INSTANCE_ID: "zane-postgres-clone",
      })
    ).not.toBe(primary)
    expect(() =>
      buildRoDemoDatabaseInstanceFingerprint({
        DATABASE_URL: "not-a-url-with-secret-password",
        RO_DEMO_DATABASE_INSTANCE_ID: "zane-postgres-primary",
      })
    ).toThrow("database instance identity is missing or invalid")
    try {
      buildRoDemoDatabaseInstanceFingerprint({
        DATABASE_URL: "not-a-url-with-secret-password",
        RO_DEMO_DATABASE_INSTANCE_ID: "zane-postgres-primary",
      })
    } catch (error) {
      expect(String(error)).not.toContain("secret-password")
    }
  })

  it("captures a private read-only deployment and database fingerprint", async () => {
    const harness = createHarness()
    const directory = await mkdtemp(
      join(tmpdir(), "ro-demo-commerce-fingerprint-")
    )
    temporaryDirectories.push(directory)
    const outputPath = join(directory, "deployment-fingerprint.json")

    const result = await roDemoCommerce({
      args: [
        "--capture-deployment-fingerprint",
        "--manifest",
        "/secure/ro-demo-commerce.json",
        "--fingerprint-output",
        outputPath,
        "--expected-backend-build-hash",
        "build-blue",
        "--expected-backend-deployment-id",
        "deployment-blue",
        "--expected-backend-release-sha",
        "b".repeat(40),
        "--expected-backend-slot",
        "blue",
        "--expected-commerce-manifest-sha256",
        HASH,
        "--expected-environment-id",
        "herbatika-production",
        "--expected-price-authority-sha256",
        HASH,
      ],
      container: harness.container,
    })

    expect(JSON.parse(await readFile(outputPath, "utf8"))).toMatchObject({
      commerceManifestSha256: HASH,
      counts: { products: 1, stores: 1, variants: 1 },
      deploymentIdentity: {
        databaseFingerprint: buildRoDemoDatabaseFingerprint(
          initialSnapshot(),
          binding.salesChannelId
        ),
        databaseInstanceFingerprint: buildRoDemoDatabaseInstanceFingerprint({
          DATABASE_URL:
            "postgresql://medusa:secret@db-blue.internal:5432/medusa",
          RO_DEMO_DATABASE_INSTANCE_ID: "zane-postgres-primary",
        }),
      },
      kind: "ro-demo-commerce-deployment-fingerprint",
      priceAuthoritySha256: HASH,
      salesChannelId: binding.salesChannelId,
      skCommerceBaseline: {
        count: 4,
        sha256: hashSkCommerceBaseline(initialSnapshot()),
      },
    })
    expect(result).toMatchObject({
      deploymentIdentity: {
        databaseFingerprint: buildRoDemoDatabaseFingerprint(
          initialSnapshot(),
          binding.salesChannelId
        ),
      },
    })
    expect((await stat(outputPath)).mode % 0o1000).toBe(0o600)
    expect(harness.events).toEqual([])
  })

  it("writes a canonical private dry-run artifact without commerce mutations", async () => {
    const harness = createHarness()
    const directory = await mkdtemp(join(tmpdir(), "ro-demo-commerce-runtime-"))
    temporaryDirectories.push(directory)
    const outputPath = join(directory, "reviewed-plan.json")
    const expectedPlan = buildRoDemoCommercePlan(
      catalog,
      HASH,
      binding,
      harness.state.snapshot
    )

    const result = await roDemoCommerce({
      args: [
        ...deploymentArgs(),
        "--manifest",
        "/secure/ro-demo-commerce.json",
        "--plan-output",
        outputPath,
      ],
      container: harness.container,
    })

    expect(await readFile(outputPath, "utf8")).toBe(
      serializeRoDemoCommercePlan(expectedPlan)
    )
    expect((await stat(outputPath)).mode % 0o1000).toBe(0o600)
    expect(result).toEqual({
      planHash: hashRoDemoCommercePlan(expectedPlan),
      skBaselineHash: hashSkCommerceBaseline(harness.state.snapshot),
      warnings: expectedPlan.warnings,
    })
    expect(harness.events).toEqual([])
    expect(mocks.createRegions).not.toHaveBeenCalled()
    expect(mocks.updateStores).not.toHaveBeenCalled()
    expect(mocks.createShippingOptions).not.toHaveBeenCalled()
    expect(mocks.createTaxRates).not.toHaveBeenCalled()
    expect(mocks.updateProductVariants).not.toHaveBeenCalled()
  })

  it("rejects price-authority tampering before a dry-run plan is written", async () => {
    const harness = createHarness()
    const directory = await mkdtemp(join(tmpdir(), "ro-demo-authority-dry-"))
    temporaryDirectories.push(directory)
    const outputPath = join(directory, "reviewed-plan.json")
    mocks.loadInput.mockResolvedValueOnce(loadedInput("c".repeat(64)))

    await expect(
      roDemoCommerce({
        args: [
          ...deploymentArgs(),
          "--manifest",
          "/secure/ro-demo-commerce.json",
          "--plan-output",
          outputPath,
        ],
        container: harness.container,
      })
    ).rejects.toThrow(
      "price authority bytes do not match the externally reviewed SHA-256"
    )

    await expect(stat(outputPath)).rejects.toMatchObject({ code: "ENOENT" })
    expect(harness.events).toEqual([])
  })

  it("rejects commerce-manifest tampering before a dry-run plan is written", async () => {
    const harness = createHarness()
    const directory = await mkdtemp(join(tmpdir(), "ro-demo-manifest-dry-"))
    temporaryDirectories.push(directory)
    const outputPath = join(directory, "reviewed-plan.json")
    mocks.loadInput.mockResolvedValueOnce(loadedInput(HASH, "c".repeat(64)))

    await expect(
      roDemoCommerce({
        args: [
          ...deploymentArgs(),
          "--manifest",
          "/secure/ro-demo-commerce.json",
          "--plan-output",
          outputPath,
        ],
        container: harness.container,
      })
    ).rejects.toThrow(
      "commerce manifest bytes do not match the externally reviewed SHA-256"
    )

    await expect(stat(outputPath)).rejects.toMatchObject({ code: "ENOENT" })
    expect(harness.events).toEqual([])
  })

  it("rejects non-RON commerce drift from the pre-deployment fingerprint", async () => {
    const harness = createHarness()
    const directory = await mkdtemp(join(tmpdir(), "ro-demo-sk-baseline-"))
    temporaryDirectories.push(directory)
    const outputPath = join(directory, "reviewed-plan.json")
    harness.state.snapshot = {
      ...harness.state.snapshot,
      variants: harness.state.snapshot.variants.map((variant) => ({
        ...variant,
        prices: variant.prices.map((price) =>
          price.currencyCode === "eur" ? { ...price, amount: 25.9 } : price
        ),
      })),
    }

    await expect(
      roDemoCommerce({
        args: [
          ...deploymentArgs(),
          "--manifest",
          "/secure/ro-demo-commerce.json",
          "--plan-output",
          outputPath,
        ],
        container: harness.container,
      })
    ).rejects.toThrow(
      "SK commerce baseline does not match the pre-deployment fingerprint"
    )

    await expect(stat(outputPath)).rejects.toMatchObject({ code: "ENOENT" })
    expect(harness.events).toEqual([])
  })

  it("rejects a canonical authority replay changed after review before apply writes", async () => {
    const harness = createHarness()
    const directory = await mkdtemp(join(tmpdir(), "ro-demo-authority-apply-"))
    temporaryDirectories.push(directory)
    const planOutputPath = join(directory, "reviewed-plan.json")
    const restoreOutputPath = join(directory, "restore.json")
    const receiptOutputPath = join(directory, "receipt.json")
    const dryRun = await roDemoCommerce({
      args: [
        ...deploymentArgs(),
        "--manifest",
        "/secure/ro-demo-commerce.json",
        "--plan-output",
        planOutputPath,
      ],
      container: harness.container,
    })
    mocks.loadInput
      .mockResolvedValueOnce(loadedInput())
      .mockResolvedValueOnce(loadedInput("c".repeat(64)))

    await expect(
      roDemoCommerce({
        args: [
          ...deploymentArgs(),
          "--manifest",
          "/secure/ro-demo-commerce.json",
          "--plan-output",
          planOutputPath,
          "--apply",
          "--demo",
          "--confirm-plan-hash",
          dryRun.planHash,
          "--restore-output",
          restoreOutputPath,
          "--receipt-output",
          receiptOutputPath,
        ],
        container: harness.container,
      })
    ).rejects.toThrow(
      "price authority bytes do not match the externally reviewed SHA-256"
    )

    await expect(stat(restoreOutputPath)).rejects.toMatchObject({
      code: "ENOENT",
    })
    await expect(stat(receiptOutputPath)).rejects.toMatchObject({
      code: "ENOENT",
    })
    expect(harness.events).toEqual([])
  })

  it("rejects a commerce-manifest replay changed after review before apply writes", async () => {
    const harness = createHarness()
    const directory = await mkdtemp(join(tmpdir(), "ro-demo-manifest-apply-"))
    temporaryDirectories.push(directory)
    const planOutputPath = join(directory, "reviewed-plan.json")
    const restoreOutputPath = join(directory, "restore.json")
    const receiptOutputPath = join(directory, "receipt.json")
    const dryRun = await roDemoCommerce({
      args: [
        ...deploymentArgs(),
        "--manifest",
        "/secure/ro-demo-commerce.json",
        "--plan-output",
        planOutputPath,
      ],
      container: harness.container,
    })
    mocks.loadInput
      .mockResolvedValueOnce(loadedInput())
      .mockResolvedValueOnce(loadedInput(HASH, "c".repeat(64)))

    await expect(
      roDemoCommerce({
        args: [
          ...deploymentArgs(),
          "--manifest",
          "/secure/ro-demo-commerce.json",
          "--plan-output",
          planOutputPath,
          "--apply",
          "--demo",
          "--confirm-plan-hash",
          dryRun.planHash,
          "--restore-output",
          restoreOutputPath,
          "--receipt-output",
          receiptOutputPath,
        ],
        container: harness.container,
      })
    ).rejects.toThrow(
      "commerce manifest bytes do not match the externally reviewed SHA-256"
    )

    await expect(stat(restoreOutputPath)).rejects.toMatchObject({
      code: "ENOENT",
    })
    await expect(stat(receiptOutputPath)).rejects.toMatchObject({
      code: "ENOENT",
    })
    expect(harness.events).toEqual([])
  })

  it("re-loads reviewed input and emits no-clobber restore and apply receipt artifacts", async () => {
    const harness = createHarness()
    const directory = await mkdtemp(join(tmpdir(), "ro-demo-commerce-apply-"))
    temporaryDirectories.push(directory)
    const planOutputPath = join(directory, "reviewed-plan.json")
    const restoreOutputPath = join(directory, "restore.json")
    const receiptOutputPath = join(directory, "receipt.json")
    const dryRun = await roDemoCommerce({
      args: [
        ...deploymentArgs(),
        "--manifest",
        "/secure/ro-demo-commerce.json",
        "--plan-output",
        planOutputPath,
      ],
      container: harness.container,
    })

    await roDemoCommerce({
      args: [
        ...deploymentArgs(),
        "--manifest",
        "/secure/ro-demo-commerce.json",
        "--plan-output",
        planOutputPath,
        "--apply",
        "--demo",
        "--confirm-plan-hash",
        dryRun.planHash,
        "--restore-output",
        restoreOutputPath,
        "--receipt-output",
        receiptOutputPath,
      ],
      container: harness.container,
    })

    expect(mocks.loadInput).toHaveBeenCalledTimes(3)
    const restoreBytes = await readFile(restoreOutputPath, "utf8")
    const receiptBytes = await readFile(receiptOutputPath, "utf8")
    expect(parseRoDemoRestoreArtifact(restoreBytes)).toMatchObject({
      kind: "ro-demo-commerce-restore",
      planHash: dryRun.planHash,
      snapshot: { regions: initialSnapshot().regions },
    })
    expect(parseRoDemoApplyReceipt(receiptBytes)).toMatchObject({
      kind: "ro-demo-commerce-apply-receipt",
      planHash: dryRun.planHash,
      postState: {
        regionId: "reg_ro",
        serviceZoneId: "serzo_ro",
        variantPrices: [
          {
            amount: 120,
            productId: "prod_befungin",
            variantId: "variant_befungin",
          },
        ],
      },
      restoreArtifactSha256: sha256RoDemoArtifactBytes(restoreBytes),
    })
    expect(() =>
      parseRoDemoApplyReceipt(
        receiptBytes.replace('"amount":120', '"amount":121')
      )
    ).toThrow("postStateSha256")
    expect((await stat(restoreOutputPath)).mode % 0o1000).toBe(0o600)
    expect((await stat(receiptOutputPath)).mode % 0o1000).toBe(0o600)
  })

  it("fails before mutation when an apply artifact target already exists", async () => {
    const harness = createHarness()
    const directory = await mkdtemp(join(tmpdir(), "ro-demo-commerce-clobber-"))
    temporaryDirectories.push(directory)
    const planOutputPath = join(directory, "reviewed-plan.json")
    const restoreOutputPath = join(directory, "restore.json")
    const receiptOutputPath = join(directory, "receipt.json")
    const dryRun = await roDemoCommerce({
      args: [
        ...deploymentArgs(),
        "--manifest",
        "/secure/ro-demo-commerce.json",
        "--plan-output",
        planOutputPath,
      ],
      container: harness.container,
    })
    await writeFile(receiptOutputPath, "do-not-overwrite", { mode: 0o600 })

    await expect(
      roDemoCommerce({
        args: [
          ...deploymentArgs(),
          "--manifest",
          "/secure/ro-demo-commerce.json",
          "--plan-output",
          planOutputPath,
          "--apply",
          "--demo",
          "--confirm-plan-hash",
          dryRun.planHash,
          "--restore-output",
          restoreOutputPath,
          "--receipt-output",
          receiptOutputPath,
        ],
        container: harness.container,
      })
    ).rejects.toMatchObject({ code: "EEXIST" })

    expect(await readFile(receiptOutputPath, "utf8")).toBe("do-not-overwrite")
    expect(harness.events).toEqual([])
  })

  it("fails before restore or mutation when the deployment identity is wrong", async () => {
    const harness = createHarness()
    const directory = await mkdtemp(join(tmpdir(), "ro-demo-commerce-env-"))
    temporaryDirectories.push(directory)
    const planOutputPath = join(directory, "reviewed-plan.json")
    const restoreOutputPath = join(directory, "restore.json")
    const receiptOutputPath = join(directory, "receipt.json")
    const dryRun = await roDemoCommerce({
      args: [
        ...deploymentArgs(),
        "--manifest",
        "/secure/ro-demo-commerce.json",
        "--plan-output",
        planOutputPath,
      ],
      container: harness.container,
    })
    vi.stubEnv("ZANE_DEPLOYMENT_ID", "wrong-deployment")

    await expect(
      roDemoCommerce({
        args: [
          ...deploymentArgs(),
          "--manifest",
          "/secure/ro-demo-commerce.json",
          "--plan-output",
          planOutputPath,
          "--apply",
          "--demo",
          "--confirm-plan-hash",
          dryRun.planHash,
          "--restore-output",
          restoreOutputPath,
          "--receipt-output",
          receiptOutputPath,
        ],
        container: harness.container,
      })
    ).rejects.toThrow(
      "observed environment/build/database does not match the reviewed deployment"
    )

    await expect(stat(restoreOutputPath)).rejects.toMatchObject({
      code: "ENOENT",
    })
    await expect(stat(receiptOutputPath)).rejects.toMatchObject({
      code: "ENOENT",
    })
    expect(harness.events).toEqual([])
  })

  it("rejects an exact-content database clone with a different instance identity", async () => {
    const harness = createHarness()
    const directory = await mkdtemp(join(tmpdir(), "ro-demo-commerce-clone-"))
    temporaryDirectories.push(directory)
    const planOutputPath = join(directory, "reviewed-plan.json")
    const restoreOutputPath = join(directory, "restore.json")
    const receiptOutputPath = join(directory, "receipt.json")
    const dryRun = await roDemoCommerce({
      args: [
        ...deploymentArgs(),
        "--manifest",
        "/secure/ro-demo-commerce.json",
        "--plan-output",
        planOutputPath,
      ],
      container: harness.container,
    })
    vi.stubEnv("RO_DEMO_DATABASE_INSTANCE_ID", "zane-postgres-clone")

    await expect(
      roDemoCommerce({
        args: [
          ...deploymentArgs(),
          "--manifest",
          "/secure/ro-demo-commerce.json",
          "--plan-output",
          planOutputPath,
          "--apply",
          "--demo",
          "--confirm-plan-hash",
          dryRun.planHash,
          "--restore-output",
          restoreOutputPath,
          "--receipt-output",
          receiptOutputPath,
        ],
        container: harness.container,
      })
    ).rejects.toThrow(
      "observed environment/build/database does not match the reviewed deployment"
    )

    await expect(stat(restoreOutputPath)).rejects.toMatchObject({
      code: "ENOENT",
    })
    await expect(stat(receiptOutputPath)).rejects.toMatchObject({
      code: "ENOENT",
    })
    expect(harness.events).toEqual([])
  })

  it("stages RO without a country and transfers Romania atomically after all dependent writes", async () => {
    const harness = createHarness()
    const plan = buildRoDemoCommercePlan(
      catalog,
      HASH,
      binding,
      harness.state.snapshot
    )
    const baseline = hashSkCommerceBaseline(harness.state.snapshot)

    await expect(
      applyRoDemoCommerce(harness.container, plan, baseline)
    ).resolves.toEqual({
      actualSkBaselineHash: baseline,
      regionId: "reg_ro",
      serviceZoneId: "serzo_ro",
    })

    expect(harness.events).toEqual([
      "store:update",
      "region:create",
      "preference:create:currency_code",
      "preference:create:region_id",
      "service-zone:create",
      "shipping:create",
      "tax-region:create",
      "tax-rates:create",
      "variant-prices:update",
      "region:country-handoff",
    ])
    expect(harness.regionModule.upsertRegions).toHaveBeenCalledWith([
      { countries: ["sk"], id: "reg_europe" },
      { countries: ["ro"], id: "reg_ro" },
    ])
    expect(hashSkCommerceBaseline(harness.state.snapshot)).toBe(baseline)
    expect(
      harness.state.snapshot.variants[0]?.prices.find(
        (price) => price.currencyCode === "ron"
      )?.amount
    ).toBe(120)
  })

  it("stops before tax and product prices after a shipping failure", async () => {
    const harness = createHarness()
    const plan = buildRoDemoCommercePlan(
      catalog,
      HASH,
      binding,
      harness.state.snapshot
    )
    mocks.createShippingOptions.mockRejectedValueOnce(
      new Error("shipping provider unavailable")
    )

    await expect(
      applyRoDemoCommerce(
        harness.container,
        plan,
        hashSkCommerceBaseline(harness.state.snapshot)
      )
    ).rejects.toThrow("shipping provider unavailable")

    expect(mocks.createTaxRegions).not.toHaveBeenCalled()
    expect(mocks.createTaxRates).not.toHaveBeenCalled()
    expect(mocks.updateProductVariants).not.toHaveBeenCalled()
    expect(harness.events).toEqual([
      "store:update",
      "region:create",
      "preference:create:currency_code",
      "preference:create:region_id",
      "service-zone:create",
    ])
  })

  it("fails the postcondition when a workflow changes an SK-protected EUR price", async () => {
    const harness = createHarness({ damageSkOnPriceWrite: true })
    const plan = buildRoDemoCommercePlan(
      catalog,
      HASH,
      binding,
      harness.state.snapshot
    )
    const baseline = hashSkCommerceBaseline(harness.state.snapshot)

    await expect(
      applyRoDemoCommerce(harness.container, plan, baseline)
    ).rejects.toThrow("SK commerce baseline changed before RO handoff")
    expect(harness.regionModule.upsertRegions).not.toHaveBeenCalled()
  })

  it("atomically returns Romania to its original region after a post-handoff failure", async () => {
    const harness = createHarness({ damageSkOnHandoff: true })
    const plan = buildRoDemoCommercePlan(
      catalog,
      HASH,
      binding,
      harness.state.snapshot
    )

    await expect(
      applyRoDemoCommerce(
        harness.container,
        plan,
        hashSkCommerceBaseline(harness.state.snapshot)
      )
    ).rejects.toThrow("SK commerce baseline changed")

    expect(harness.regionModule.upsertRegions).toHaveBeenCalledTimes(2)
    expect(
      harness.state.snapshot.regions.find(({ id }) => id === "reg_europe")
        ?.countryCodes
    ).toEqual(["sk", "ro"])
    expect(
      harness.state.snapshot.regions.find(({ id }) => id === "reg_ro")
        ?.countryCodes
    ).toEqual([])
  })

  it("reconciles a second run without duplicate resources or repeated price writes", async () => {
    const harness = createHarness()
    const baseline = hashSkCommerceBaseline(harness.state.snapshot)
    const firstPlan = buildRoDemoCommercePlan(
      catalog,
      HASH,
      binding,
      harness.state.snapshot
    )
    await applyRoDemoCommerce(harness.container, firstPlan, baseline)
    const afterFirst = await inspectRoDemoCommerce(harness.container)
    const secondPlan = buildRoDemoCommercePlan(
      catalog,
      HASH,
      binding,
      afterFirst
    )

    await expect(
      applyRoDemoCommerce(harness.container, secondPlan, baseline)
    ).resolves.toMatchObject({ actualSkBaselineHash: baseline })

    expect(mocks.createRegions).toHaveBeenCalledTimes(1)
    expect(mocks.createShippingOptions).toHaveBeenCalledTimes(1)
    expect(mocks.createTaxRegions).toHaveBeenCalledTimes(1)
    expect(mocks.createTaxRates).toHaveBeenCalledTimes(1)
    expect(mocks.updateProductVariants).toHaveBeenCalledTimes(1)
    expect(harness.state.snapshot.regions).toHaveLength(2)
    expect(harness.state.snapshot.shippingOptions).toHaveLength(3)
    expect(harness.state.snapshot.taxRegions).toHaveLength(1)
    expect(harness.state.snapshot.taxRates).toHaveLength(2)
  })
})

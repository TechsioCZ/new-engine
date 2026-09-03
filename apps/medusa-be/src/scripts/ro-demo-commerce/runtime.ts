import { link, open, readFile, rename, unlink } from "node:fs/promises"
import type {
  ExecArgs,
  IFulfillmentModuleService,
  IPricingModuleService,
  IRegionModuleService,
  Logger,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  createRegionsWorkflow,
  createShippingOptionsWorkflow,
  createTaxRatesWorkflow,
  createTaxRegionsWorkflow,
  updateProductVariantsWorkflow,
  updateRegionsWorkflow,
  updateShippingOptionsWorkflow,
  updateStoresWorkflow,
  updateTaxRatesWorkflow,
} from "@medusajs/medusa/core-flows"
import {
  type RoDemoApplyReceipt,
  type RoDemoRestoreArtifact,
  serializeRoDemoArtifact,
  sha256RoDemoArtifactBytes,
} from "./artifacts"
import {
  loadRoDemoInput,
  parseRoDemoCliOptions,
  parseRoDemoFingerprintCliOptions,
} from "./manifest"
import {
  buildRoDemoCommercePlan,
  buildSkCommerceBaselineFingerprint,
  hashRoDemoCommercePlan,
  hashSkCommerceBaseline,
  serializeRoDemoCommercePlan,
} from "./planner"
import {
  RO_DEMO_SOURCE,
  type RoDemoCommercePlan,
  type RoDemoDeploymentIdentity,
  type RoDemoSnapshot,
} from "./types"

type QueryService = Readonly<{
  graph: <T>(
    input: Readonly<{
      entity: string
      fields: readonly string[]
      filters?: Readonly<Record<string, unknown>>
      pagination?: Readonly<{ skip?: number; take: number }>
    }>
  ) => Promise<Readonly<{ data?: T[] }>>
}>

const PAGE_SIZE = 500
const DATABASE_INSTANCE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/

export const buildRoDemoDatabaseInstanceFingerprint = (
  environment: NodeJS.ProcessEnv
) => {
  try {
    const databaseUrl = environment.DATABASE_URL
    const databaseInstanceId = environment.RO_DEMO_DATABASE_INSTANCE_ID
    if (!(databaseUrl && databaseInstanceId)) {
      throw new Error("missing database identity")
    }
    if (!DATABASE_INSTANCE_ID.test(databaseInstanceId)) {
      throw new Error("invalid database instance id")
    }
    const parsed = new URL(databaseUrl)
    if (
      (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") ||
      !parsed.hostname
    ) {
      throw new Error("invalid database endpoint")
    }
    const encodedDatabaseName = parsed.pathname.slice(1)
    if (!encodedDatabaseName || encodedDatabaseName.includes("/")) {
      throw new Error("invalid database name")
    }
    const databaseName = decodeURIComponent(encodedDatabaseName)
    if (!databaseName) {
      throw new Error("invalid database name")
    }
    return sha256RoDemoArtifactBytes(
      serializeRoDemoArtifact({
        databaseInstanceId,
        databaseName,
        host: parsed.hostname.toLowerCase(),
        port: parsed.port || "5432",
        protocol: "postgresql",
      })
    )
  } catch {
    throw new Error("database instance identity is missing or invalid")
  }
}

export const buildRoDemoDatabaseFingerprint = (
  snapshot: RoDemoSnapshot,
  salesChannelId: string
) =>
  sha256RoDemoArtifactBytes(
    serializeRoDemoArtifact({
      moduleIdentity: "medusa-v2:product-variant-inventory",
      productIds: [
        ...new Set(snapshot.variants.map(({ productId }) => productId)),
      ].sort(),
      salesChannelId,
      storeIds: snapshot.stores.map(({ id }) => id).sort(),
      variantIds: snapshot.variants.map(({ id }) => id).sort(),
    })
  )

export const assertRoDemoDeploymentIdentity = (
  expected: RoDemoDeploymentIdentity,
  snapshot: RoDemoSnapshot,
  salesChannelId: string,
  environment: NodeJS.ProcessEnv
) => {
  const observed = {
    backendBuildHash: environment.BACKEND_BUILD_HASH,
    backendDeploymentId: environment.ZANE_DEPLOYMENT_ID,
    backendReleaseSha: environment.RELEASE_SHA,
    backendSlot: environment.ZANE_DEPLOYMENT_SLOT,
    databaseFingerprint: buildRoDemoDatabaseFingerprint(
      snapshot,
      salesChannelId
    ),
    databaseInstanceFingerprint:
      buildRoDemoDatabaseInstanceFingerprint(environment),
    environmentId: environment.RO_DEMO_ENVIRONMENT_ID,
  }
  if (
    Object.entries(expected).some(
      ([key, value]) => observed[key as keyof typeof observed] !== value
    )
  ) {
    throw new Error(
      "observed environment/build/database does not match the reviewed deployment"
    )
  }
  return expected
}

const assertExpectedPriceAuthority = (
  actualSha256: string,
  expectedSha256: string
) => {
  if (actualSha256 !== expectedSha256) {
    throw new Error(
      "price authority bytes do not match the externally reviewed SHA-256"
    )
  }
}

const assertExpectedCommerceManifest = (
  actualSha256: string,
  expectedSha256: string
) => {
  if (actualSha256 !== expectedSha256) {
    throw new Error(
      "commerce manifest bytes do not match the externally reviewed SHA-256"
    )
  }
}

const assertExpectedSkCommerceBaseline = (
  snapshot: RoDemoSnapshot,
  expectedSha256: string
) => {
  if (hashSkCommerceBaseline(snapshot) !== expectedSha256) {
    throw new Error(
      "SK commerce baseline does not match the pre-deployment fingerprint"
    )
  }
}
const stringValue = (value: unknown, label: string) => {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} is invalid`)
  }
  return value
}
const objectValue = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}

const readPaged = async <Value>(
  query: QueryService,
  input: Readonly<{
    entity: string
    fields: readonly string[]
    filters?: Readonly<Record<string, unknown>>
  }>
) => {
  const rows: Value[] = []
  for (let skip = 0; ; skip += PAGE_SIZE) {
    const { data = [] } = await query.graph<Value>({
      ...input,
      pagination: { skip, take: PAGE_SIZE },
    })
    rows.push(...data)
    if (data.length < PAGE_SIZE) {
      return rows
    }
  }
}

export const inspectRoDemoCommerce = async (
  container: ExecArgs["container"]
): Promise<RoDemoSnapshot> => {
  const query = container.resolve<QueryService>(ContainerRegistrationKeys.QUERY)
  const [
    regions,
    paymentProviders,
    pricePreferences,
    salesChannels,
    fulfillmentProviders,
    fulfillmentSets,
    shippingProfiles,
    stores,
    serviceZones,
    shippingOptions,
    taxRegions,
    taxRates,
    variants,
  ] = await Promise.all([
    readPaged<{
      countries?: readonly { iso_2?: unknown }[]
      currency_code?: unknown
      id?: unknown
      is_tax_inclusive?: unknown
      metadata?: unknown
      name?: unknown
      payment_providers?: readonly { id?: unknown }[]
    }>(query, {
      entity: "region",
      fields: [
        "id",
        "name",
        "currency_code",
        "is_tax_inclusive",
        "metadata",
        "countries.iso_2",
        "payment_providers.id",
      ],
    }),
    readPaged<{ id?: unknown; is_enabled?: unknown }>(query, {
      entity: "payment_provider",
      fields: ["id", "is_enabled"],
    }),
    readPaged<{
      attribute?: unknown
      id?: unknown
      is_tax_inclusive?: unknown
      value?: unknown
    }>(query, {
      entity: "price_preference",
      fields: ["id", "attribute", "value", "is_tax_inclusive"],
    }),
    readPaged<{ id?: unknown }>(query, {
      entity: "sales_channel",
      fields: ["id"],
    }),
    readPaged<{ id?: unknown }>(query, {
      entity: "fulfillment_provider",
      fields: ["id"],
    }),
    readPaged<{ id?: unknown }>(query, {
      entity: "fulfillment_set",
      fields: ["id"],
    }),
    readPaged<{ id?: unknown }>(query, {
      entity: "shipping_profile",
      fields: ["id"],
    }),
    readPaged<{
      id?: unknown
      supported_currencies?: readonly {
        currency_code?: unknown
        is_default?: unknown
      }[]
    }>(query, {
      entity: "store",
      fields: [
        "id",
        "supported_currencies.currency_code",
        "supported_currencies.is_default",
      ],
    }),
    readPaged<{
      fulfillment_set_id?: unknown
      geo_zones?: readonly { country_code?: unknown }[]
      id?: unknown
      name?: unknown
    }>(query, {
      entity: "service_zone",
      fields: ["id", "name", "fulfillment_set_id", "geo_zones.country_code"],
    }),
    readPaged<{
      data?: unknown
      id?: unknown
      type?: { code?: unknown }
    }>(query, {
      entity: "shipping_option",
      fields: ["id", "data", "type.code"],
    }),
    readPaged<{ country_code?: unknown; id?: unknown }>(query, {
      entity: "tax_region",
      fields: ["id", "country_code"],
    }),
    readPaged<{
      id?: unknown
      is_default?: unknown
      metadata?: unknown
      rate?: unknown
      rules?: readonly { reference?: unknown; reference_id?: unknown }[]
      tax_region_id?: unknown
    }>(query, {
      entity: "tax_rate",
      fields: [
        "id",
        "rate",
        "is_default",
        "metadata",
        "tax_region_id",
        "rules.reference",
        "rules.reference_id",
      ],
    }),
    readPaged<{
      ean?: null | string
      id?: unknown
      metadata?: unknown
      prices?: readonly {
        amount?: unknown
        currency_code?: unknown
        id?: unknown
        max_quantity?: unknown
        min_quantity?: unknown
        price_list_id?: unknown
        price_rules?: readonly {
          attribute?: unknown
          operator?: unknown
          value?: unknown
        }[]
      }[]
      product?: { id?: unknown; metadata?: unknown }
      product_id?: unknown
      sku?: null | string
    }>(query, {
      entity: "product_variant",
      fields: [
        "id",
        "product_id",
        "sku",
        "ean",
        "metadata",
        "product.id",
        "product.metadata",
        "prices.id",
        "prices.amount",
        "prices.currency_code",
        "prices.price_list_id",
        "prices.min_quantity",
        "prices.max_quantity",
        "prices.price_rules.attribute",
        "prices.price_rules.operator",
        "prices.price_rules.value",
      ],
    }),
  ])

  return {
    fulfillmentProviderIds: fulfillmentProviders.map((item, index) =>
      stringValue(item.id, `fulfillment provider ${index}.id`)
    ),
    fulfillmentSetIds: fulfillmentSets.map((item, index) =>
      stringValue(item.id, `fulfillment set ${index}.id`)
    ),
    paymentProviders: paymentProviders.map((provider, index) => ({
      enabled: provider.is_enabled === true,
      id: stringValue(provider.id, `payment provider ${index}.id`),
    })),
    pricePreferences: pricePreferences.map((preference, index) => {
      if (
        preference.attribute !== "currency_code" &&
        preference.attribute !== "region_id"
      ) {
        throw new Error(`price preference ${index}.attribute is invalid`)
      }
      return {
        attribute: preference.attribute,
        id: stringValue(preference.id, `price preference ${index}.id`),
        isTaxInclusive: preference.is_tax_inclusive === true,
        value: stringValue(preference.value, `price preference ${index}.value`),
      }
    }),
    regions: regions.map((region, index) => ({
      countryCodes: (region.countries ?? []).map((country, countryIndex) =>
        stringValue(country.iso_2, `region ${index}.country ${countryIndex}`)
      ),
      currencyCode: stringValue(
        region.currency_code,
        `region ${index}.currency`
      ),
      id: stringValue(region.id, `region ${index}.id`),
      isTaxInclusive: region.is_tax_inclusive === true,
      metadata: objectValue(region.metadata),
      name: stringValue(region.name, `region ${index}.name`),
      paymentProviderIds: (region.payment_providers ?? []).map(
        (provider, providerIndex) =>
          stringValue(provider.id, `region ${index}.provider ${providerIndex}`)
      ),
    })),
    salesChannelIds: salesChannels.map((channel, index) =>
      stringValue(channel.id, `sales channel ${index}.id`)
    ),
    serviceZones: serviceZones.map((zone, index) => ({
      countryCodes: (zone.geo_zones ?? []).flatMap((geoZone) =>
        typeof geoZone.country_code === "string" ? [geoZone.country_code] : []
      ),
      fulfillmentSetId: stringValue(
        zone.fulfillment_set_id,
        `service zone ${index}.fulfillment_set_id`
      ),
      id: stringValue(zone.id, `service zone ${index}.id`),
      name: stringValue(zone.name, `service zone ${index}.name`),
    })),
    shippingOptions: shippingOptions.map((option, index) => ({
      code: stringValue(
        option.type?.code,
        `shipping option ${index}.type.code`
      ),
      id: stringValue(option.id, `shipping option ${index}.id`),
      source:
        typeof objectValue(option.data).source === "string"
          ? (objectValue(option.data).source as string)
          : null,
    })),
    shippingProfileIds: shippingProfiles.map((profile, index) =>
      stringValue(profile.id, `shipping profile ${index}.id`)
    ),
    stores: stores.map((store, index) => ({
      id: stringValue(store.id, `store ${index}.id`),
      supportedCurrencies: (store.supported_currencies ?? []).map(
        (currency, currencyIndex) => ({
          currencyCode: stringValue(
            currency.currency_code,
            `store ${index}.currency ${currencyIndex}.code`
          ).toLowerCase(),
          isDefault: currency.is_default === true,
        })
      ),
    })),
    taxRates: taxRates.map((rate, index) => ({
      id: stringValue(rate.id, `tax rate ${index}.id`),
      isDefault: rate.is_default === true,
      metadata: objectValue(rate.metadata),
      productIds: (rate.rules ?? []).flatMap((rule) =>
        rule.reference === "product" && typeof rule.reference_id === "string"
          ? [rule.reference_id]
          : []
      ),
      rate:
        typeof rate.rate === "number"
          ? rate.rate
          : Number.parseFloat(String(rate.rate)),
      taxRegionId: stringValue(
        rate.tax_region_id,
        `tax rate ${index}.tax_region_id`
      ),
    })),
    taxRegions: taxRegions.map((region, index) => ({
      countryCode: stringValue(
        region.country_code,
        `tax region ${index}.country`
      ),
      id: stringValue(region.id, `tax region ${index}.id`),
    })),
    variants: variants.map((variant, index) => ({
      ean: variant.ean ?? null,
      id: stringValue(variant.id, `variant ${index}.id`),
      metadata: objectValue(variant.metadata),
      prices: (variant.prices ?? []).map((price, priceIndex) => ({
        amount:
          typeof price.amount === "number"
            ? price.amount
            : Number.parseFloat(String(price.amount)),
        currencyCode: stringValue(
          price.currency_code,
          `variant ${index}.price ${priceIndex}.currency`
        ),
        ...(typeof price.id === "string" ? { id: price.id } : {}),
        maxQuantity:
          typeof price.max_quantity === "number" ? price.max_quantity : null,
        minQuantity:
          typeof price.min_quantity === "number" ? price.min_quantity : null,
        priceListId:
          typeof price.price_list_id === "string" ? price.price_list_id : null,
        rules: (price.price_rules ?? []).map((rule, ruleIndex) => ({
          attribute: stringValue(
            rule.attribute,
            `variant ${index}.price ${priceIndex}.rule ${ruleIndex}.attribute`
          ),
          operator: stringValue(
            rule.operator,
            `variant ${index}.price ${priceIndex}.rule ${ruleIndex}.operator`
          ),
          value: rule.value,
        })),
      })),
      productId: stringValue(
        variant.product_id ?? variant.product?.id,
        `variant ${index}.product_id`
      ),
      productMetadata: objectValue(variant.product?.metadata),
      sku: variant.sku ?? null,
    })),
  }
}

const applyStoreCurrency = async (
  container: ExecArgs["container"],
  plan: RoDemoCommercePlan
) => {
  if (plan.storeCurrency.action === "update") {
    await updateStoresWorkflow(container).run({
      input: {
        selector: { id: plan.storeCurrency.storeId },
        update: {
          supported_currencies: [
            ...plan.storeCurrency.existingCurrencies.map((currency) => ({
              currency_code: currency.currencyCode,
              is_default: currency.isDefault,
            })),
            { currency_code: "ron", is_default: false },
          ],
        },
      },
    })
  }
}

const ensureRonPricePreferences = async (
  container: ExecArgs["container"],
  plan: RoDemoCommercePlan,
  regionId: string
) => {
  const pricing = container.resolve<IPricingModuleService>(Modules.PRICING)
  const targets = [
    {
      attribute: "currency_code" as const,
      expected: plan.pricePreferences.currency,
      value: "ron",
    },
    {
      attribute: "region_id" as const,
      expected: plan.pricePreferences.region,
      value: regionId,
    },
  ]
  for (const target of targets) {
    const existing = await pricing.listPricePreferences({
      attribute: target.attribute,
      value: target.value,
    })
    if (existing.length > 1) {
      throw new Error(
        `price preference ${target.attribute}:${target.value} is ambiguous`
      )
    }
    const preference = existing[0]
    if (
      target.expected.existingId &&
      preference?.id !== target.expected.existingId
    ) {
      throw new Error(
        `price preference ${target.attribute}:${target.value} changed after preflight`
      )
    }
    if (!target.expected.existingId && preference) {
      throw new Error(
        `price preference ${target.attribute}:${target.value} appeared after preflight`
      )
    }
    if (!preference) {
      await pricing.createPricePreferences({
        attribute: target.attribute,
        is_tax_inclusive: true,
        value: target.value,
      })
    } else if (!preference.is_tax_inclusive) {
      await pricing.updatePricePreferences(
        { id: preference.id },
        { is_tax_inclusive: true }
      )
    }
  }
}

const stageRegion = async (
  container: ExecArgs["container"],
  plan: RoDemoCommercePlan
) => {
  if (plan.region.existingId) {
    await updateRegionsWorkflow(container).run({
      input: {
        selector: { id: plan.region.existingId },
        update: {
          countries: plan.region.ownsRomaniaBeforeApply ? ["ro"] : [],
          currency_code: "ron",
          is_tax_inclusive: true,
          metadata: { ...plan.region.metadata },
          payment_providers: [...plan.region.paymentProviderIds],
        },
      },
    })
    return plan.region.existingId
  }
  const { result } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          countries: [],
          currency_code: "ron",
          is_tax_inclusive: true,
          metadata: { ...plan.region.metadata },
          name: plan.region.name,
          payment_providers: [...plan.region.paymentProviderIds],
        },
      ],
    },
  })
  const id = result[0]?.id
  if (!id) {
    throw new Error("RO demo region creation returned no ID")
  }
  return id
}

const handoffRomaniaCountry = async (
  container: ExecArgs["container"],
  plan: RoDemoCommercePlan,
  regionId: string
) => {
  if (plan.region.ownsRomaniaBeforeApply) {
    return
  }
  const region = container.resolve<IRegionModuleService>(Modules.REGION)
  await region.upsertRegions([
    ...(plan.detachRomaniaFromRegion
      ? [
          {
            countries: plan.detachRomaniaFromRegion.currentCountryCodes.filter(
              (code) => code !== "ro"
            ),
            id: plan.detachRomaniaFromRegion.regionId,
          },
        ]
      : []),
    { countries: ["ro"], id: regionId },
  ])
}

const rollbackRomaniaCountryHandoff = async (
  container: ExecArgs["container"],
  plan: RoDemoCommercePlan,
  regionId: string
) => {
  if (plan.region.ownsRomaniaBeforeApply) {
    return
  }
  const region = container.resolve<IRegionModuleService>(Modules.REGION)
  await region.upsertRegions([
    { countries: [], id: regionId },
    ...(plan.detachRomaniaFromRegion
      ? [
          {
            countries: [...plan.detachRomaniaFromRegion.currentCountryCodes],
            id: plan.detachRomaniaFromRegion.regionId,
          },
        ]
      : []),
  ])
}

const applyServiceZone = async (
  container: ExecArgs["container"],
  plan: RoDemoCommercePlan
) => {
  if (plan.serviceZone.existingId) {
    return plan.serviceZone.existingId
  }
  const fulfillment = container.resolve<IFulfillmentModuleService>(
    Modules.FULFILLMENT
  )
  const zone = await fulfillment.createServiceZones({
    fulfillment_set_id: plan.binding.fulfillmentSetId,
    geo_zones: [{ country_code: "ro", type: "country" }],
    name: plan.serviceZone.name,
  })
  return zone.id
}

const shippingPayload = (
  plan: RoDemoCommercePlan,
  serviceZoneId: string,
  option: RoDemoCommercePlan["shipping"][number]
) => ({
  data: {
    demo: true,
    market_code: "ro",
    ...(option.code === "ro-demo-packeta-pickup" ? { is_pickup: true } : {}),
    ...(plan.payment.demoCheckout
      ? { ro_demo_checkout: plan.payment.demoCheckout }
      : {}),
    source: RO_DEMO_SOURCE,
  },
  name: option.label,
  price_type: "flat" as const,
  prices: [
    { amount: option.amount, currency_code: "ron" },
    ...(option.freeFrom
      ? [
          {
            amount: 0,
            currency_code: "ron",
            rules: [
              {
                attribute: "item_total",
                operator: "gte" as const,
                value: option.freeFrom,
              },
            ],
          },
        ]
      : []),
  ],
  provider_id: plan.binding.fulfillmentProviderId,
  rules: [
    { attribute: "enabled_in_store", operator: "eq" as const, value: "true" },
    { attribute: "is_return", operator: "eq" as const, value: "false" },
  ],
  service_zone_id: serviceZoneId,
  shipping_profile_id: plan.binding.shippingProfileId,
  type: {
    code: option.code,
    description: `${option.label} (configurație demo Herbatica RO)`,
    label: option.label,
  },
})

const applyShipping = async (
  container: ExecArgs["container"],
  plan: RoDemoCommercePlan,
  serviceZoneId: string
) => {
  const query = container.resolve<QueryService>(ContainerRegistrationKeys.QUERY)
  const { data = [] } = await query.graph<{
    id?: unknown
    type?: { code?: unknown; id?: unknown }
  }>({
    entity: "shipping_option",
    fields: ["id", "type.id", "type.code"],
    pagination: { take: 500 },
  })
  type ShippingPayload = ReturnType<typeof shippingPayload>
  type ShippingUpdate = Omit<ShippingPayload, "type"> & {
    id: string
    type?: undefined
    type_id: string
  }
  const creates: ShippingPayload[] = []
  const updates: ShippingUpdate[] = []
  for (const option of plan.shipping) {
    const existing = data.filter(
      (candidate) => candidate.type?.code === option.code
    )
    if (existing.length > 1) {
      throw new Error(`shipping code ${option.code} became ambiguous`)
    }
    const payload = shippingPayload(plan, serviceZoneId, option)
    const row = existing[0]
    if (
      (option.existingId && row?.id !== option.existingId) ||
      (!option.existingId && row)
    ) {
      throw new Error(`shipping code ${option.code} changed after preflight`)
    }
    if (!row) {
      creates.push(payload)
      continue
    }
    const id = stringValue(row.id, `${option.code}.id`)
    const typeId = stringValue(row.type?.id, `${option.code}.type.id`)
    updates.push({
      ...payload,
      id,
      type: undefined,
      type_id: typeId,
    })
  }
  if (creates.length) {
    await createShippingOptionsWorkflow(container).run({ input: creates })
  }
  if (updates.length) {
    await updateShippingOptionsWorkflow(container).run({ input: updates })
  }
}

const applyTax = async (
  container: ExecArgs["container"],
  plan: RoDemoCommercePlan
) => {
  let taxRegionId = plan.taxRegion.existingId
  if (!taxRegionId) {
    const { result } = await createTaxRegionsWorkflow(container).run({
      input: [{ country_code: "ro", provider_id: "tp_system" }],
    })
    taxRegionId = result[0]?.id ?? null
  }
  if (!taxRegionId) {
    throw new Error("RO tax region creation returned no ID")
  }
  const snapshot = await inspectRoDemoCommerce(container)
  const owned = snapshot.taxRates.filter(
    (rate) =>
      rate.taxRegionId === taxRegionId &&
      rate.metadata.demo_source === RO_DEMO_SOURCE
  )
  const actualOwnedEleven = owned.filter((rate) => rate.rate === 11)
  const actualOwnedTwentyOne = owned.filter((rate) => rate.rate === 21)
  if (
    actualOwnedEleven.length > 1 ||
    actualOwnedTwentyOne.length > 1 ||
    (actualOwnedEleven[0]?.id ?? null) !==
      plan.taxRates.existingOwnedElevenId ||
    (actualOwnedTwentyOne[0]?.id ?? null) !==
      plan.taxRates.existingOwnedTwentyOneId
  ) {
    throw new Error("RO demo tax rates changed after preflight")
  }
  const existingDefault = snapshot.taxRates.filter(
    (rate) => rate.taxRegionId === taxRegionId && rate.isDefault
  )
  if (
    existingDefault.length > 1 ||
    (existingDefault[0] && existingDefault[0].rate !== 21)
  ) {
    throw new Error("RO default tax rate changed after preflight")
  }
  const desired = [
    ...(existingDefault.length
      ? []
      : [
          {
            code: "ro_demo_vat_21",
            is_default: true,
            metadata: { demo_source: RO_DEMO_SOURCE, market_code: "ro" },
            name: "TVA România demo 21%",
            rate: 21,
            rules: [],
            tax_region_id: taxRegionId,
          },
        ]),
    {
      code: "ro_demo_vat_11",
      is_default: false,
      metadata: { demo_source: RO_DEMO_SOURCE, market_code: "ro" },
      name: "TVA România demo 11%",
      rate: 11,
      rules: plan.taxAssignments
        .filter((assignment) => assignment.rate === 11)
        .map((assignment) => ({
          reference: "product",
          reference_id: assignment.productId,
        })),
      tax_region_id: taxRegionId,
    },
  ]
  type DesiredTaxRate = (typeof desired)[number]
  const creates: DesiredTaxRate[] = []
  const updates: {
    selector: { id: string }
    update: DesiredTaxRate
  }[] = []
  for (const rate of desired) {
    const existing = owned.find((candidate) => candidate.rate === rate.rate)
    const action =
      rate.rate === 11
        ? plan.taxRates.elevenAction
        : plan.taxRates.twentyOneAction
    if (action === "unchanged") {
      continue
    }
    if (existing) {
      updates.push({ selector: { id: existing.id }, update: rate })
    } else {
      creates.push(rate)
    }
  }
  if (creates.length) {
    await createTaxRatesWorkflow(container).run({ input: creates })
  }
  for (const input of updates) {
    await updateTaxRatesWorkflow(container).run({ input })
  }
}

export const buildVariantPriceUpdatePayload = (
  current: RoDemoSnapshot["variants"][number],
  mutation: RoDemoCommercePlan["variantPrices"][number]
) => {
  const basePrices = current.prices.filter(
    (price) => price.priceListId === null
  )
  if (basePrices.some((price) => price.rules.length > 0)) {
    throw new Error(
      `variant ${current.id} has rule-scoped base prices; refusing unsafe merged price update`
    )
  }
  const defaultRonPrices = basePrices.filter(
    (price) =>
      price.currencyCode.toLowerCase() === "ron" &&
      price.minQuantity === null &&
      price.maxQuantity === null &&
      price.rules.length === 0
  )
  if (defaultRonPrices.length > 1) {
    throw new Error(`variant ${current.id} RON prices drifted`)
  }
  if (
    JSON.stringify(defaultRonPrices[0] ?? null) !==
    JSON.stringify(mutation.currentRonPrice)
  ) {
    throw new Error(`variant ${current.id} RON price changed after preflight`)
  }
  return {
    id: current.id,
    prices: [
      ...basePrices
        .filter((price) => price.id !== defaultRonPrices[0]?.id)
        .map((price) => ({
          ...(price.id ? { id: price.id } : {}),
          amount: price.amount,
          currency_code: price.currencyCode,
          max_quantity: price.maxQuantity,
          min_quantity: price.minQuantity,
        })),
      {
        ...(defaultRonPrices[0]?.id ? { id: defaultRonPrices[0].id } : {}),
        amount: mutation.amount,
        currency_code: "ron",
      },
    ],
  }
}

const applyVariantPrices = async (
  container: ExecArgs["container"],
  plan: RoDemoCommercePlan
) => {
  const snapshot = await inspectRoDemoCommerce(container)
  const byId = new Map(
    snapshot.variants.map((variant) => [variant.id, variant])
  )
  const changed = plan.variantPrices.filter(
    (price) => price.action !== "unchanged"
  )
  for (let index = 0; index < changed.length; index += 100) {
    const batch = changed.slice(index, index + 100).map((mutation) => {
      const current = byId.get(mutation.variantId)
      if (!current) {
        throw new Error(`variant ${mutation.variantId} disappeared`)
      }
      return buildVariantPriceUpdatePayload(current, mutation)
    })
    await updateProductVariantsWorkflow(container).run({
      input: { product_variants: batch },
    })
  }
}

export const applyRoDemoCommerce = async (
  container: ExecArgs["container"],
  plan: RoDemoCommercePlan,
  expectedSkBaselineHash: string
) => {
  await applyStoreCurrency(container, plan)
  const regionId = await stageRegion(container, plan)
  await ensureRonPricePreferences(container, plan, regionId)
  const serviceZoneId = await applyServiceZone(container, plan)
  await applyShipping(container, plan, serviceZoneId)
  await applyTax(container, plan)
  await applyVariantPrices(container, plan)
  const preHandoffSkBaselineHash = hashSkCommerceBaseline(
    await inspectRoDemoCommerce(container)
  )
  if (preHandoffSkBaselineHash !== expectedSkBaselineHash) {
    throw new Error(
      `SK commerce baseline changed before RO handoff (${expectedSkBaselineHash} -> ${preHandoffSkBaselineHash}); Romania remains on its original region`
    )
  }
  await handoffRomaniaCountry(container, plan, regionId)
  try {
    const actualSkBaselineHash = hashSkCommerceBaseline(
      await inspectRoDemoCommerce(container)
    )
    if (actualSkBaselineHash !== expectedSkBaselineHash) {
      throw new Error(
        `SK commerce baseline changed (${expectedSkBaselineHash} -> ${actualSkBaselineHash}); stop and restore from the captured preflight`
      )
    }
    return { actualSkBaselineHash, regionId, serviceZoneId }
  } catch (error) {
    await rollbackRomaniaCountryHandoff(container, plan, regionId)
    throw error
  }
}

const writePrivateArtifact = async (path: string, bytes: string) => {
  const temporaryPath = `${path}.tmp-${process.pid}-${Date.now()}`
  const handle = await open(temporaryPath, "wx", 0o600)
  let closed = false
  try {
    await handle.writeFile(bytes, "utf8")
    await handle.sync()
    await handle.close()
    closed = true
    await link(temporaryPath, path)
    await unlink(temporaryPath)
  } finally {
    if (!closed) {
      await handle.close().catch(() => {
        // Best-effort cleanup preserves the original write error.
      })
    }
    await unlink(temporaryPath).catch(() => {
      // Best-effort cleanup preserves the original write error.
    })
  }
}

const reservePrivateArtifacts = async (paths: readonly string[]) => {
  const reserved: string[] = []
  try {
    for (const path of paths) {
      const handle = await open(path, "wx", 0o600)
      await handle.close()
      reserved.push(path)
    }
  } catch (error) {
    await Promise.all(reserved.map((path) => unlink(path).catch(() => {})))
    throw error
  }
}

const writeReservedPrivateArtifact = async (path: string, bytes: string) => {
  const temporaryPath = `${path}.tmp-${process.pid}-${Date.now()}`
  const handle = await open(temporaryPath, "wx", 0o600)
  let closed = false
  try {
    await handle.writeFile(bytes, "utf8")
    await handle.sync()
    await handle.close()
    closed = true
    await rename(temporaryPath, path)
  } finally {
    if (!closed) {
      await handle.close().catch(() => {})
    }
    await unlink(temporaryPath).catch(() => {})
  }
}

export const buildRoDemoRestoreArtifact = (
  plan: RoDemoCommercePlan,
  planHash: string,
  snapshot: RoDemoSnapshot
): RoDemoRestoreArtifact => ({
  commerceManifestSha256: plan.commerceManifestSha256,
  demo: true as const,
  deploymentIdentity: plan.deploymentIdentity,
  kind: "ro-demo-commerce-restore" as const,
  market: "ro" as const,
  planHash,
  priceAuthorityKind: plan.priceAuthorityKind,
  priceAuthoritySha256: plan.priceAuthoritySha256,
  schemaVersion: 1 as const,
  snapshot,
})

export const buildRoDemoApplyReceipt = (
  input: Readonly<{
    plan: RoDemoCommercePlan
    planHash: string
    restoreArtifactSha256: string
    result: Readonly<{
      actualSkBaselineHash: string
      regionId: string
      serviceZoneId: string
    }>
    snapshot: RoDemoSnapshot
  }>
): RoDemoApplyReceipt => {
  const { plan, planHash, restoreArtifactSha256, result, snapshot } = input
  const region = snapshot.regions.find(({ id }) => id === result.regionId)
  if (
    !region ||
    region.currencyCode.toLowerCase() !== "ron" ||
    region.countryCodes.length !== 1 ||
    region.countryCodes[0] !== "ro"
  ) {
    throw new Error("post-apply RO region proof is missing or invalid")
  }
  if (
    serializeRoDemoArtifact([...region.paymentProviderIds].sort()) !==
      serializeRoDemoArtifact([...plan.payment.providerIds].sort()) ||
    serializeRoDemoArtifact(region.metadata) !==
      serializeRoDemoArtifact(plan.region.metadata)
  ) {
    throw new Error("post-apply RO payment or marker proof is invalid")
  }
  const serviceZone = snapshot.serviceZones.find(
    ({ id }) => id === result.serviceZoneId
  )
  if (
    !serviceZone ||
    serviceZone.fulfillmentSetId !== plan.binding.fulfillmentSetId ||
    serviceZone.countryCodes.length !== 1 ||
    serviceZone.countryCodes[0] !== "ro"
  ) {
    throw new Error("post-apply RO service-zone proof is invalid")
  }
  const shippingOptions = plan.shipping.map(({ code }) => {
    const matches = snapshot.shippingOptions.filter(
      (option) => option.code === code && option.source === RO_DEMO_SOURCE
    )
    if (matches.length !== 1) {
      throw new Error(`post-apply shipping proof for ${code} is ambiguous`)
    }
    const [match] = matches
    if (!match) {
      throw new Error(`post-apply shipping proof for ${code} is missing`)
    }
    return { code, id: match.id }
  })
  const taxRegions = snapshot.taxRegions.filter(
    ({ countryCode }) => countryCode.toLowerCase() === "ro"
  )
  if (taxRegions.length !== 1) {
    throw new Error("post-apply RO tax-region proof is ambiguous")
  }
  const [taxRegion] = taxRegions
  if (!taxRegion) {
    throw new Error("post-apply RO tax-region proof is missing")
  }
  const defaultTaxRates = snapshot.taxRates.filter(
    (rate) =>
      rate.taxRegionId === taxRegion.id && rate.isDefault && rate.rate === 21
  )
  const ownedElevenTaxRates = snapshot.taxRates.filter(
    (rate) =>
      rate.taxRegionId === taxRegion.id &&
      !rate.isDefault &&
      rate.rate === 11 &&
      rate.metadata.demo_source === RO_DEMO_SOURCE
  )
  if (defaultTaxRates.length !== 1 || ownedElevenTaxRates.length !== 1) {
    throw new Error("post-apply RO tax-rate proof is invalid")
  }
  const [defaultTaxRate] = defaultTaxRates
  const [ownedElevenTaxRate] = ownedElevenTaxRates
  if (!(defaultTaxRate && ownedElevenTaxRate)) {
    throw new Error("post-apply RO tax-rate proof is missing")
  }
  const variantPrices = plan.variantPrices.map((mutation) => {
    const variant = snapshot.variants.find(
      ({ id }) => id === mutation.variantId
    )
    const matches = variant?.prices.filter(
      (price) =>
        price.currencyCode.toLowerCase() === "ron" &&
        price.priceListId === null &&
        price.minQuantity === null &&
        price.maxQuantity === null &&
        price.rules.length === 0 &&
        price.amount === mutation.amount
    )
    if (!variant || matches?.length !== 1) {
      throw new Error(
        `post-apply RON price proof for ${mutation.variantId} is invalid`
      )
    }
    return {
      amount: mutation.amount,
      productId: mutation.productId,
      variantId: mutation.variantId,
    }
  })
  const postState = {
    paymentProviderIds: plan.payment.providerIds,
    regionId: result.regionId,
    salesChannelId: plan.salesChannelId,
    serviceZoneId: result.serviceZoneId,
    shippingOptions,
    taxRateIds: [defaultTaxRate.id, ownedElevenTaxRate.id].sort(),
    taxRegionIds: [taxRegion.id],
    variantPrices,
  }
  return {
    commerceManifestSha256: plan.commerceManifestSha256,
    demo: true as const,
    deploymentIdentity: plan.deploymentIdentity,
    kind: "ro-demo-commerce-apply-receipt" as const,
    market: "ro" as const,
    planHash,
    postState,
    postStateSha256: sha256RoDemoArtifactBytes(
      serializeRoDemoArtifact(postState)
    ),
    priceAuthorityKind: plan.priceAuthorityKind,
    priceAuthoritySha256: plan.priceAuthoritySha256,
    restoreArtifactSha256,
    schemaVersion: 1 as const,
    skBaselineHashAfter: result.actualSkBaselineHash,
    skBaselineHashBefore: plan.skBaselineHash,
  }
}

export const serializeRoDemoPrivateArtifact = serializeRoDemoArtifact

export default async function roDemoCommerce({ args, container }: ExecArgs) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  if (args.includes("--capture-deployment-fingerprint")) {
    const capture = parseRoDemoFingerprintCliOptions(args)
    const input = await loadRoDemoInput(capture.manifestPath)
    assertExpectedCommerceManifest(
      input.commerceManifestSha256,
      capture.expectedCommerceManifestSha256
    )
    assertExpectedPriceAuthority(
      input.priceAuthoritySha256,
      capture.expectedPriceAuthoritySha256
    )
    const snapshot = await inspectRoDemoCommerce(container)
    const salesChannelId = input.manifest.binding.salesChannelId
    const deploymentIdentity: RoDemoDeploymentIdentity = {
      backendBuildHash: capture.backendBuildHash,
      backendDeploymentId: capture.backendDeploymentId,
      backendReleaseSha: capture.backendReleaseSha,
      backendSlot: capture.backendSlot,
      databaseFingerprint: buildRoDemoDatabaseFingerprint(
        snapshot,
        salesChannelId
      ),
      databaseInstanceFingerprint: buildRoDemoDatabaseInstanceFingerprint(
        process.env
      ),
      environmentId: capture.environmentId,
    }
    assertRoDemoDeploymentIdentity(
      deploymentIdentity,
      snapshot,
      salesChannelId,
      process.env
    )
    const artifact = {
      counts: {
        products: new Set(snapshot.variants.map(({ productId }) => productId))
          .size,
        stores: snapshot.stores.length,
        variants: snapshot.variants.length,
      },
      commerceManifestSha256: input.commerceManifestSha256,
      deploymentIdentity,
      kind: "ro-demo-commerce-deployment-fingerprint" as const,
      priceAuthoritySha256: input.priceAuthoritySha256,
      salesChannelId,
      schemaVersion: 1 as const,
      skCommerceBaseline: buildSkCommerceBaselineFingerprint(snapshot),
    }
    const bytes = serializeRoDemoArtifact(artifact)
    await writePrivateArtifact(capture.fingerprintOutputPath, bytes)
    const artifactSha256 = sha256RoDemoArtifactBytes(bytes)
    logger.info(
      `RO demo deployment fingerprint ${deploymentIdentity.databaseFingerprint}; artifact SHA-256 ${artifactSha256}; no commerce data was changed`
    )
    return { artifactSha256, deploymentIdentity }
  }
  const options = parseRoDemoCliOptions(args)
  const input = await loadRoDemoInput(options.manifestPath)
  assertExpectedCommerceManifest(
    input.commerceManifestSha256,
    options.expectedCommerceManifestSha256
  )
  assertExpectedPriceAuthority(
    input.priceAuthoritySha256,
    options.expectedPriceAuthoritySha256
  )
  const snapshot = await inspectRoDemoCommerce(container)
  assertExpectedSkCommerceBaseline(
    snapshot,
    options.expectedSkCommerceBaselineSha256
  )
  assertRoDemoDeploymentIdentity(
    options.expectedDeployment,
    snapshot,
    input.manifest.binding.salesChannelId,
    process.env
  )
  const plan = buildRoDemoCommercePlan(
    input.priceAuthority,
    input.priceAuthoritySha256,
    input.manifest.binding,
    {
      commerceManifestSha256: input.commerceManifestSha256,
      deploymentIdentity: options.expectedDeployment,
      snapshot,
    }
  )
  const planHash = hashRoDemoCommercePlan(plan)
  const planBytes = serializeRoDemoCommercePlan(plan)
  const skBaselineHash = hashSkCommerceBaseline(snapshot)
  logger.info(`RO demo commerce plan hash: ${planHash}`)
  logger.info(`SK commerce baseline hash: ${skBaselineHash}`)
  logger.info(
    `RO demo actions: ${JSON.stringify({
      paymentProviderId: plan.payment.providerId,
      region: plan.region.action,
      serviceZone: plan.serviceZone.action,
      taxRegion: plan.taxRegion.action,
      variantPriceWrites: plan.variantPrices.filter(
        (price) => price.action !== "unchanged"
      ).length,
    })}`
  )
  for (const warning of plan.warnings) {
    logger.warn(warning)
  }
  if (!options.apply) {
    await writePrivateArtifact(options.planOutputPath, planBytes)
    logger.info(
      `Dry-run complete; no commerce data was changed; canonical plan written to ${options.planOutputPath}`
    )
    return { planHash, skBaselineHash, warnings: plan.warnings }
  }
  if (options.confirmPlanHash !== planHash) {
    throw new Error("confirmed plan hash does not match the fresh dry-run")
  }
  const reviewedPlanBytes = await readFile(options.planOutputPath, "utf8")
  if (reviewedPlanBytes !== planBytes) {
    throw new Error(
      "reviewed --plan-output bytes do not match the fresh canonical plan"
    )
  }
  const refreshedInput = await loadRoDemoInput(options.manifestPath)
  assertExpectedCommerceManifest(
    refreshedInput.commerceManifestSha256,
    options.expectedCommerceManifestSha256
  )
  assertExpectedPriceAuthority(
    refreshedInput.priceAuthoritySha256,
    options.expectedPriceAuthoritySha256
  )
  const refreshedSnapshot = await inspectRoDemoCommerce(container)
  assertExpectedSkCommerceBaseline(
    refreshedSnapshot,
    options.expectedSkCommerceBaselineSha256
  )
  assertRoDemoDeploymentIdentity(
    options.expectedDeployment,
    refreshedSnapshot,
    refreshedInput.manifest.binding.salesChannelId,
    process.env
  )
  const refreshedPlan = buildRoDemoCommercePlan(
    refreshedInput.priceAuthority,
    refreshedInput.priceAuthoritySha256,
    refreshedInput.manifest.binding,
    {
      commerceManifestSha256: refreshedInput.commerceManifestSha256,
      deploymentIdentity: options.expectedDeployment,
      snapshot: refreshedSnapshot,
    }
  )
  if (
    hashRoDemoCommercePlan(refreshedPlan) !== planHash ||
    hashSkCommerceBaseline(refreshedSnapshot) !== skBaselineHash
  ) {
    throw new Error("commerce state changed after preflight; run a new dry-run")
  }
  const restoreOutputPath = options.restoreOutputPath
  const receiptOutputPath = options.receiptOutputPath
  if (!(restoreOutputPath && receiptOutputPath)) {
    throw new Error("apply artifact outputs are missing")
  }
  const restoreArtifact = buildRoDemoRestoreArtifact(
    refreshedPlan,
    planHash,
    refreshedSnapshot
  )
  const restoreBytes = serializeRoDemoArtifact(restoreArtifact)
  await reservePrivateArtifacts([restoreOutputPath, receiptOutputPath])
  let receiptWritten = false
  let result: Awaited<ReturnType<typeof applyRoDemoCommerce>>
  try {
    await writeReservedPrivateArtifact(restoreOutputPath, restoreBytes)
    result = await applyRoDemoCommerce(container, plan, skBaselineHash)
    try {
      const postSnapshot = await inspectRoDemoCommerce(container)
      const receipt = buildRoDemoApplyReceipt({
        plan,
        planHash,
        result,
        restoreArtifactSha256: sha256RoDemoArtifactBytes(restoreBytes),
        snapshot: postSnapshot,
      })
      await writeReservedPrivateArtifact(
        receiptOutputPath,
        serializeRoDemoArtifact(receipt)
      )
      receiptWritten = true
    } catch (error) {
      await rollbackRomaniaCountryHandoff(container, plan, result.regionId)
      throw error
    }
  } finally {
    if (!receiptWritten) {
      await unlink(receiptOutputPath).catch(() => {})
    }
  }
  logger.info(
    `RO demo commerce applied; SK baseline unchanged at ${result.actualSkBaselineHash}; receipt written to ${receiptOutputPath}`
  )
  return { ...result, planHash, skBaselineHash }
}

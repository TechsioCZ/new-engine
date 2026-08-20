import { createHash } from "node:crypto"
import type { RoCatalogManifest } from "../ro-catalog-import/types"
import { sha256PrecommerceInventoryIdentity } from "./precommerce-price-authority"
import {
  RO_DEMO_SOURCE,
  type RoDemoBinding,
  type RoDemoCheckoutMarker,
  type RoDemoCommercePlan,
  type RoDemoDeploymentIdentity,
  type RoDemoPriceAuthority,
  type RoDemoPriceDirective,
  type RoDemoSnapshot,
  type RoDemoTaxAssignment,
} from "./types"

const TARGET_SERVICE_ZONE = "Herbatica Romania Demo" as const

const stableJson = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${stableJson(child)}`)
      .join(",")}}`
  }
  return JSON.stringify(value)
}

const exactlyOne = <Value>(
  values: readonly Value[],
  message: string
): Value => {
  const [first, ...rest] = values
  if (first === undefined || rest.length !== 0) {
    throw new Error(message)
  }
  return first
}

const metadataVat = (metadata: Readonly<Record<string, unknown>>) => {
  const direct = metadata.ro_vat_rate
  const topOffer = metadata.top_offer
  const nested =
    topOffer && typeof topOffer === "object" && !Array.isArray(topOffer)
      ? (topOffer as Record<string, unknown>).vat
      : undefined
  for (const candidate of [direct, nested]) {
    let parsed = Number.NaN
    if (typeof candidate === "number") {
      parsed = candidate
    } else if (typeof candidate === "string") {
      parsed = Number(candidate.replace(",", "."))
    }
    if (parsed === 11 || parsed === 21) {
      return parsed
    }
  }
  return
}

const resolveVariant = (
  snapshot: RoDemoSnapshot,
  directive: RoDemoPriceDirective
) => {
  const expected = directive.expectedLiveIdentity
  const variant = exactlyOne(
    snapshot.variants.filter((candidate) => {
      if (expected) {
        return candidate.id === expected.variantId
      }
      return directive.key.kind === "variant_id"
        ? candidate.id === directive.key.value
        : candidate[directive.key.kind] === directive.key.value
    }),
    `price-authority variant ${directive.key.kind}:${directive.key.value} is missing or ambiguous`
  )
  const keyMatches =
    directive.key.kind === "variant_id"
      ? variant.id === directive.key.value
      : variant[directive.key.kind] === directive.key.value
  if (
    expected &&
    (variant.productId !== expected.productId ||
      variant.ean !== expected.ean ||
      variant.sku !== expected.sku ||
      !keyMatches)
  ) {
    throw new Error(
      `price-authority live identity drifted for variant ${expected.variantId}`
    )
  }
  return variant
}

const normalizePriceAuthority = (
  authority: RoDemoPriceAuthority | Pick<RoCatalogManifest, "products">
): RoDemoPriceAuthority => {
  if ("kind" in authority) {
    return authority
  }
  return {
    inventoryIdentity: null,
    inventoryIdentitySha256: null,
    kind: "catalog-manifest",
    variants: authority.products.flatMap((product) =>
      product.variants.map((variant) => ({
        amount: variant.ronPrice?.amount ?? null,
        expectedLiveIdentity: null,
        key: variant.key,
        roAvailability: variant.roAvailability,
      }))
    ),
  }
}

const buildTaxAssignments = (
  productIds: readonly string[],
  snapshot: RoDemoSnapshot,
  warnings: string[]
): RoDemoTaxAssignment[] => {
  const assignments = [...new Set(productIds)].sort().map((productId) => {
    const variants = snapshot.variants.filter(
      (variant) => variant.productId === productId
    )
    const productMetadata = exactlyOne(
      [
        ...new Map(
          variants.map((variant) => [
            variant.productId,
            variant.productMetadata,
          ])
        ).values(),
      ],
      `product ${productId} metadata is missing or ambiguous`
    )
    const sourced = metadataVat(productMetadata)
    if (sourced === 11 || sourced === 21) {
      return { productId, rate: sourced, source: "product-metadata" } as const
    }
    warnings.push(
      `product ${productId} has no explicit RO VAT class; demo default 21% will be used`
    )
    return { productId, rate: 21, source: "demo-default" } as const
  })
  return assignments
}

export const buildRoDemoCommercePlan = (
  priceAuthorityInput:
    | RoDemoPriceAuthority
    | Pick<RoCatalogManifest, "products">,
  priceAuthoritySha256: string,
  binding: RoDemoBinding,
  context: Readonly<{
    deploymentIdentity: RoDemoDeploymentIdentity
    snapshot: RoDemoSnapshot
  }>
): RoDemoCommercePlan => {
  const { deploymentIdentity, snapshot } = context
  const priceAuthority = normalizePriceAuthority(priceAuthorityInput)
  if (priceAuthority.inventoryIdentitySha256) {
    const freshInventoryIdentity = [
      ...new Set(snapshot.variants.map(({ productId }) => productId)),
    ]
      .sort()
      .map((productId) => ({
        productId,
        variants: snapshot.variants
          .filter((variant) => variant.productId === productId)
          .map((variant) => ({
            ean: variant.ean,
            liveSku: variant.sku,
            variantId: variant.id,
          }))
          .sort((left, right) => left.variantId.localeCompare(right.variantId)),
      }))
    if (
      sha256PrecommerceInventoryIdentity(freshInventoryIdentity) !==
      priceAuthority.inventoryIdentitySha256
    ) {
      throw new Error(
        "fresh Medusa inventory identity differs from the reviewed pre-commerce authority"
      )
    }
  }
  if (!snapshot.salesChannelIds.includes(binding.salesChannelId)) {
    throw new Error(`RO sales channel ${binding.salesChannelId} does not exist`)
  }
  const store = exactlyOne(
    snapshot.stores,
    "Medusa store is missing or ambiguous"
  )
  if (!snapshot.fulfillmentSetIds.includes(binding.fulfillmentSetId)) {
    throw new Error(
      `fulfillment set ${binding.fulfillmentSetId} does not exist`
    )
  }
  if (!snapshot.shippingProfileIds.includes(binding.shippingProfileId)) {
    throw new Error(
      `shipping profile ${binding.shippingProfileId} does not exist`
    )
  }
  if (
    !snapshot.fulfillmentProviderIds.includes(binding.fulfillmentProviderId)
  ) {
    throw new Error(
      `fulfillment provider ${binding.fulfillmentProviderId} does not exist`
    )
  }

  const warnings: string[] = []
  const regionMatches = snapshot.regions.filter(
    (candidate) => candidate.name === binding.regionName
  )
  if (regionMatches.length > 1) {
    throw new Error("RO demo region name is ambiguous")
  }
  const region = regionMatches[0] ?? null
  if (region?.countryCodes.some((code) => code !== "ro")) {
    throw new Error(
      "RO demo region owns non-RO countries; refusing shared mutation"
    )
  }
  const currentRomaniaOwners = snapshot.regions.filter(
    (candidate) =>
      candidate.id !== region?.id && candidate.countryCodes.includes("ro")
  )
  if (currentRomaniaOwners.length > 1) {
    throw new Error("Romania belongs to multiple non-demo regions")
  }
  const detachOwner = currentRomaniaOwners[0]
  const detachRomaniaFromRegion = detachOwner
    ? {
        currentCountryCodes: [...detachOwner.countryCodes],
        regionId: detachOwner.id,
      }
    : null

  const enabledProviders = new Set(
    snapshot.paymentProviders
      .filter((provider) => provider.enabled)
      .map((provider) => provider.id)
  )
  const gopayProviderId = binding.gopayProviderIds.find((id) =>
    enabledProviders.has(id)
  )
  const fallback = !gopayProviderId
  const providerId = gopayProviderId ?? binding.systemPaymentProviderId
  if (!enabledProviders.has(providerId)) {
    throw new Error(
      "neither an approved GoPay provider nor the explicit no-debit demo provider is enabled"
    )
  }
  if (fallback && providerId !== "pp_system_default") {
    throw new Error(
      "RO no-debit demo fallback must use exactly pp_system_default"
    )
  }
  const incompatibleExistingProviders = (region?.paymentProviderIds ?? [])
    .filter((id) => id !== providerId)
    .sort()
  if (incompatibleExistingProviders.length > 0) {
    throw new Error(
      `RO demo region has payment providers outside the exact planned set: ${incompatibleExistingProviders.join(", ")}`
    )
  }
  const providerIds = [providerId]
  warnings.push(
    "cash on delivery is deliberately disabled until checkout enforces the 40 RON minimum and 9.45 RON fee"
  )
  if (fallback) {
    warnings.push(
      "GoPay is unavailable; carrier checkout uses an explicitly marked no-debit RO demo payment session"
    )
  }
  const paymentDisplayLabel = fallback
    ? "Plată demo (fără debitare)"
    : "Plată online prin GoPay"
  const regionPaymentProviderIds = providerIds
  const demoCheckout = fallback
    ? ({
        binding_sha256: createHash("sha256")
          .update(
            stableJson({
              priceAuthoritySha256,
              locale: "ro-RO",
              market: "ro",
              providerId,
              regionName: binding.regionName,
              salesChannelId: binding.salesChannelId,
              source: RO_DEMO_SOURCE,
            })
          )
          .digest("hex"),
        label: "Plată demo (fără debitare)",
        locale: "ro-RO",
        market: "ro",
        payment_mode: "no-debit-demo",
        provider_id: "pp_system_default",
        schema_version: 1,
        source: RO_DEMO_SOURCE,
      } satisfies RoDemoCheckoutMarker)
    : null
  const {
    cod_fee_ron: _deprecatedCodFee,
    cod_minimum_order_ron: _deprecatedCodMinimum,
    payment_provider_fallback: _deprecatedPaymentFallback,
    ro_demo_checkout: _deprecatedDemoCheckout,
    ...preservedRegionMetadata
  } = region?.metadata ?? {}
  const regionMetadata = {
    ...preservedRegionMetadata,
    demo: true,
    demo_source: RO_DEMO_SOURCE,
    market_code: "ro",
    payment_display_label: paymentDisplayLabel,
    ...(demoCheckout ? { ro_demo_checkout: demoCheckout } : {}),
    sales_channel_id: binding.salesChannelId,
  }

  const serviceZoneMatches = snapshot.serviceZones.filter(
    (zone) => zone.name === TARGET_SERVICE_ZONE
  )
  if (serviceZoneMatches.length > 1) {
    throw new Error("RO demo service zone is ambiguous")
  }
  const serviceZone = serviceZoneMatches[0] ?? null
  if (
    serviceZone &&
    (serviceZone.fulfillmentSetId !== binding.fulfillmentSetId ||
      serviceZone.countryCodes.length !== 1 ||
      serviceZone.countryCodes[0] !== "ro")
  ) {
    throw new Error("RO demo service zone is not isolated to Romania")
  }
  const shippingDefaults = [
    {
      amount: 14.99,
      code: "ro-demo-packeta-pickup" as const,
      freeFrom: 249 as const,
      label: "Packeta – punct de ridicare",
    },
    {
      amount: 32.69,
      code: "ro-demo-packeta-address" as const,
      label: "Packeta – livrare la adresă",
    },
    {
      amount: 26.5,
      code: "ro-demo-cargus" as const,
      label: "Cargus",
    },
  ]
  const shipping = shippingDefaults.map((option) => {
    const matches = snapshot.shippingOptions.filter(
      (existing) => existing.code === option.code
    )
    if (matches.length > 1) {
      throw new Error(`shipping code ${option.code} is ambiguous`)
    }
    if (matches[0] && matches[0].source !== RO_DEMO_SOURCE) {
      throw new Error(
        `shipping code ${option.code} is not owned by the RO demo tool`
      )
    }
    return {
      ...option,
      action: matches[0] ? ("update" as const) : ("create" as const),
      existingId: matches[0]?.id ?? null,
    }
  })

  const variantPrices = priceAuthority.variants.flatMap((entry) => {
    const variant = resolveVariant(snapshot, entry)
    if (entry.roAvailability === "unavailable") {
      if (
        variant.prices.some(
          (price) => price.currencyCode.toLowerCase() === "ron"
        )
      ) {
        throw new Error(
          `unavailable variant ${variant.id} already has a RON price; refusing to leave it purchasable`
        )
      }
      warnings.push(
        `price-authority variant ${entry.key.kind}:${entry.key.value} is unavailable and has no RON price`
      )
      return []
    }
    if (entry.amount === null) {
      throw new Error(
        `sellable variant ${entry.key.kind}:${entry.key.value} has no approved RON amount`
      )
    }
    const current = variant.prices.filter(
      (price) =>
        price.currencyCode.toLowerCase() === "ron" &&
        price.priceListId === null &&
        price.minQuantity === null &&
        price.maxQuantity === null &&
        price.rules.length === 0
    )
    if (current.length > 1) {
      throw new Error(`variant ${variant.id} has ambiguous base RON prices`)
    }
    const currentRonPrice = current[0] ?? null
    let action: "create" | "unchanged" | "update" = "create"
    if (currentRonPrice) {
      action = currentRonPrice.amount === entry.amount ? "unchanged" : "update"
    }
    if (
      variant.prices.some(
        (price) => price.priceListId === null && price.rules.length > 0
      )
    ) {
      throw new Error(
        `variant ${variant.id} has rule-scoped base prices; refusing unsafe merged price update`
      )
    }
    return [
      {
        action,
        amount: entry.amount,
        currentRonPrice,
        productId: variant.productId,
        variantId: variant.id,
      },
    ]
  })
  if (
    new Set(variantPrices.map(({ variantId }) => variantId)).size !==
    variantPrices.length
  ) {
    throw new Error(
      "catalog manifest resolves the same live variant more than once"
    )
  }

  const roTaxRegions = snapshot.taxRegions.filter(
    (taxRegion) => taxRegion.countryCode === "ro"
  )
  if (roTaxRegions.length > 1) {
    throw new Error("Romanian tax region is ambiguous")
  }
  const existingRoDefaults = roTaxRegions[0]
    ? snapshot.taxRates.filter(
        (rate) => rate.taxRegionId === roTaxRegions[0]?.id && rate.isDefault
      )
    : []
  if (existingRoDefaults.length > 1) {
    throw new Error("Romanian default tax rate is ambiguous")
  }
  if (existingRoDefaults[0] && existingRoDefaults[0].rate !== 21) {
    throw new Error("existing Romanian default tax rate must be exactly 21%")
  }
  const ownedRoRates = roTaxRegions[0]
    ? snapshot.taxRates.filter(
        (rate) =>
          rate.taxRegionId === roTaxRegions[0]?.id &&
          rate.metadata.demo_source === RO_DEMO_SOURCE
      )
    : []
  const ownedTwentyOne = ownedRoRates.filter((rate) => rate.rate === 21)
  const ownedEleven = ownedRoRates.filter((rate) => rate.rate === 11)
  if (ownedTwentyOne.length > 1 || ownedEleven.length > 1) {
    throw new Error("RO demo tax rate ownership is ambiguous")
  }
  const taxAssignments = buildTaxAssignments(
    variantPrices.map(({ productId }) => productId),
    snapshot,
    warnings
  )
  const desiredElevenProductIds = taxAssignments
    .filter((assignment) => assignment.rate === 11)
    .map((assignment) => assignment.productId)
    .sort()
  const desiredElevenProductIdSet = new Set(desiredElevenProductIds)
  const overlappingForeignRates = roTaxRegions[0]
    ? snapshot.taxRates.filter(
        (rate) =>
          rate.taxRegionId === roTaxRegions[0]?.id &&
          !rate.isDefault &&
          rate.metadata.demo_source !== RO_DEMO_SOURCE &&
          rate.productIds.some((productId) =>
            desiredElevenProductIdSet.has(productId)
          )
      )
    : []
  if (overlappingForeignRates.length > 0) {
    throw new Error(
      `unowned Romanian tax rate overlaps demo 11% products: ${overlappingForeignRates
        .map((rate) => rate.id)
        .sort()
        .join(", ")}`
    )
  }
  const currencyPreferences = snapshot.pricePreferences.filter(
    (preference) =>
      preference.attribute === "currency_code" && preference.value === "ron"
  )
  if (currencyPreferences.length > 1) {
    throw new Error("RON currency price preference is ambiguous")
  }
  const regionPreferences = region
    ? snapshot.pricePreferences.filter(
        (preference) =>
          preference.attribute === "region_id" && preference.value === region.id
      )
    : []
  if (regionPreferences.length > 1) {
    throw new Error("RO region price preference is ambiguous")
  }
  let currencyPreferenceAction: RoDemoCommercePlan["pricePreferences"]["currency"]["action"] =
    "create"
  if (currencyPreferences[0]) {
    currencyPreferenceAction = currencyPreferences[0].isTaxInclusive
      ? "unchanged"
      : "update"
  }
  let regionPreferenceAction: RoDemoCommercePlan["pricePreferences"]["region"]["action"] =
    "create-after-region"
  if (region) {
    regionPreferenceAction = "create"
    if (regionPreferences[0]) {
      regionPreferenceAction = regionPreferences[0].isTaxInclusive
        ? "unchanged"
        : "update"
    }
  }
  let elevenAction: RoDemoCommercePlan["taxRates"]["elevenAction"] = "create"
  if (ownedEleven[0]) {
    elevenAction =
      stableJson([...ownedEleven[0].productIds].sort()) ===
      stableJson(desiredElevenProductIds)
        ? "unchanged"
        : "update"
  }
  let twentyOneAction: RoDemoCommercePlan["taxRates"]["twentyOneAction"] =
    "create"
  if (existingRoDefaults[0]) {
    twentyOneAction = "unchanged"
  } else if (ownedTwentyOne[0]) {
    twentyOneAction = "update"
  }
  let regionAction: RoDemoCommercePlan["region"]["action"] = "create"
  if (region) {
    regionAction =
      region.currencyCode === "ron" &&
      region.countryCodes.length === 1 &&
      region.countryCodes[0] === "ro" &&
      region.isTaxInclusive &&
      stableJson(regionPaymentProviderIds) ===
        stableJson([...region.paymentProviderIds].sort()) &&
      stableJson(regionMetadata) === stableJson(region.metadata)
        ? "unchanged"
        : "update"
  }
  const skBaselineHash = hashSkCommerceBaseline(snapshot)

  return {
    binding,
    codPolicy: {
      configuredFee: 9.45,
      configuredMinimumOrder: 40,
      enabled: false,
      reason:
        "checkout does not yet enforce the minimum and fee; provider is intentionally unlinked",
    },
    detachRomaniaFromRegion,
    deploymentIdentity,
    market: "ro",
    payment: {
      demoCheckout,
      displayLabel: paymentDisplayLabel,
      fallback,
      providerId,
      providerIds,
    },
    inventoryIdentitySha256: priceAuthority.inventoryIdentitySha256,
    priceAuthorityKind: priceAuthority.kind,
    priceAuthoritySha256,
    pricePreferences: {
      currency: {
        action: currencyPreferenceAction,
        existingId: currencyPreferences[0]?.id ?? null,
      },
      region: {
        action: regionPreferenceAction,
        existingId: regionPreferences[0]?.id ?? null,
      },
    },
    region: {
      action: regionAction,
      existingId: region?.id ?? null,
      metadata: regionMetadata,
      name: binding.regionName,
      ownsRomaniaBeforeApply: region?.countryCodes.includes("ro") ?? false,
      paymentProviderIds: regionPaymentProviderIds,
    },
    salesChannelId: binding.salesChannelId,
    skBaselineHash,
    serviceZone: {
      action: serviceZone ? "unchanged" : "create",
      existingId: serviceZone?.id ?? null,
      name: TARGET_SERVICE_ZONE,
    },
    shipping,
    storeCurrency: {
      action: store.supportedCurrencies.some(
        (currency) => currency.currencyCode === "ron"
      )
        ? "unchanged"
        : "update",
      existingCurrencies: store.supportedCurrencies,
      storeId: store.id,
    },
    taxAssignments,
    taxRates: {
      elevenAction,
      existingOwnedElevenId: ownedEleven[0]?.id ?? null,
      existingOwnedTwentyOneId: ownedTwentyOne[0]?.id ?? null,
      twentyOneAction,
    },
    taxRegion: {
      action: roTaxRegions[0] ? "unchanged" : "create",
      existingId: roTaxRegions[0]?.id ?? null,
    },
    variantPrices,
    warnings,
  }
}

export const serializeRoDemoCommercePlan = (plan: RoDemoCommercePlan) =>
  `${stableJson(plan)}\n`

export const hashRoDemoCommercePlan = (plan: RoDemoCommercePlan) =>
  createHash("sha256").update(serializeRoDemoCommercePlan(plan)).digest("hex")

export const buildSkCommerceBaseline = (snapshot: RoDemoSnapshot) => ({
  nonRonVariantPrices: snapshot.variants
    .map((variant) => ({
      id: variant.id,
      prices: variant.prices
        .filter((price) => price.currencyCode.toLowerCase() !== "ron")
        .sort((left, right) =>
          `${left.currencyCode}:${left.id ?? ""}`.localeCompare(
            `${right.currencyCode}:${right.id ?? ""}`
          )
        ),
    }))
    .sort((left, right) => left.id.localeCompare(right.id)),
  skRegions: snapshot.regions
    .filter((region) => region.countryCodes.includes("sk"))
    .map((region) => ({
      currencyCode: region.currencyCode,
      id: region.id,
      isTaxInclusive: region.isTaxInclusive,
      name: region.name,
      paymentProviderIds: [...region.paymentProviderIds].sort(),
    }))
    .sort((left, right) => left.id.localeCompare(right.id)),
  skServiceZones: snapshot.serviceZones
    .filter((zone) => zone.countryCodes.includes("sk"))
    .map((zone) => ({
      fulfillmentSetId: zone.fulfillmentSetId,
      id: zone.id,
      name: zone.name,
    }))
    .sort((left, right) => left.id.localeCompare(right.id)),
  storeNonRonCurrencies: snapshot.stores
    .map((store) => ({
      id: store.id,
      supportedCurrencies: store.supportedCurrencies
        .filter((currency) => currency.currencyCode !== "ron")
        .sort((left, right) =>
          left.currencyCode.localeCompare(right.currencyCode)
        ),
    }))
    .sort((left, right) => left.id.localeCompare(right.id)),
})

export const hashSkCommerceBaseline = (snapshot: RoDemoSnapshot) =>
  createHash("sha256")
    .update(stableJson(buildSkCommerceBaseline(snapshot)))
    .digest("hex")

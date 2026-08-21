import {
  buildFourMarketCommerceReadiness,
  buildMarketCommerceReadinessProof,
  serializeCanonicalCommerceArtifact,
  sha256CommerceArtifactBytes,
} from "."
import type {
  BuiltCommerceCollection,
  CommerceArtifactRef,
  CommerceLiveState,
  CommerceReleaseIdentity,
  FourMarketCommerceCollectionAuthority,
  FourMarketReviewedArtifacts,
  MarketCommerceCollectionReceipt,
} from "./collector-types"
import {
  COMMERCE_MARKET_CONTRACTS,
  COMMERCE_READINESS_MARKETS,
  type CommerceReadinessMarket,
  type FourMarketCommerceReadinessInput,
  type MarketCommerceReadinessInput,
  type SharedCatalogInput,
  type SharedInventoryInput,
} from "./types"

const DATABASE_INSTANCE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/

export const buildCommerceDatabaseInstanceFingerprint = (
  environment: NodeJS.ProcessEnv
) => {
  try {
    const databaseUrl = environment.DATABASE_URL
    const databaseInstanceId =
      environment.MARKET_COMMERCE_DATABASE_INSTANCE_ID ??
      environment.RO_DEMO_DATABASE_INSTANCE_ID
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
    return sha256CommerceArtifactBytes(
      serializeCanonicalCommerceArtifact({
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

const requiredEnvironmentValue = (
  environment: NodeJS.ProcessEnv,
  names: readonly string[],
  label: string
) => {
  const value = names.map((name) => environment[name]).find(Boolean)
  if (!value) {
    throw new Error(`${label} is missing from the runtime environment`)
  }
  return value
}

export const observeCommerceReleaseIdentity = (
  environment: NodeJS.ProcessEnv
): CommerceReleaseIdentity => {
  const backendSlot = requiredEnvironmentValue(
    environment,
    ["ZANE_DEPLOYMENT_SLOT"],
    "backend slot"
  )
  if (backendSlot !== "blue" && backendSlot !== "green") {
    throw new Error("backend slot must be blue or green")
  }
  return {
    backendBuildHash: requiredEnvironmentValue(
      environment,
      ["BACKEND_BUILD_HASH"],
      "backend build hash"
    ),
    backendDeploymentId: requiredEnvironmentValue(
      environment,
      ["ZANE_DEPLOYMENT_ID"],
      "backend deployment id"
    ),
    backendReleaseSha: requiredEnvironmentValue(
      environment,
      ["RELEASE_SHA"],
      "backend release SHA"
    ),
    backendSlot,
    databaseInstanceFingerprint:
      buildCommerceDatabaseInstanceFingerprint(environment),
    environmentId: requiredEnvironmentValue(
      environment,
      ["MARKET_COMMERCE_ENVIRONMENT_ID", "RO_DEMO_ENVIRONMENT_ID"],
      "environment id"
    ),
    releaseId: requiredEnvironmentValue(
      environment,
      ["MARKET_COMMERCE_RELEASE_ID", "RELEASE_ID"],
      "release id"
    ),
  }
}

export const assertCommerceReleaseIdentity = (
  expected: CommerceReleaseIdentity,
  observed: CommerceReleaseIdentity
) => {
  for (const key of Object.keys(
    expected
  ) as (keyof CommerceReleaseIdentity)[]) {
    if (expected[key] !== observed[key]) {
      throw new Error(`observed release identity differs at ${key}`)
    }
  }
  return expected
}

const exactIds = <Value extends Readonly<{ id: string }>>(
  rows: readonly Value[],
  expectedIds: readonly string[],
  label: string
) => {
  const byId = new Map(rows.map((row) => [row.id, row] as const))
  const selected = expectedIds.flatMap((id) => {
    const row = byId.get(id)
    return row ? [row] : []
  })
  if (
    selected.length !== expectedIds.length ||
    new Set(selected.map(({ id }) => id)).size !== expectedIds.length
  ) {
    throw new Error(`${label} differs from the reviewed identity scope`)
  }
  return selected
}

const sharedCatalogInput = (
  state: CommerceLiveState,
  reviewedSha256: string
): SharedCatalogInput => ({
  productIds: state.products.map(({ id }) => id).sort(),
  reviewedSha256,
  variants: state.products
    .flatMap((product) =>
      product.variants.map((variant) => ({
        ean: variant.ean,
        id: variant.id,
        productId: product.id,
        sku: variant.sku,
      }))
    )
    .sort((left, right) => left.id.localeCompare(right.id)),
})

const sharedInventoryInput = (
  state: CommerceLiveState,
  sharedVariantIds: ReadonlySet<string>,
  reviewedSha256: string
): SharedInventoryInput => {
  const links = state.inventoryLinks
    .filter(({ variantId }) => sharedVariantIds.has(variantId))
    .map((link) => ({ ...link }))
    .sort((left, right) =>
      [left.variantId, left.inventoryItemId]
        .join("\0")
        .localeCompare([right.variantId, right.inventoryItemId].join("\0"))
    )
  const inventoryItemIds = new Set(
    links.map(({ inventoryItemId }) => inventoryItemId)
  )
  return {
    levels: state.inventoryLevels
      .filter(({ inventoryItemId }) => inventoryItemIds.has(inventoryItemId))
      .map((level) => ({ ...level }))
      .sort((left, right) =>
        [left.inventoryItemId, left.locationId]
          .join("\0")
          .localeCompare([right.inventoryItemId, right.locationId].join("\0"))
      ),
    links,
    reviewedSha256,
  }
}

const marketInput = (
  market: CommerceReadinessMarket,
  authority: FourMarketCommerceCollectionAuthority["markets"][number],
  artifacts: FourMarketReviewedArtifacts,
  state: CommerceLiveState
): MarketCommerceReadinessInput => {
  const contract = COMMERCE_MARKET_CONTRACTS[market]
  const regions = exactIds(
    state.regions,
    [authority.regionId],
    `${market} region`
  )
  const region = regions[0]
  if (!region) {
    throw new Error(`${market} region differs from the reviewed identity scope`)
  }
  const shippingOptions = exactIds(
    state.shippingOptions,
    authority.shippingOptionIds,
    `${market} shipping options`
  )
  const taxRegions = exactIds(
    state.taxRegions,
    [authority.taxRegionId],
    `${market} tax region`
  )
  const taxRegion = taxRegions[0]
  if (!taxRegion) {
    throw new Error(
      `${market} tax region differs from the reviewed identity scope`
    )
  }
  const taxRates = exactIds(
    state.taxRates,
    authority.taxRateIds,
    `${market} tax rates`
  )
  const paymentProviders = exactIds(
    state.paymentProviders,
    authority.paymentProviderIds,
    `${market} payment providers`
  )
  const linkedProviderIds = new Set(
    state.regionPaymentProviderLinks
      .filter(({ regionId }) => regionId === authority.regionId)
      .map(({ paymentProviderId }) => paymentProviderId)
  )
  const publishedProducts = state.products.filter(({ salesChannelIds }) =>
    salesChannelIds.includes(authority.salesChannelId)
  )
  const publishedVariants = publishedProducts
    .flatMap(({ variants }) => variants)
    .sort((left, right) => left.id.localeCompare(right.id))
  const priceArtifact = artifacts.prices[market]

  return {
    approvedVariantPrices: priceArtifact.prices.map((price) => ({
      ...price,
      authoritySha256: authority.priceAuthority.sha256,
      currencyCode: contract.currencyCode,
    })),
    checkoutCanary: artifacts.canaries[market],
    locale: contract.locale,
    market,
    observedVariantPrices: publishedVariants.flatMap((variant) =>
      variant.prices
        .filter(({ currencyCode }) => currencyCode === contract.currencyCode)
        .map((price) => ({ ...price, variantId: variant.id }))
    ),
    paymentProviders: paymentProviders.map((provider) => ({
      ...provider,
      regionIds: linkedProviderIds.has(provider.id) ? [region.id] : [],
    })),
    publishedVariantIds: publishedVariants.map(({ id }) => id),
    region,
    salesChannelId: authority.salesChannelId,
    shippingOptions: shippingOptions.map((option) => ({
      countryCodes: option.countryCodes,
      currencyCode: option.currencyCodes.includes(contract.currencyCode)
        ? contract.currencyCode
        : "",
      enabled: true,
      id: option.id,
      regionId: region.id,
    })),
    tax: {
      countryCode: taxRegion.countryCode,
      id: taxRegion.id,
      rates: taxRates.map((rate) => ({
        enabled: rate.enabled && rate.taxRegionId === authority.taxRegionId,
        id: rate.id,
        rate: rate.rate,
      })),
    },
    unavailableVariants: priceArtifact.unavailableVariants,
  }
}

export const buildCollectedCommerceReadiness = (
  authority: FourMarketCommerceCollectionAuthority,
  artifacts: FourMarketReviewedArtifacts,
  state: CommerceLiveState,
  capturedAt: string
): BuiltCommerceCollection => {
  const sharedCatalog = sharedCatalogInput(
    state,
    artifacts.sharedBaseline.sharedCatalogSha256
  )
  const sharedVariantIds = new Set(sharedCatalog.variants.map(({ id }) => id))
  const sharedInventory = sharedInventoryInput(
    state,
    sharedVariantIds,
    artifacts.sharedBaseline.sharedInventorySha256
  )
  const marketInputs = COMMERCE_READINESS_MARKETS.map((market) => {
    const reviewedMarket = authority.markets.find(
      (candidate) => candidate.market === market
    )
    if (!reviewedMarket) {
      throw new Error(`${market} authority is missing`)
    }
    return marketInput(market, reviewedMarket, artifacts, state)
  })
  const input: FourMarketCommerceReadinessInput = {
    capturedAt,
    markets: marketInputs,
    sharedCatalog,
    sharedInventory,
  }
  const bundle = buildFourMarketCommerceReadiness(input)
  const proofs = Object.fromEntries(
    marketInputs.map((inputMarket) => [
      inputMarket.market,
      buildMarketCommerceReadinessProof(inputMarket, {
        capturedAt,
        sharedCatalog,
        sharedInventory,
      }),
    ])
  ) as Record<
    CommerceReadinessMarket,
    ReturnType<typeof buildMarketCommerceReadinessProof>
  >
  return { bundle, proofs }
}

export const buildCommerceCollectionReceipt = (
  input: Readonly<{
    authority: CommerceArtifactRef
    capturedAt: string
    proofs: Readonly<Record<CommerceReadinessMarket, CommerceArtifactRef>>
    ready: boolean
    releaseIdentity: CommerceReleaseIdentity
  }>
): MarketCommerceCollectionReceipt => ({
  authority: input.authority,
  capturedAt: input.capturedAt,
  kind: "four-market-commerce-collection",
  proofs: input.proofs,
  ready: input.ready,
  releaseIdentity: input.releaseIdentity,
  schemaVersion: 1,
})

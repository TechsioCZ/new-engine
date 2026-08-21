import type {
  CheckoutCanaryArtifact,
  CommerceReadinessMarket,
  FourMarketCommerceReadinessProof,
  MarketCommerceReadinessProof,
} from "./types"

export type CommerceArtifactRef = Readonly<{
  path: string
  sha256: string
}>

export type CommerceReleaseIdentity = Readonly<{
  backendBuildHash: string
  backendDeploymentId: string
  backendReleaseSha: string
  backendSlot: "blue" | "green"
  databaseInstanceFingerprint: string
  environmentId: string
  releaseId: string
}>

export type MarketCommerceCollectionAuthority = Readonly<{
  checkoutCanary: CommerceArtifactRef
  market: CommerceReadinessMarket
  paymentProviderIds: readonly string[]
  priceAuthority: CommerceArtifactRef
  regionId: string
  salesChannelId: string
  shippingOptionIds: readonly string[]
  taxRateIds: readonly string[]
  taxRegionId: string
}>

export type FourMarketCommerceCollectionAuthority = Readonly<{
  kind: "four-market-commerce-collection-authority"
  markets: readonly MarketCommerceCollectionAuthority[]
  releaseIdentity: CommerceReleaseIdentity
  schemaVersion: 1
  sharedBaseline: CommerceArtifactRef
}>

export type MarketApprovedPricesArtifact = Readonly<{
  currencyCode: string
  kind: "market-approved-variant-prices"
  market: CommerceReadinessMarket
  prices: readonly Readonly<{
    amount: number
    variantId: string
  }>[]
  schemaVersion: 1
}>

export type SharedCommerceBaselineArtifact = Readonly<{
  kind: "shared-commerce-state-baseline"
  schemaVersion: 1
  sharedCatalogSha256: string
  sharedInventorySha256: string
}>

export type FourMarketReviewedArtifacts = Readonly<{
  canaries: Readonly<Record<CommerceReadinessMarket, CheckoutCanaryArtifact>>
  prices: Readonly<
    Record<CommerceReadinessMarket, MarketApprovedPricesArtifact>
  >
  sharedBaseline: SharedCommerceBaselineArtifact
}>

export type CommerceLiveState = Readonly<{
  inventoryLevels: readonly Readonly<{
    incomingQuantity: number
    inventoryItemId: string
    locationId: string
    reservedQuantity: number
    stockedQuantity: number
  }>[]
  inventoryLinks: readonly Readonly<{
    inventoryItemId: string
    requiredQuantity: number
    variantId: string
  }>[]
  paymentProviders: readonly Readonly<{ enabled: boolean; id: string }>[]
  products: readonly Readonly<{
    id: string
    salesChannelIds: readonly string[]
    variants: readonly Readonly<{
      ean: null | string
      id: string
      prices: readonly Readonly<{
        amount: number
        currencyCode: string
      }>[]
      sku: null | string
    }>[]
  }>[]
  regionPaymentProviderLinks: readonly Readonly<{
    paymentProviderId: string
    regionId: string
  }>[]
  regions: readonly Readonly<{
    countryCodes: readonly string[]
    currencyCode: string
    id: string
  }>[]
  shippingOptions: readonly Readonly<{
    countryCodes: readonly string[]
    currencyCodes: readonly string[]
    id: string
  }>[]
  taxRates: readonly Readonly<{
    enabled: boolean
    id: string
    rate: number
    taxRegionId: string
  }>[]
  taxRegions: readonly Readonly<{
    countryCode: string
    id: string
  }>[]
}>

export type MarketCommerceCollectionReceipt = Readonly<{
  authority: CommerceArtifactRef
  capturedAt: string
  kind: "four-market-commerce-collection"
  proofs: Readonly<Record<CommerceReadinessMarket, CommerceArtifactRef>>
  ready: boolean
  releaseIdentity: CommerceReleaseIdentity
  schemaVersion: 1
}>

export type BuiltCommerceCollection = Readonly<{
  bundle: FourMarketCommerceReadinessProof
  proofs: Readonly<
    Record<CommerceReadinessMarket, MarketCommerceReadinessProof>
  >
}>

export type CommerceCollectionOutput = Readonly<{
  collection: BuiltCommerceCollection
  receipt: MarketCommerceCollectionReceipt
}>

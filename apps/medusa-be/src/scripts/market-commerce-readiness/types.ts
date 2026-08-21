export const COMMERCE_READINESS_MARKETS = ["sk", "cz", "hu", "ro"] as const

export type CommerceReadinessMarket =
  (typeof COMMERCE_READINESS_MARKETS)[number]

export const COMMERCE_MARKET_CONTRACTS = {
  cz: { countryCode: "cz", currencyCode: "czk", locale: "cs-CZ" },
  hu: { countryCode: "hu", currencyCode: "huf", locale: "hu-HU" },
  ro: { countryCode: "ro", currencyCode: "ron", locale: "ro-RO" },
  sk: { countryCode: "sk", currencyCode: "eur", locale: "sk-SK" },
} as const satisfies Record<
  CommerceReadinessMarket,
  Readonly<{ countryCode: string; currencyCode: string; locale: string }>
>

export type CheckoutCanaryArtifact = Readonly<{
  artifactKind: "checkout-readiness-canary"
  checkedAt: string
  countryCode: string
  currencyCode: string
  enabledPaymentAvailable: boolean
  mutationPolicy: "no-order-no-payment-mutation"
  orderId: null
  paymentCollectionId: null
  paymentSessionId: null
  regionId: string
  salesChannelId: string
  schemaVersion: 1
  shippingAvailable: boolean
  taxAvailable: boolean
  variantId: string
}>

export type MarketCommerceReadinessInput = Readonly<{
  approvedVariantPrices: readonly Readonly<{
    amount: number
    authoritySha256: string
    currencyCode: string
    variantId: string
  }>[]
  checkoutCanary: CheckoutCanaryArtifact
  locale: string
  market: CommerceReadinessMarket
  observedVariantPrices: readonly Readonly<{
    amount: number
    currencyCode: string
    variantId: string
  }>[]
  paymentProviders: readonly Readonly<{
    enabled: boolean
    id: string
    regionIds: readonly string[]
  }>[]
  publishedVariantIds: readonly string[]
  region: Readonly<{
    countryCodes: readonly string[]
    currencyCode: string
    id: string
  }>
  salesChannelId: string
  shippingOptions: readonly Readonly<{
    countryCodes: readonly string[]
    currencyCode: string
    enabled: boolean
    id: string
    regionId: string
  }>[]
  tax: Readonly<{
    countryCode: string
    id: string
    rates: readonly Readonly<{
      enabled: boolean
      id: string
      rate: number
    }>[]
  }>
}>

export type SharedCatalogInput = Readonly<{
  productIds: readonly string[]
  reviewedSha256: string
  variants: readonly Readonly<{
    ean: null | string
    id: string
    productId: string
    sku: null | string
  }>[]
}>

export type SharedInventoryInput = Readonly<{
  links: readonly Readonly<{
    inventoryItemId: string
    requiredQuantity: number
    variantId: string
  }>[]
  levels: readonly Readonly<{
    incomingQuantity: number
    inventoryItemId: string
    locationId: string
    reservedQuantity: number
    stockedQuantity: number
  }>[]
  reviewedSha256: string
}>

export type FourMarketCommerceReadinessInput = Readonly<{
  capturedAt: string
  markets: readonly MarketCommerceReadinessInput[]
  sharedCatalog: SharedCatalogInput
  sharedInventory: SharedInventoryInput
}>

export type MarketCommerceReadinessContext = Readonly<{
  sharedCatalog: SharedCatalogInput
  sharedInventory: SharedInventoryInput
}>

export type SharedCommerceReadinessProof = Readonly<{
  observedSha256: string
  preserved: boolean
  reviewedSha256: string
}>

export type MarketCommerceReadinessProof = Readonly<{
  approvedPriceAuthoritySha256: null | string
  approvedVariantPriceCount: number
  checkoutCanary: CheckoutCanaryArtifact
  countryCode: string
  currencyCode: string
  issues: readonly string[]
  kind: "market-commerce-readiness"
  locale: string
  market: CommerceReadinessMarket
  paymentProviderIds: readonly string[]
  publishedVariantCount: number
  ready: boolean
  regionId: string
  salesChannelId: string
  schemaVersion: 1
  sharedCatalog: SharedCommerceReadinessProof
  sharedInventory: SharedCommerceReadinessProof
  shippingOptionIds: readonly string[]
  taxRateIds: readonly string[]
  taxRegionId: string
}>

export type FourMarketCommerceReadinessProof = Readonly<{
  capturedAt: string
  issues: readonly string[]
  kind: "four-market-commerce-readiness"
  markets: readonly MarketCommerceReadinessProof[]
  ready: boolean
  schemaVersion: 1
  sharedCatalog: SharedCommerceReadinessProof &
    Readonly<{ productCount: number; variantCount: number }>
  sharedInventory: SharedCommerceReadinessProof &
    Readonly<{ levelCount: number; linkCount: number }>
}>

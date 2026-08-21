export const MARKET_PRICE_TUPLES = [
  { currencyCode: "czk", marketCode: "cz" },
  { currencyCode: "huf", marketCode: "hu" },
  { currencyCode: "ron", marketCode: "ro" },
  { currencyCode: "eur", marketCode: "sk" },
] as const

export type MarketPriceMarketCode =
  (typeof MARKET_PRICE_TUPLES)[number]["marketCode"]
export type MarketPriceCurrencyCode =
  (typeof MARKET_PRICE_TUPLES)[number]["currencyCode"]

export type MarketPriceAuthorityEntry = Readonly<{
  amount: null | number
  availability: "sellable" | "unavailable"
  productId: string
  sourceRecordKey: string
  variantId: string
}>

export type MarketPriceAuthorityMarket = Readonly<{
  commercialApproval: Readonly<{
    approvedAt: string
    approvedBy: string
    reference: string
  }>
  currencyCode: MarketPriceCurrencyCode
  editor: Readonly<{
    editedAt: string
    editorId: string
    reference: string
  }>
  marketCode: MarketPriceMarketCode
  prices: readonly MarketPriceAuthorityEntry[]
  rawSource: Readonly<{
    provenance: Readonly<{
      locator: string
      retrievedAt: string
      sourceType: string
    }>
    sha256: string
  }>
  salesChannelId: string
}>

export type MarketPriceAuthority = Readonly<{
  amountUnit: "major"
  kind: "reviewed-market-price-authority"
  markets: readonly MarketPriceAuthorityMarket[]
  priceDerivation: "direct-reviewed-source"
  schemaVersion: 1
}>

export type MarketPriceDatabaseRule = Readonly<{
  attribute: string
  operator: string
  value: unknown
}>

export type MarketPriceDatabasePrice = Readonly<{
  amount: number
  currencyCode: string
  id: string
  maxQuantity: null | number
  minQuantity: null | number
  priceListId: null | string
  rules: readonly MarketPriceDatabaseRule[]
}>

export type MarketPriceDatabaseSnapshot = Readonly<{
  products: readonly Readonly<{
    id: string
    salesChannelIds: readonly string[]
    status: string
    variants: readonly Readonly<{
      id: string
      priceSetId: string
      prices: readonly MarketPriceDatabasePrice[]
    }>[]
  }>[]
}>

export type MarketPricePlanMutation = Readonly<{
  action: "create" | "remove" | "unchanged" | "update"
  currentAmount: null | number
  currentPriceId: null | string
  currencyCode: MarketPriceCurrencyCode
  desiredAmount: null | number
  marketCode: MarketPriceMarketCode
  productId: string
  sourceRecordKey: string
  variantId: string
}>

export type MarketPricePlan = Readonly<{
  authoritySha256: string
  databaseSnapshotSha256: string
  kind: "market-price-authority-dry-run-plan"
  markets: readonly Readonly<{
    create: number
    currencyCode: MarketPriceCurrencyCode
    marketCode: MarketPriceMarketCode
    remove: number
    salesChannelId: string
    unchanged: number
    update: number
    visibleProducts: number
    visibleVariants: number
  }>[]
  mutations: readonly MarketPricePlanMutation[]
  schemaVersion: 1
  summary: Readonly<{
    create: number
    markets: 4
    remove: number
    unchanged: number
    update: number
    visibleProducts: number
    visibleVariants: number
  }>
}>

export type MarketPricePlanArtifact = Readonly<{
  kind: "market-price-authority-dry-run-plan-artifact"
  plan: MarketPricePlan
  planSha256: string
  schemaVersion: 1
}>

export type MarketPriceAuthorityCliOptions = Readonly<{
  authorityPath: string
  expectedAuthoritySha256: string
  planOutputPath: string
  rawSourcePaths: Readonly<Record<MarketPriceMarketCode, string>>
}>

export const RO_DEMO_MARKET = "ro" as const
export const RO_DEMO_LOCALE = "ro-RO" as const
export const RO_DEMO_SOURCE = "herbatica-ro-demo-commerce-v1" as const

export type RoDemoCheckoutMarker = Readonly<{
  binding_sha256: string
  label: "Plată demo (fără debitare)"
  locale: typeof RO_DEMO_LOCALE
  market: typeof RO_DEMO_MARKET
  payment_mode: "no-debit-demo"
  provider_id: "pp_system_default"
  schema_version: 1
  source: typeof RO_DEMO_SOURCE
}>

export type RoDemoBinding = Readonly<{
  codProviderId: string
  fulfillmentProviderId: string
  fulfillmentSetId: string
  gopayProviderIds: readonly string[]
  regionName: string
  salesChannelId: string
  shippingProfileId: string
  systemPaymentProviderId: string
}>

type RoDemoManifestBase = Readonly<{
  binding: RoDemoBinding
  demo: true
  locale: typeof RO_DEMO_LOCALE
  market: typeof RO_DEMO_MARKET
  schemaVersion: 1
}>

export type RoDemoManifest = RoDemoManifestBase &
  (
    | Readonly<{
        catalogManifestPath: string
        priceAuthorityPath?: never
      }>
    | Readonly<{
        catalogManifestPath?: never
        priceAuthorityPath: string
      }>
  )

export type RoDemoPriceDirective = Readonly<{
  amount: number | null
  expectedLiveIdentity: null | Readonly<{
    ean: null | string
    productId: string
    sku: null | string
    variantId: string
  }>
  key: Readonly<{ kind: "ean" | "sku" | "variant_id"; value: string }>
  roAvailability: "sellable" | "unavailable"
}>

export type RoDemoPriceAuthority = Readonly<{
  inventoryIdentity:
    | null
    | readonly Readonly<{
        productId: string
        variants: readonly Readonly<{
          ean: null | string
          liveSku: null | string
          variantId: string
        }>[]
      }>[]
  inventoryIdentitySha256: null | string
  kind: "catalog-manifest" | "ro-demo-precommerce-price-authority"
  variants: readonly RoDemoPriceDirective[]
}>

export type RoDemoDeploymentIdentity = Readonly<{
  backendBuildHash: string
  backendDeploymentId: string
  backendReleaseSha: string
  backendSlot: "blue" | "green"
  databaseFingerprint: string
  environmentId: string
}>

export type RoDemoCliOptions = Readonly<{
  apply: boolean
  confirmPlanHash?: string
  demo: boolean
  manifestPath: string
  planOutputPath: string
  expectedDeployment: RoDemoDeploymentIdentity
  receiptOutputPath?: string
  restoreOutputPath?: string
}>

export type RoDemoPrice = Readonly<{
  amount: number
  currencyCode: string
  id?: string
  maxQuantity: null | number
  minQuantity: null | number
  priceListId: null | string
  rules: readonly Readonly<{
    attribute: string
    operator: string
    value: unknown
  }>[]
}>

export type RoDemoSnapshot = Readonly<{
  fulfillmentProviderIds: readonly string[]
  fulfillmentSetIds: readonly string[]
  paymentProviders: readonly Readonly<{ enabled: boolean; id: string }>[]
  pricePreferences: readonly Readonly<{
    attribute: "currency_code" | "region_id"
    id: string
    isTaxInclusive: boolean
    value: string
  }>[]
  regions: readonly Readonly<{
    countryCodes: readonly string[]
    currencyCode: string
    id: string
    isTaxInclusive: boolean
    metadata: Readonly<Record<string, unknown>>
    name: string
    paymentProviderIds: readonly string[]
  }>[]
  salesChannelIds: readonly string[]
  serviceZones: readonly Readonly<{
    countryCodes: readonly string[]
    fulfillmentSetId: string
    id: string
    name: string
  }>[]
  shippingOptions: readonly Readonly<{
    code: string
    id: string
    source: null | string
  }>[]
  shippingProfileIds: readonly string[]
  stores: readonly Readonly<{
    id: string
    supportedCurrencies: readonly Readonly<{
      currencyCode: string
      isDefault: boolean
    }>[]
  }>[]
  taxRates: readonly Readonly<{
    id: string
    isDefault: boolean
    metadata: Readonly<Record<string, unknown>>
    productIds: readonly string[]
    rate: number
    taxRegionId: string
  }>[]
  taxRegions: readonly Readonly<{
    countryCode: string
    id: string
  }>[]
  variants: readonly Readonly<{
    ean: null | string
    id: string
    metadata: Readonly<Record<string, unknown>>
    prices: readonly RoDemoPrice[]
    productId: string
    productMetadata: Readonly<Record<string, unknown>>
    sku: null | string
  }>[]
}>

export type RoDemoVariantPriceMutation = Readonly<{
  action: "create" | "unchanged" | "update"
  amount: number
  currentRonPrice: RoDemoPrice | null
  productId: string
  variantId: string
}>

export type RoDemoTaxAssignment = Readonly<{
  productId: string
  rate: 11 | 21
  source: "demo-default" | "product-metadata"
}>

export type RoDemoCommercePlan = Readonly<{
  binding: RoDemoBinding
  codPolicy: Readonly<{
    configuredFee: 9.45
    configuredMinimumOrder: 40
    enabled: false
    reason: string
  }>
  detachRomaniaFromRegion: null | Readonly<{
    currentCountryCodes: readonly string[]
    regionId: string
  }>
  deploymentIdentity: RoDemoDeploymentIdentity
  market: typeof RO_DEMO_MARKET
  payment: Readonly<{
    demoCheckout: null | RoDemoCheckoutMarker
    displayLabel: string
    fallback: boolean
    providerId: string
    providerIds: readonly string[]
  }>
  inventoryIdentitySha256: null | string
  priceAuthorityKind: RoDemoPriceAuthority["kind"]
  priceAuthoritySha256: string
  pricePreferences: Readonly<{
    currency: Readonly<{
      action: "create" | "unchanged" | "update"
      existingId: null | string
    }>
    region: Readonly<{
      action: "create" | "create-after-region" | "unchanged" | "update"
      existingId: null | string
    }>
  }>
  region: Readonly<{
    action: "create" | "unchanged" | "update"
    existingId: null | string
    metadata: Readonly<Record<string, unknown>>
    name: string
    ownsRomaniaBeforeApply: boolean
    paymentProviderIds: readonly string[]
  }>
  salesChannelId: string
  skBaselineHash: string
  serviceZone: Readonly<{
    action: "create" | "unchanged"
    existingId: null | string
    name: "Herbatica Romania Demo"
  }>
  shipping: readonly Readonly<{
    action: "create" | "update"
    amount: number
    code:
      | "ro-demo-cargus"
      | "ro-demo-packeta-address"
      | "ro-demo-packeta-pickup"
    freeFrom?: 249
    existingId: null | string
    label: string
  }>[]
  storeCurrency: Readonly<{
    action: "unchanged" | "update"
    existingCurrencies: readonly Readonly<{
      currencyCode: string
      isDefault: boolean
    }>[]
    storeId: string
  }>
  taxAssignments: readonly RoDemoTaxAssignment[]
  taxRates: Readonly<{
    elevenAction: "create" | "unchanged" | "update"
    existingOwnedElevenId: null | string
    existingOwnedTwentyOneId: null | string
    twentyOneAction: "create" | "unchanged" | "update"
  }>
  taxRegion: Readonly<{
    action: "create" | "unchanged"
    existingId: null | string
  }>
  variantPrices: readonly RoDemoVariantPriceMutation[]
  warnings: readonly string[]
}>

export type RoDemoLoadedInput = Readonly<{
  absoluteManifestPath: string
  manifest: RoDemoManifest
  priceAuthority: RoDemoPriceAuthority
  priceAuthorityPath: string
  priceAuthoritySha256: string
}>

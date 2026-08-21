import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { CASH_ON_DELIVERY_MEDUSA_PAYMENT_PROVIDER_ID } from "../modules/payment-cash-on-delivery/constants"
import { SYSTEM_DEFAULT_PAYMENT_PROVIDER_ID } from "../workflows/seed/constants"

type QueryService = Readonly<{
  graph: <T>(
    input: Readonly<{
      entity: string
      fields: readonly string[]
      filters?: Readonly<Record<string, unknown>>
    }>
  ) => Promise<Readonly<{ data?: T[] }>>
}>

type HerbaticaPaymentSeedRegion = {
  countryCodes: string[]
  currencyCode: string
  id: string
  paymentProviderIds: string[]
}

type HerbaticaPaymentSeedShippingOption = {
  data: Record<string, unknown>
  id: string
  name: string
}

export type HerbaticaPaymentSeedSnapshot = {
  enabledPaymentProviderIds: string[]
  regions: HerbaticaPaymentSeedRegion[]
  shippingOptions: HerbaticaPaymentSeedShippingOption[]
}

const HERBATICA_MARKET_PAYMENT_AUTHORITY = [
  { countryCode: "sk", currencyCode: "eur" },
  { countryCode: "cz", currencyCode: "czk" },
  { countryCode: "hu", currencyCode: "huf" },
  { countryCode: "ro", currencyCode: "ron" },
] as const

const exactString = (value: unknown, label: string) => {
  if (typeof value !== "string" || !value.trim() || value !== value.trim()) {
    throw new Error(`Herbatica payment seed returned invalid ${label}`)
  }
  return value
}

const isCashOnDeliveryShippingOption = (
  option: HerbaticaPaymentSeedShippingOption
) => {
  const code =
    typeof option.data.code === "string"
      ? option.data.code.trim().toLowerCase()
      : ""
  return (
    option.data.supports_cod === true ||
    code === "z_point_cod" ||
    code.endsWith("_cod") ||
    code.endsWith("-cod")
  )
}

export const isHerbaticaPaymentProviderCompatibleWithShipping = (
  paymentProviderId: string,
  shippingOption: HerbaticaPaymentSeedShippingOption
) => {
  if (paymentProviderId === SYSTEM_DEFAULT_PAYMENT_PROVIDER_ID) {
    return false
  }
  const cashOnDeliveryShipping = isCashOnDeliveryShippingOption(shippingOption)
  if (cashOnDeliveryShipping) {
    return paymentProviderId === CASH_ON_DELIVERY_MEDUSA_PAYMENT_PROVIDER_ID
  }
  return paymentProviderId !== CASH_ON_DELIVERY_MEDUSA_PAYMENT_PROVIDER_ID
}

const resolveMarketRegion = (
  regions: HerbaticaPaymentSeedRegion[],
  expected: (typeof HERBATICA_MARKET_PAYMENT_AUTHORITY)[number]
) => {
  const matches = regions.filter(
    (candidate) => candidate.currencyCode === expected.currencyCode
  )
  const resolved = matches[0]
  if (
    matches.length !== 1 ||
    !resolved ||
    resolved.countryCodes.length !== 1 ||
    resolved.countryCodes[0] !== expected.countryCode
  ) {
    throw new Error(
      `Herbatica payment seed requires exact ${expected.countryCode.toUpperCase()}/${expected.currencyCode.toUpperCase()} region identity`
    )
  }
  return resolved
}

const assertEnabledRegionProviders = (
  region: HerbaticaPaymentSeedRegion,
  countryCode: string,
  enabledProviderIds: Set<string>
) => {
  const uniqueProviderIds = new Set(region.paymentProviderIds)
  const hasInvalidProvider = region.paymentProviderIds.some(
    (providerId) =>
      providerId === SYSTEM_DEFAULT_PAYMENT_PROVIDER_ID ||
      !enabledProviderIds.has(providerId)
  )
  if (
    !region.paymentProviderIds.length ||
    uniqueProviderIds.size !== region.paymentProviderIds.length ||
    hasInvalidProvider
  ) {
    throw new Error(
      `Herbatica ${countryCode.toUpperCase()} region requires enabled non-system payment providers`
    )
  }
}

export function assertHerbaticaPaymentSeedSnapshot(
  snapshot: HerbaticaPaymentSeedSnapshot
) {
  const enabledProviderIds = new Set(snapshot.enabledPaymentProviderIds)
  if (
    enabledProviderIds.size !== snapshot.enabledPaymentProviderIds.length ||
    enabledProviderIds.has(SYSTEM_DEFAULT_PAYMENT_PROVIDER_ID)
  ) {
    throw new Error(
      "Herbatica payment seed requires unique enabled non-system payment providers"
    )
  }

  if (snapshot.regions.length !== HERBATICA_MARKET_PAYMENT_AUTHORITY.length) {
    throw new Error(
      "Herbatica payment seed requires exactly four market regions"
    )
  }

  for (const expected of HERBATICA_MARKET_PAYMENT_AUTHORITY) {
    const region = resolveMarketRegion(snapshot.regions, expected)
    assertEnabledRegionProviders(
      region,
      expected.countryCode,
      enabledProviderIds
    )
  }

  if (!snapshot.shippingOptions.length) {
    throw new Error("Herbatica payment seed requires shipping options")
  }

  for (const option of snapshot.shippingOptions) {
    for (const region of snapshot.regions) {
      const compatibleProvider = region.paymentProviderIds.some((providerId) =>
        isHerbaticaPaymentProviderCompatibleWithShipping(providerId, option)
      )
      if (!compatibleProvider) {
        throw new Error(
          `Herbatica shipping option "${option.name}" has no compatible payment provider for ${region.currencyCode.toUpperCase()}`
        )
      }
    }
  }
}

export function assertHerbaticaPaymentSeedInput({
  regions,
  shippingOptions,
}: {
  regions: Array<{
    countries?: string[]
    currencyCode: string
    paymentProviders?: string[]
  }>
  shippingOptions: Array<{
    data?: Record<string, unknown>
    name: string
  }>
}) {
  const paymentProviderIds = [
    ...new Set(regions.flatMap((region) => region.paymentProviders ?? [])),
  ]
  assertHerbaticaPaymentSeedSnapshot({
    enabledPaymentProviderIds: paymentProviderIds,
    regions: regions.map((region, index) => ({
      countryCodes: (region.countries ?? []).map((country) =>
        country.toLowerCase()
      ),
      currencyCode: region.currencyCode.toLowerCase(),
      id: `preflight-region-${index}`,
      paymentProviderIds: region.paymentProviders ?? [],
    })),
    shippingOptions: shippingOptions.map((option, index) => ({
      data: option.data ?? {},
      id: `preflight-shipping-option-${index}`,
      name: option.name,
    })),
  })
}

type RegionRow = {
  countries?: readonly { iso_2?: unknown }[]
  currency_code?: unknown
  id?: unknown
  payment_providers?: readonly { id?: unknown }[]
}

type ShippingOptionRow = {
  data?: unknown
  id?: unknown
  name?: unknown
}

type PaymentProviderRow = {
  id?: unknown
  is_enabled?: unknown
}

const assertExactIds = (
  actualIds: string[],
  expectedIds: string[],
  label: string
) => {
  const actual = [...new Set(actualIds)].sort()
  const expected = [...new Set(expectedIds)].sort()
  if (
    actual.length !== expected.length ||
    actual.some((id, index) => id !== expected[index])
  ) {
    throw new Error(`Herbatica payment seed could not resolve exact ${label}`)
  }
}

export async function verifyHerbaticaPaymentSeedResult({
  container,
  regionIds,
  shippingOptionIds,
}: {
  container: ExecArgs["container"]
  regionIds: string[]
  shippingOptionIds: string[]
}) {
  if (
    new Set(regionIds).size !== HERBATICA_MARKET_PAYMENT_AUTHORITY.length ||
    new Set(shippingOptionIds).size !== shippingOptionIds.length ||
    !shippingOptionIds.length
  ) {
    throw new Error(
      "Herbatica payment seed returned invalid region or shipping-option identities"
    )
  }

  const query = container.resolve<QueryService>(ContainerRegistrationKeys.QUERY)
  const [{ data: regionRows = [] }, { data: shippingOptionRows = [] }] =
    await Promise.all([
      query.graph<RegionRow>({
        entity: "region",
        fields: [
          "id",
          "currency_code",
          "countries.iso_2",
          "payment_providers.id",
        ],
        filters: { id: regionIds },
      }),
      query.graph<ShippingOptionRow>({
        entity: "shipping_option",
        fields: ["id", "name", "data"],
        filters: { id: shippingOptionIds },
      }),
    ])

  const regions = regionRows.map((region, regionIndex) => ({
    id: exactString(region.id, `region ${regionIndex} id`),
    currencyCode: exactString(
      region.currency_code,
      `region ${regionIndex} currency`
    ).toLowerCase(),
    countryCodes: (region.countries ?? []).map((country, countryIndex) =>
      exactString(
        country.iso_2,
        `region ${regionIndex} country ${countryIndex}`
      ).toLowerCase()
    ),
    paymentProviderIds: (region.payment_providers ?? []).map(
      (provider, providerIndex) =>
        exactString(
          provider.id,
          `region ${regionIndex} provider ${providerIndex}`
        )
    ),
  }))
  const shippingOptions = shippingOptionRows.map((option, optionIndex) => ({
    id: exactString(option.id, `shipping option ${optionIndex} id`),
    name: exactString(option.name, `shipping option ${optionIndex} name`),
    data:
      typeof option.data === "object" &&
      option.data !== null &&
      !Array.isArray(option.data)
        ? (option.data as Record<string, unknown>)
        : {},
  }))

  assertExactIds(
    regions.map(({ id }) => id),
    regionIds,
    "market regions"
  )
  assertExactIds(
    shippingOptions.map(({ id }) => id),
    shippingOptionIds,
    "shipping options"
  )

  const requestedProviderIds = [
    ...new Set(regions.flatMap(({ paymentProviderIds }) => paymentProviderIds)),
  ]
  const { data: providerRows = [] } = await query.graph<PaymentProviderRow>({
    entity: "payment_provider",
    fields: ["id", "is_enabled"],
    filters: { id: requestedProviderIds },
  })
  const enabledPaymentProviderIds = providerRows.flatMap(
    (provider, providerIndex) =>
      provider.is_enabled === true
        ? [exactString(provider.id, `payment provider ${providerIndex} id`)]
        : []
  )

  const snapshot = {
    enabledPaymentProviderIds,
    regions,
    shippingOptions,
  } satisfies HerbaticaPaymentSeedSnapshot
  assertHerbaticaPaymentSeedSnapshot(snapshot)
  return snapshot
}

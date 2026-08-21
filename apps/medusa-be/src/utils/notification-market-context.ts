import type { MedusaContainer, Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import {
  type ResendEmailLocale,
  resendEmailLocales,
} from "../modules/resend/contracts"
import { STOREFRONT_TEXT_MARKETS } from "../modules/storefront-text/configuration"

export type NotificationMarketContextInput = {
  countryCode?: string | null
  salesChannelId?: string | null
}

export type NotificationMarketContext = {
  country_code: string
  locale: ResendEmailLocale
  market_code: string
  sales_channel_id?: string
  store_name: string
  storefront_base_url: string
  storefront_domain: string
}

type NotificationMarketConfiguration = {
  country_code: string
  expected_currency_code?: string
  locale: ResendEmailLocale
  market_code: string
  store_name: string
  storefront_domain: string
}

type SalesChannelRecord = {
  id: string
  metadata?: Record<string, unknown> | null
}

type RegionRecord = {
  countries?: Array<{ iso_2?: string | null }> | null
  currency_code?: string | null
  id: string
}

const PAGE_SIZE = 100
const MARKET_CONFIGURATION_KEY = "storefront_notification_markets"
const MAXIMUM_HOSTNAME_LENGTH = 253
const HOSTNAME_LABEL_PATTERN = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/u
const NOTIFICATION_MARKET_CURRENCIES = {
  cz: "czk",
  hu: "huf",
  ro: "ron",
  sk: "eur",
} as const satisfies Record<
  (typeof STOREFRONT_TEXT_MARKETS)[number]["market"],
  string
>

function normalize(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function normalizeCode(value: unknown) {
  return normalize(value).toLowerCase()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isSupportedLocale(value: string): value is ResendEmailLocale {
  return resendEmailLocales.some((locale) => locale === value)
}

function isValidStorefrontHostname(value: string) {
  return (
    value.length <= MAXIMUM_HOSTNAME_LENGTH &&
    value.split(".").every((label) => HOSTNAME_LABEL_PATTERN.test(label))
  )
}

function isSalesChannelRecord(value: unknown): value is SalesChannelRecord {
  return isRecord(value) && typeof value.id === "string"
}

function isRegionRecord(value: unknown): value is RegionRecord {
  return isRecord(value) && typeof value.id === "string"
}

function parseMarketConfiguration(
  authorityKey: string,
  enforceCanonicalAuthority: boolean,
  value: unknown
): NotificationMarketConfiguration {
  if (!isRecord(value)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Notification market configuration is invalid."
    )
  }

  const countryCode = normalizeCode(value.country_code)
  const locale = normalize(value.locale)
  const marketCode = normalizeCode(value.market_code)
  const normalizedAuthorityKey = normalizeCode(authorityKey)
  const storeName = normalize(value.store_name)
  const storefrontDomain = normalizeCode(value.storefront_domain)

  if (
    !(
      countryCode &&
      isSupportedLocale(locale) &&
      marketCode &&
      storeName &&
      storefrontDomain &&
      isValidStorefrontHostname(storefrontDomain)
    )
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Notification market configuration is incomplete."
    )
  }

  const authority = STOREFRONT_TEXT_MARKETS.find(
    (market) => market.market === marketCode
  )
  if (
    enforceCanonicalAuthority &&
    (!authority ||
      normalizedAuthorityKey !== marketCode ||
      authority.country !== countryCode ||
      authority.locale !== locale ||
      authority.domain !== storefrontDomain)
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Notification market configuration does not match its canonical authority."
    )
  }

  return {
    country_code: countryCode,
    ...(authority
      ? {
          expected_currency_code:
            NOTIFICATION_MARKET_CURRENCIES[authority.market],
        }
      : {}),
    locale,
    market_code: marketCode,
    store_name: storeName,
    storefront_domain: storefrontDomain,
  }
}

function getChannelMarkets(
  channel: SalesChannelRecord,
  enforceCanonicalAuthority = false
) {
  const value = channel.metadata?.[MARKET_CONFIGURATION_KEY]
  if (!isRecord(value)) {
    return []
  }

  return Object.entries(value).map(([authorityKey, configuration]) =>
    parseMarketConfiguration(
      authorityKey,
      enforceCanonicalAuthority,
      configuration
    )
  )
}

export function salesChannelSupportsMarket(
  channel: unknown,
  marketCode: string
): boolean {
  if (!isSalesChannelRecord(channel)) {
    return false
  }
  const normalizedMarketCode = normalizeCode(marketCode)
  return getChannelMarkets(channel).some(
    (configuration) => configuration.country_code === normalizedMarketCode
  )
}

async function listAll<T>(
  query: Query,
  entity: string,
  fields: string[],
  isExpectedRecord: (value: unknown) => value is T
): Promise<T[]> {
  const records: T[] = []
  let skip = 0

  while (true) {
    const result = await query.graph({
      entity,
      fields,
      pagination: { skip, take: PAGE_SIZE },
    })
    const page = result.data
    if (!(Array.isArray(page) && page.every(isExpectedRecord))) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Invalid ${entity} data returned while resolving notification context.`
      )
    }
    records.push(...page)

    if (page.length < PAGE_SIZE) {
      return records
    }

    skip += page.length
  }
}

async function assertRegionConfiguration(
  query: Query,
  market: NotificationMarketConfiguration
) {
  const regions = await listAll<RegionRecord>(
    query,
    "region",
    ["id", "currency_code", "countries.iso_2"],
    isRegionRecord
  )
  const matchingRegions = regions.filter((region) =>
    region.countries?.some(
      (country) => normalizeCode(country.iso_2) === market.country_code
    )
  )

  if (matchingRegions.length !== 1) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Notification market must match exactly one configured Medusa region."
    )
  }

  if (
    normalizeCode(matchingRegions[0]?.currency_code) !==
    market.expected_currency_code
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Notification market region must use its canonical currency."
    )
  }
}

function toContext(
  market: NotificationMarketConfiguration,
  salesChannelId?: string
): NotificationMarketContext {
  return {
    country_code: market.country_code,
    locale: market.locale,
    market_code: market.market_code,
    ...(salesChannelId ? { sales_channel_id: salesChannelId } : {}),
    store_name: market.store_name,
    storefront_base_url: `https://${market.storefront_domain}`,
    storefront_domain: market.storefront_domain,
  }
}

export async function resolveNotificationMarketContext(
  container: MedusaContainer,
  { countryCode, salesChannelId }: NotificationMarketContextInput
): Promise<NotificationMarketContext> {
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const normalizedCountryCode = normalizeCode(countryCode)
  const normalizedSalesChannelId = normalize(salesChannelId)
  const channels = await listAll<SalesChannelRecord>(
    query,
    "sales_channel",
    ["id", "metadata"],
    isSalesChannelRecord
  )
  const configuredChannels = channels.map((salesChannel) => ({
    marketConfigurations: getChannelMarkets(salesChannel, true),
    salesChannel,
  }))
  const claimedMarketCodes = new Set<string>()
  for (const { marketConfigurations } of configuredChannels) {
    for (const configuration of marketConfigurations) {
      if (claimedMarketCodes.has(configuration.market_code)) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Notification market authority must be unique across Sales Channels."
        )
      }
      claimedMarketCodes.add(configuration.market_code)
    }
  }
  const eligibleChannels = normalizedSalesChannelId
    ? configuredChannels.filter(
        ({ salesChannel }) => salesChannel.id === normalizedSalesChannelId
      )
    : configuredChannels.filter(
        ({ marketConfigurations }) => marketConfigurations.length > 0
      )

  const candidates = eligibleChannels.flatMap(
    ({ marketConfigurations, salesChannel }) =>
      marketConfigurations
        .filter(
          (configuration) =>
            !normalizedCountryCode ||
            configuration.country_code === normalizedCountryCode
        )
        .map((configuration) => ({
          marketConfiguration: configuration,
          salesChannel,
        }))
  )

  if (candidates.length !== 1) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Notification market cannot be resolved unambiguously from Sales Channel metadata."
    )
  }

  const candidate = candidates[0]
  if (!candidate) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Notification market resolution produced no candidate."
    )
  }

  const { marketConfiguration, salesChannel: resolvedSalesChannel } = candidate
  await assertRegionConfiguration(query, marketConfiguration)

  return toContext(marketConfiguration, resolvedSalesChannel.id)
}

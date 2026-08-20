import type { MedusaContainer, Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import {
  type ResendEmailLocale,
  resendEmailLocales,
} from "../modules/resend/contracts"

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
  id: string
}

const PAGE_SIZE = 100
const MARKET_CONFIGURATION_KEY = "storefront_notification_markets"
const MAXIMUM_HOSTNAME_LENGTH = 253
const HOSTNAME_LABEL_PATTERN = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/u

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

  return {
    country_code: countryCode,
    locale,
    market_code: marketCode,
    store_name: storeName,
    storefront_domain: storefrontDomain,
  }
}

function getChannelMarkets(channel: SalesChannelRecord) {
  const value = channel.metadata?.[MARKET_CONFIGURATION_KEY]
  if (!isRecord(value)) {
    return []
  }

  return Object.values(value).map(parseMarketConfiguration)
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
    ["id", "countries.iso_2"],
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
  const eligibleChannels = normalizedSalesChannelId
    ? channels.filter((channel) => channel.id === normalizedSalesChannelId)
    : channels.filter((channel) => getChannelMarkets(channel).length > 0)

  const candidates = eligibleChannels.flatMap((channel) =>
    getChannelMarkets(channel)
      .filter(
        (configuration) =>
          !normalizedCountryCode ||
          configuration.country_code === normalizedCountryCode
      )
      .map((configuration) => ({
        marketConfiguration: configuration,
        salesChannel: channel,
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

  const { marketConfiguration, salesChannel } = candidate
  await assertRegionConfiguration(query, marketConfiguration)

  return toContext(marketConfiguration, salesChannel.id)
}

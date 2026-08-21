import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { STOREFRONT_TEXT_MARKETS } from "../../modules/storefront-text/configuration"

type StorefrontTransportRequest = MedusaRequest & {
  filterableFields?: Record<string, unknown>
  locale?: string
  publishable_key_context?: {
    sales_channel_ids?: unknown
  } | null
}

type SalesChannelRecord = {
  id?: unknown
  metadata?: unknown
}

const MARKET_CONFIGURATION_KEY = "storefront_notification_markets"

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value)

const failMarketScope = (message: string): never => {
  throw new MedusaError(MedusaError.Types.INVALID_DATA, message)
}

const resolveExactPublishableSalesChannelId = (
  request: StorefrontTransportRequest
): string => {
  const salesChannelIds = request.publishable_key_context?.sales_channel_ids

  if (
    !Array.isArray(salesChannelIds) ||
    salesChannelIds.length !== 1 ||
    typeof salesChannelIds[0] !== "string" ||
    !salesChannelIds[0].trim() ||
    salesChannelIds[0] !== salesChannelIds[0].trim()
  ) {
    return failMarketScope(
      "Storefront publishable key must bind exactly one Sales Channel."
    )
  }

  return salesChannelIds[0]
}

const resolveExpectedMarket = (locale: string) => {
  const expectedMarket = STOREFRONT_TEXT_MARKETS.find(
    (candidate) => candidate.locale === locale
  )
  if (!expectedMarket) {
    return failMarketScope(
      "Storefront locale has no canonical market authority."
    )
  }

  return expectedMarket
}

const assertExactMarketBinding = (
  channel: SalesChannelRecord,
  expectedMarket: (typeof STOREFRONT_TEXT_MARKETS)[number],
  salesChannelId: string
) => {
  if (channel.id !== salesChannelId) {
    return failMarketScope(
      "Storefront Sales Channel authority could not be resolved exactly."
    )
  }

  const metadata = isRecord(channel.metadata) ? channel.metadata : undefined
  const rawBindings = metadata?.[MARKET_CONFIGURATION_KEY]
  const bindings = isRecord(rawBindings) ? Object.entries(rawBindings) : []

  if (bindings.length !== 1) {
    return failMarketScope(
      "Storefront Sales Channel must bind exactly one canonical market."
    )
  }

  const [marketKey, rawBinding] = bindings[0] ?? []
  const binding = isRecord(rawBinding) ? rawBinding : undefined
  if (
    marketKey !== expectedMarket.market ||
    binding?.country_code !== expectedMarket.country ||
    binding?.locale !== expectedMarket.locale ||
    binding?.market_code !== expectedMarket.market ||
    binding?.storefront_domain !== expectedMarket.domain
  ) {
    return failMarketScope(
      "Storefront Sales Channel does not match the requested market."
    )
  }
}

export const enforceExactStorefrontMarketSalesChannel = async (
  req: MedusaRequest,
  _res: MedusaResponse,
  next: MedusaNextFunction
) => {
  const request = req as StorefrontTransportRequest
  const salesChannelId = resolveExactPublishableSalesChannelId(request)
  const locale = request.locale

  if (typeof locale !== "string" || !locale) {
    return failMarketScope("Storefront locale is required for market scope.")
  }
  const expectedMarket = resolveExpectedMarket(locale)

  const query = request.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "metadata"],
    filters: { id: salesChannelId },
    pagination: { take: 2 },
  })

  if (data.length !== 1) {
    return failMarketScope(
      "Storefront Sales Channel authority could not be resolved exactly."
    )
  }

  assertExactMarketBinding(
    data[0] as SalesChannelRecord,
    expectedMarket,
    salesChannelId
  )

  request.filterableFields = {
    ...(request.filterableFields ?? {}),
    sales_channel_id: [salesChannelId],
  }
  next()
}

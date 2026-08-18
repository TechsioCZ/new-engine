import type { RegionInfo } from "@techsio/storefront-data/shared/region"
import type { FlatStorefrontMessages } from "@techsio/storefront-i18n/core/messages"
import {
  type NestedStorefrontMessages,
  nestStorefrontMessages,
} from "@techsio/storefront-i18n/core/messages"
import type { MarketCode } from "@/lib/market/market-runtime"
import type { SourceReadResult } from "@/lib/url-registry/contracts"
import { normalizeSupportedCurrencyCode } from "./currency"
import {
  getHerbatikaMarketContext,
  type HerbatikaMarketContext,
} from "./market-context"
import type {
  ProductRouteMedusaProduct,
  ProductRouteSourceMarketBinding,
} from "./product-route-source"

export type ProductPageRegion = RegionInfo &
  Readonly<{
    country_code: string
    currency_code: string
    region_id: string
    salesChannelId: string
  }>

export type ProductPageContext = Readonly<{
  locale: string
  marketContext: HerbatikaMarketContext
  messages: NestedStorefrontMessages
  region: ProductPageRegion
}>

export type ProductPageContextLoadMessagesInput = Readonly<{
  binding: ProductRouteSourceMarketBinding
  locale: string
  market: MarketCode
}>

export type ProductPageContextDependencies = Readonly<{
  loadMessages(
    input: ProductPageContextLoadMessagesInput
  ): Promise<FlatStorefrontMessages>
  resolveMarket(market: MarketCode): ProductRouteSourceMarketBinding | null
}>

export type ProductPageContextRequest = Readonly<{
  initialVariantId?: string
  market: MarketCode
  product: ProductRouteMedusaProduct
}>

const validBinding = (
  binding: ProductRouteSourceMarketBinding | null,
  market: MarketCode,
  marketContext: HerbatikaMarketContext
): binding is ProductRouteSourceMarketBinding =>
  Boolean(
    binding &&
      binding.market === market &&
      binding.locale === marketContext.locale &&
      binding.countryCode.toLowerCase() === marketContext.countryCode &&
      binding.regionId.trim() &&
      binding.salesChannelId.trim()
  )

const resolveProductCurrency = (
  product: ProductRouteMedusaProduct,
  initialVariantId: string | undefined
) => {
  const selectedVariant = initialVariantId
    ? product.variants.find((variant) => variant.id === initialVariantId)
    : product.variants[0]

  if (!selectedVariant) {
    return null
  }

  return normalizeSupportedCurrencyCode(
    selectedVariant.calculated_price?.currency_code
  )
}

export const readProductPageContext = async (
  { initialVariantId, market, product }: ProductPageContextRequest,
  dependencies: ProductPageContextDependencies
): Promise<SourceReadResult<ProductPageContext>> => {
  const marketContext = getHerbatikaMarketContext(market)
  const binding = dependencies.resolveMarket(market)
  if (!validBinding(binding, market, marketContext)) {
    return {
      causeCode: "INVALID_PRODUCT_PAGE_MARKET_BINDING",
      kind: "invalid-response",
    }
  }

  const currencyCode = resolveProductCurrency(product, initialVariantId)
  if (!currencyCode || currencyCode !== marketContext.currencyCode) {
    return {
      causeCode: "INVALID_PRODUCT_PAGE_CURRENCY",
      kind: "invalid-response",
    }
  }

  let flatMessages: FlatStorefrontMessages
  try {
    flatMessages = await dependencies.loadMessages({
      binding,
      locale: binding.locale,
      market,
    })
  } catch {
    return { kind: "unavailable" }
  }

  let messages: NestedStorefrontMessages
  try {
    messages = nestStorefrontMessages(flatMessages)
  } catch {
    return {
      causeCode: "INVALID_PRODUCT_PAGE_MESSAGES",
      kind: "invalid-response",
    }
  }

  return {
    kind: "found",
    value: {
      locale: binding.locale,
      marketContext,
      messages,
      region: {
        country_code: binding.countryCode.toLowerCase(),
        currency_code: currencyCode,
        region_id: binding.regionId,
        salesChannelId: binding.salesChannelId,
      },
    },
  }
}

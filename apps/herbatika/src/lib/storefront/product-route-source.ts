import type { HttpTypes } from "@medusajs/types"
import type {
  MarketCode,
  MarketRuntimeBinding,
} from "@/lib/market/market-runtime"
import type { SourceReadResult } from "@/lib/url-registry/contracts"
import { PRODUCT_DETAIL_FIELDS } from "./product-query-config"

export type ProductRouteSourceMarketBinding = Pick<
  MarketRuntimeBinding,
  | "countryCode"
  | "locale"
  | "market"
  | "publishableApiKey"
  | "regionId"
  | "salesChannelId"
>

export type ProductRouteMedusaProduct = HttpTypes.StoreProduct &
  Readonly<{ variants: readonly HttpTypes.StoreProductVariant[] }>

export type ProductRouteSourceRetrieveInput = Readonly<{
  binding: ProductRouteSourceMarketBinding
  productId: string
  query: HttpTypes.StoreProductParams
}>

export type ProductRouteSourceDependencies = Readonly<{
  resolveMarket(market: MarketCode): ProductRouteSourceMarketBinding | null
  retrieveProduct(input: ProductRouteSourceRetrieveInput): Promise<unknown>
}>

export type ProductRouteSourceRequest = Readonly<{
  market: MarketCode
  productId: string
}>

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const isVariant = (value: unknown): value is HttpTypes.StoreProductVariant =>
  isRecord(value) &&
  typeof value.id === "string" &&
  value.id.length > 0 &&
  (value.sku === undefined ||
    value.sku === null ||
    typeof value.sku === "string")

const readProductPayload = (
  payload: unknown,
  expectedProductId: string
): ProductRouteMedusaProduct | null => {
  if (!(isRecord(payload) && isRecord(payload.product))) {
    return null
  }
  const candidate = payload.product
  if (
    candidate.id !== expectedProductId ||
    typeof candidate.handle !== "string" ||
    candidate.handle.trim().length === 0 ||
    typeof candidate.title !== "string" ||
    candidate.title.trim().length === 0 ||
    !Array.isArray(candidate.variants) ||
    !candidate.variants.every(isVariant)
  ) {
    return null
  }
  return candidate as unknown as ProductRouteMedusaProduct
}

const errorStatus = (error: unknown): number | null =>
  isRecord(error) &&
  typeof error.status === "number" &&
  Number.isInteger(error.status)
    ? error.status
    : null

const mapReadError = (
  error: unknown
): SourceReadResult<ProductRouteMedusaProduct> => {
  const status = errorStatus(error)
  if (status === 404) {
    return { kind: "missing" }
  }
  if (
    status === null ||
    status === 408 ||
    status === 425 ||
    status === 429 ||
    status >= 500
  ) {
    return { kind: "unavailable" }
  }
  return {
    kind: "invalid-response",
    causeCode: "MEDUSA_REJECTED_REQUEST",
  }
}

export const readProductRouteSource = async (
  { market, productId }: ProductRouteSourceRequest,
  dependencies: ProductRouteSourceDependencies
): Promise<SourceReadResult<ProductRouteMedusaProduct>> => {
  const binding = dependencies.resolveMarket(market)
  if (!binding) {
    return {
      kind: "invalid-response",
      causeCode: "MISSING_MARKET_BINDING",
    }
  }

  try {
    const payload = await dependencies.retrieveProduct({
      binding,
      productId,
      query: {
        country_code: binding.countryCode.toLowerCase(),
        fields: PRODUCT_DETAIL_FIELDS,
        locale: binding.locale,
        region_id: binding.regionId,
      },
    })
    const product = readProductPayload(payload, productId)
    return product
      ? { kind: "found", value: product }
      : {
          kind: "invalid-response",
          causeCode: "INVALID_MEDUSA_PRODUCT_RESPONSE",
        }
  } catch (error) {
    return mapReadError(error)
  }
}

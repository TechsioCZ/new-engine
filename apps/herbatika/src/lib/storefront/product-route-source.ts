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
  publicSlug: string
}>

export type ProductHandleSourceRequest = Readonly<{
  market: MarketCode
  publicSlug: string
}>

export type ProductHandleSourceDependencies = Readonly<{
  resolveMarket(market: MarketCode): ProductRouteSourceMarketBinding | null
  retrieveProducts(input: {
    binding: ProductRouteSourceMarketBinding
    query: HttpTypes.StoreProductListParams
  }): Promise<unknown>
}>

export type ProductIdentitySourceRequest = Omit<
  ProductRouteSourceRequest,
  "publicSlug"
>

export type ProductAlternateSourceRequest = ProductRouteSourceRequest &
  Readonly<{ sourceVersion: string }>

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const VISIBLE_ASCII = /^[\x21-\x7e]+$/

const isIdentifier = (value: unknown): value is string =>
  typeof value === "string" &&
  value.length > 0 &&
  value.length <= 255 &&
  VISIBLE_ASCII.test(value)

const isValidBinding = (
  value: unknown,
  expectedMarket: MarketCode
): value is ProductRouteSourceMarketBinding =>
  isRecord(value) &&
  value.market === expectedMarket &&
  typeof value.countryCode === "string" &&
  value.countryCode.length > 0 &&
  typeof value.locale === "string" &&
  value.locale.length > 0 &&
  isIdentifier(value.publishableApiKey) &&
  isIdentifier(value.regionId) &&
  isIdentifier(value.salesChannelId)

const resolveSourceBinding = (
  market: MarketCode,
  dependencies: ProductRouteSourceDependencies
): SourceReadResult<ProductRouteSourceMarketBinding> => {
  if (
    !isRecord(dependencies) ||
    typeof dependencies.resolveMarket !== "function" ||
    typeof dependencies.retrieveProduct !== "function"
  ) {
    return {
      kind: "invalid-response",
      causeCode: "INVALID_PRODUCT_SOURCE_DEPENDENCIES",
    }
  }
  let binding: ProductRouteSourceMarketBinding | null
  try {
    binding = dependencies.resolveMarket(market)
  } catch {
    return { kind: "unavailable" }
  }
  if (!binding) {
    return {
      kind: "invalid-response",
      causeCode: "MISSING_MARKET_BINDING",
    }
  }
  return isValidBinding(binding, market)
    ? { kind: "found", value: binding }
    : {
        kind: "invalid-response",
        causeCode: "INVALID_MARKET_BINDING",
      }
}

const isVariant = (value: unknown): value is HttpTypes.StoreProductVariant =>
  isRecord(value) &&
  typeof value.id === "string" &&
  value.id.length > 0 &&
  (value.sku === undefined ||
    value.sku === null ||
    typeof value.sku === "string")

// The URL registry already resolved slug -> product ID, so the payload only
// needs to prove it describes that exact product in a renderable shape.
export const readProductRoutePayload = ({
  expectedProductId,
  payload,
}: Readonly<{
  expectedProductId: string
  payload: unknown
}>): SourceReadResult<ProductRouteMedusaProduct> => {
  if (!(isRecord(payload) && isRecord(payload.product))) {
    return {
      kind: "invalid-response",
      causeCode: "INVALID_MEDUSA_PRODUCT_RESPONSE",
    }
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
    return {
      kind: "invalid-response",
      causeCode: "INVALID_MEDUSA_PRODUCT_RESPONSE",
    }
  }
  return {
    kind: "found",
    value: candidate as unknown as ProductRouteMedusaProduct,
  }
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

// Registry-free product read: the Medusa handle is the public slug for every
// market, with no publication or translation proof required.
export const readProductRouteSourceByHandle = async (
  { market, publicSlug }: ProductHandleSourceRequest,
  dependencies: ProductHandleSourceDependencies
): Promise<SourceReadResult<ProductRouteMedusaProduct>> => {
  let binding: ProductRouteSourceMarketBinding | null
  try {
    binding = dependencies.resolveMarket(market)
  } catch {
    return { kind: "unavailable" }
  }
  if (!isValidBinding(binding, market)) {
    return {
      kind: "invalid-response",
      causeCode: "INVALID_MARKET_BINDING",
    }
  }

  try {
    const payload = await dependencies.retrieveProducts({
      binding,
      query: {
        country_code: binding.countryCode.toLowerCase(),
        fields: PRODUCT_DETAIL_FIELDS,
        handle: publicSlug,
        limit: 1,
        locale: binding.locale,
        region_id: binding.regionId,
      },
    })
    const candidate =
      isRecord(payload) && Array.isArray(payload.products)
        ? payload.products.find(
            (entry) => isRecord(entry) && entry.handle === publicSlug
          )
        : undefined
    if (!isRecord(candidate)) {
      return { kind: "missing" }
    }
    if (
      typeof candidate.id !== "string" ||
      candidate.id.length === 0 ||
      typeof candidate.title !== "string" ||
      candidate.title.trim().length === 0 ||
      !Array.isArray(candidate.variants) ||
      !candidate.variants.every(isVariant)
    ) {
      return {
        kind: "invalid-response",
        causeCode: "INVALID_MEDUSA_PRODUCT_RESPONSE",
      }
    }
    return {
      kind: "found",
      value: candidate as unknown as ProductRouteMedusaProduct,
    }
  } catch (error) {
    return mapReadError(error)
  }
}

export const readProductRouteSource = async (
  { market, productId }: ProductRouteSourceRequest,
  dependencies: ProductRouteSourceDependencies
): Promise<SourceReadResult<ProductRouteMedusaProduct>> => {
  const bindingResult = resolveSourceBinding(market, dependencies)
  if (bindingResult.kind !== "found") {
    return bindingResult
  }
  const binding = bindingResult.value

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
    return readProductRoutePayload({
      expectedProductId: productId,
      payload,
    })
  } catch (error) {
    return mapReadError(error)
  }
}

export const readProductIdentitySource = async (
  { market, productId }: ProductIdentitySourceRequest,
  dependencies: ProductRouteSourceDependencies
): Promise<SourceReadResult<unknown>> => {
  const bindingResult = resolveSourceBinding(market, dependencies)
  if (bindingResult.kind !== "found") {
    return bindingResult
  }
  const binding = bindingResult.value
  try {
    const payload = await dependencies.retrieveProduct({
      binding,
      productId,
      query: {
        country_code: binding.countryCode.toLowerCase(),
        fields: "id",
        locale: binding.locale,
        region_id: binding.regionId,
      },
    })
    if (
      !(
        isRecord(payload) &&
        isRecord(payload.product) &&
        payload.product.id === productId
      )
    ) {
      return {
        kind: "invalid-response",
        causeCode: "INVALID_MEDUSA_PRODUCT_RESPONSE",
      }
    }
    return { kind: "found", value: payload.product }
  } catch (error) {
    return mapReadError(error)
  }
}

// Alternates only need proof the product exists on the target market; the
// registry equivalence lookup already produced the alternate slug itself.
export const readProductAlternateSource = (
  { market, productId }: ProductAlternateSourceRequest,
  dependencies: ProductRouteSourceDependencies
): Promise<SourceReadResult<unknown>> =>
  readProductIdentitySource({ market, productId }, dependencies)

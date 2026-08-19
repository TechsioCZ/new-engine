import type { HttpTypes } from "@medusajs/types"
import type { MarketRuntimeBinding } from "@/lib/market/market-runtime"
import { resolveVariantInventoryState } from "@/lib/storefront/product-availability"
import {
  type ProductRouteMedusaProduct,
  readProductRoutePayload,
} from "@/lib/storefront/product-route-source"
import { buildAbsoluteUrl } from "@/lib/url/public-url"
import type { ActiveEntityRouteTarget } from "@/lib/url-registry/model"
import type { SourceReadResult } from "@/lib/url-registry/reads"
import { escapeXml } from "./xml"

export const PRODUCT_FEED_MAX_PRODUCTS = 20_000
export const PRODUCT_FEED_MAX_BYTES = 25 * 1024 * 1024
const PRODUCT_FEED_SOURCE_BATCH_SIZE = 100

type ProductFeedSourceCandidate = Readonly<{
  productId: string
  publicSlug: string
  routeId: string
}>

export type ProductFeedDependencies = Readonly<{
  listProducts(input: {
    kind: "product"
    market: MarketRuntimeBinding["market"]
  }): Promise<SourceReadResult<readonly ActiveEntityRouteTarget[]>>
  readProducts(input: {
    market: MarketRuntimeBinding["market"]
    sources: readonly ProductFeedSourceCandidate[]
  }): Promise<unknown>
  validateProducts(input: {
    kind: "product"
    market: MarketRuntimeBinding["market"]
    sources: readonly Readonly<{
      publicSlug: string
      routeId: string
      sourceId: string
    }>[]
  }): Promise<SourceReadResult<readonly Readonly<{ routeId: string }>[]>>
}>

type ProductFeedSource = Readonly<{
  product: ProductRouteMedusaProduct
  projection: ActiveEntityRouteTarget
}>

type ProductFeedValidation = Readonly<{ routeId: string }>

const invalidProductFeedBatch = (): SourceReadResult<never> => ({
  causeCode: "INVALID_PRODUCT_FEED_BATCH",
  kind: "invalid-response",
})

const productFeedBatchError = (error: unknown): SourceReadResult<never> => {
  const status =
    error && typeof error === "object" && "status" in error
      ? error.status
      : null
  if (status === 404) {
    return {
      causeCode: "ACTIVE_PRODUCT_SOURCE_MISSING",
      kind: "invalid-response",
    }
  }
  if (
    status === null ||
    status === 408 ||
    status === 425 ||
    status === 429 ||
    (typeof status === "number" && status >= 500)
  ) {
    return { kind: "unavailable" }
  }
  return {
    causeCode: "MEDUSA_REJECTED_PRODUCT_FEED_BATCH",
    kind: "invalid-response",
  }
}

const indexProductBatch = (
  payload: unknown,
  expectedCount: number
): ReadonlyMap<unknown, unknown> | null => {
  if (
    !payload ||
    typeof payload !== "object" ||
    !("products" in payload) ||
    !Array.isArray(payload.products) ||
    payload.products.length !== expectedCount
  ) {
    return null
  }
  const byId = new Map(
    payload.products.flatMap((candidate) =>
      candidate && typeof candidate === "object" && "id" in candidate
        ? [[candidate.id, candidate] as const]
        : []
    )
  )
  return byId.size === expectedCount ? byId : null
}

const hasExactProductValidations = (
  candidates: readonly ProductFeedSourceCandidate[],
  validations: readonly ProductFeedValidation[]
) => {
  const expectedRouteIds = new Set(
    candidates.map((candidate) => candidate.routeId)
  )
  return (
    validations.length === candidates.length &&
    new Set(validations.map((entry) => entry.routeId)).size ===
      candidates.length &&
    validations.every((entry) => expectedRouteIds.has(entry.routeId))
  )
}

const readProductBatchInputs = async (
  market: MarketRuntimeBinding["market"],
  candidates: readonly ProductFeedSourceCandidate[],
  dependencies: ProductFeedDependencies
): Promise<
  SourceReadResult<readonly [unknown, readonly ProductFeedValidation[]]>
> => {
  try {
    const [payload, validation] = await Promise.all([
      dependencies.readProducts({ market, sources: candidates }),
      dependencies.validateProducts({
        kind: "product",
        market,
        sources: candidates.map((candidate) => ({
          publicSlug: candidate.publicSlug,
          routeId: candidate.routeId,
          sourceId: candidate.productId,
        })),
      }),
    ])
    return validation.kind === "found"
      ? { kind: "found", value: [payload, validation.value] }
      : validation
  } catch (error) {
    return productFeedBatchError(error)
  }
}

const readPrice = (variant: HttpTypes.StoreProductVariant) => {
  const amount = variant.calculated_price?.calculated_amount
  const currency = variant.calculated_price?.currency_code
  return typeof amount === "number" && Number.isFinite(amount) && currency
    ? { amount: amount.toFixed(2), currency: currency.toUpperCase() }
    : null
}

const itemXml = (
  product: ProductRouteMedusaProduct,
  variant: HttpTypes.StoreProductVariant,
  url: string
): string | null => {
  const price = readPrice(variant)
  if (!(variant.id && price)) {
    return null
  }
  const inventory = resolveVariantInventoryState(variant)
  const title =
    variant.title && variant.title !== "Default variant"
      ? `${product.title} - ${variant.title}`
      : product.title

  return `<SHOPITEM><ITEM_ID>${escapeXml(variant.id)}</ITEM_ID><PRODUCTNAME>${escapeXml(title)}</PRODUCTNAME><PRODUCT>${escapeXml(product.title)}</PRODUCT><DESCRIPTION>${escapeXml(product.description ?? "")}</DESCRIPTION><URL>${escapeXml(url)}</URL><IMGURL>${escapeXml(product.thumbnail ?? "")}</IMGURL><PRICE_VAT>${price.amount}</PRICE_VAT><CURRENCY>${escapeXml(price.currency)}</CURRENCY><EAN>${escapeXml(variant.ean ?? "")}</EAN><ITEM_GROUP_ID>${escapeXml(product.id)}</ITEM_GROUP_ID><SKU>${escapeXml(variant.sku ?? "")}</SKU><DELIVERY_DATE>${inventory.isInStock ? "0" : "-1"}</DELIVERY_DATE><AVAILABILITY>${inventory.isInStock ? "in stock" : "out of stock"}</AVAILABILITY></SHOPITEM>`
}

const readProductBatch = async (
  binding: MarketRuntimeBinding,
  batch: readonly ActiveEntityRouteTarget[],
  dependencies: ProductFeedDependencies
): Promise<SourceReadResult<readonly ProductFeedSource[]>> => {
  const candidates = batch.map((projection) => ({
    productId: projection.route.sourceId,
    publicSlug: projection.currentSlug.normalizedSlug,
    routeId: projection.route.id,
  }))
  const inputs = await readProductBatchInputs(
    binding.market,
    candidates,
    dependencies
  )
  if (inputs.kind !== "found") {
    return inputs
  }
  const [payload, validations] = inputs.value
  const productById = indexProductBatch(payload, batch.length)
  if (!(productById && hasExactProductValidations(candidates, validations))) {
    return invalidProductFeedBatch()
  }
  const sources: ProductFeedSource[] = []
  for (const projection of batch) {
    const result = readProductRoutePayload({
      expectedProductId: projection.route.sourceId,
      expectedPublicSlug: projection.currentSlug.normalizedSlug,
      expectedSalesChannelId: binding.salesChannelId,
      market: binding.market,
      payload: { product: productById.get(projection.route.sourceId) },
    })
    if (result.kind !== "found") {
      return result.kind === "missing"
        ? {
            causeCode: "ACTIVE_PRODUCT_SOURCE_MISSING",
            kind: "invalid-response",
          }
        : result
    }
    sources.push({ product: result.value, projection })
  }
  return { kind: "found", value: sources }
}

const appendProductItems = (
  items: string[],
  binding: MarketRuntimeBinding,
  sources: readonly ProductFeedSource[]
) => {
  for (const { product, projection } of sources) {
    const url = buildAbsoluteUrl(
      {
        kind: "product",
        slug: projection.currentSlug.normalizedSlug,
      },
      binding.market
    ).href
    for (const variant of product.variants) {
      const item = itemXml(product, variant, url)
      if (item) {
        items.push(item)
      }
    }
  }
}

export const generateProductFeed = async (
  binding: MarketRuntimeBinding,
  dependencies: ProductFeedDependencies
): Promise<SourceReadResult<string>> => {
  const projectionResult = await dependencies.listProducts({
    kind: "product",
    market: binding.market,
  })
  if (projectionResult.kind !== "found") {
    return projectionResult
  }
  const projections = projectionResult.value.filter(
    (projection) => projection.route.indexPolicy === "indexable"
  )
  if (projections.length > PRODUCT_FEED_MAX_PRODUCTS) {
    return {
      causeCode: "PRODUCT_FEED_LIMIT_EXCEEDED",
      kind: "invalid-response",
    }
  }

  const items: string[] = []
  for (
    let offset = 0;
    offset < projections.length;
    offset += PRODUCT_FEED_SOURCE_BATCH_SIZE
  ) {
    const batch = projections.slice(
      offset,
      offset + PRODUCT_FEED_SOURCE_BATCH_SIZE
    )
    const result = await readProductBatch(binding, batch, dependencies)
    if (result.kind !== "found") {
      return result
    }
    appendProductItems(items, binding, result.value)
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<SHOP>${items.join("")}</SHOP>\n`
  return new TextEncoder().encode(xml).byteLength <= PRODUCT_FEED_MAX_BYTES
    ? { kind: "found", value: xml }
    : {
        causeCode: "PRODUCT_FEED_SIZE_LIMIT_EXCEEDED",
        kind: "invalid-response",
      }
}

import type { HttpTypes } from "@medusajs/types"
import type { MarketRuntimeBinding } from "@/lib/market/market-runtime"
import { resolveVariantInventoryState } from "@/lib/storefront/product-availability"
import type { ProductRouteMedusaProduct } from "@/lib/storefront/product-route-source"
import { buildAbsoluteUrl } from "@/lib/url/public-url"
import type { ActiveEntityRouteTarget } from "@/lib/url-registry/model"
import type { SourceReadResult } from "@/lib/url-registry/reads"
import { escapeXml } from "./xml"

export const PRODUCT_FEED_MAX_PRODUCTS = 20_000
export const PRODUCT_FEED_MAX_BYTES = 25 * 1024 * 1024
const PRODUCT_FEED_SOURCE_CONCURRENCY = 12

export type ProductFeedDependencies = Readonly<{
  listProducts(input: {
    kind: "product"
    market: MarketRuntimeBinding["market"]
  }): Promise<SourceReadResult<readonly ActiveEntityRouteTarget[]>>
  readProduct(input: {
    market: MarketRuntimeBinding["market"]
    productId: string
    publicSlug: string
  }): Promise<SourceReadResult<ProductRouteMedusaProduct>>
}>

type ProductFeedSource = Readonly<{
  product: ProductRouteMedusaProduct
  projection: ActiveEntityRouteTarget
}>

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
  const results = await Promise.all(
    batch.map((projection) =>
      dependencies.readProduct({
        market: binding.market,
        productId: projection.route.sourceId,
        publicSlug: projection.currentSlug.normalizedSlug,
      })
    )
  )
  const sources: ProductFeedSource[] = []
  for (const [index, result] of results.entries()) {
    if (result.kind !== "found") {
      return result.kind === "missing"
        ? {
            causeCode: "ACTIVE_PRODUCT_SOURCE_MISSING",
            kind: "invalid-response",
          }
        : result
    }
    const projection = batch[index]
    if (!projection) {
      return {
        causeCode: "INVALID_PRODUCT_FEED_BATCH",
        kind: "invalid-response",
      }
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
    offset += PRODUCT_FEED_SOURCE_CONCURRENCY
  ) {
    const batch = projections.slice(
      offset,
      offset + PRODUCT_FEED_SOURCE_CONCURRENCY
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

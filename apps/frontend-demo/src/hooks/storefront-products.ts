"use client"

import type { HttpTypes } from "@medusajs/types"
import { createProductHooks } from "@techsio/storefront-data/products/hooks"
import { createMedusaProductService, type MedusaProductDetailInput } from "@techsio/storefront-data/products/medusa-service"
import type { ProductQueryKeys } from "@techsio/storefront-data/products/types"
import type { CacheConfig } from "@techsio/storefront-data/shared/cache-config"
import { cacheConfig } from "@/lib/cache-config"
import { queryKeys } from "@/lib/query-keys"
import { sdk } from "@/lib/medusa-client"
import type { Product } from "@/types/product"
import type { ProductFilters, ProductListParams } from "@/types/product-query"
import { buildMedusaQuery } from "@/utils/server-filters"

const LIST_FIELDS = [
  "id",
  "title",
  "handle",
  "thumbnail",
  "variants.title",
  "*variants.calculated_price",
  "variants.inventory_quantity",
  "variants.manage_inventory",
  "variants.allow_backorder",
].join(",")

const DETAIL_FIELDS = [
  "id",
  "title",
  "handle",
  "description",
  "thumbnail",
  "status",
  "collection_id",
  "created_at",
  "updated_at",
  "tags",
  "images.id",
  "images.url",
  "categories.id",
  "categories.name",
  "categories.handle",
  "variants.id",
  "variants.title",
  "variants.sku",
  "variants.manage_inventory",
  "variants.allow_backorder",
  "+variants.inventory_quantity",
  "variants.prices.amount",
  "variants.prices.currency_code",
  "variants.calculated_price",
  "variants.options",
].join(",")

export const DEFAULT_PRODUCT_PAGE_SIZE = 20

export type StorefrontProductListParams = ProductListParams & {
  limit: number
  offset: number
}

export type StorefrontProductListInput = Omit<
  StorefrontProductListParams,
  "offset"
> & {
  page?: number
  offset?: number
  enabled?: boolean
}

export type StorefrontProductDetailParams = MedusaProductDetailInput

export type StorefrontProductDetailInput = StorefrontProductDetailParams & {
  enabled?: boolean
}

const SORT_MAP: Record<string, string> = {
  newest: "-created_at",
  "price-asc": "variants.prices.amount",
  "price-desc": "-variants.prices.amount",
  "name-asc": "title",
  "name-desc": "-title",
}

const normalizeCountryCode = (countryCode?: string) => {
  if (typeof countryCode !== "string") {
    return undefined
  }

  const normalizedCode = countryCode.trim().toLowerCase()
  return normalizedCode.length > 0 ? normalizedCode : undefined
}

const resolveSortOrder = (sort?: string) => {
  if (!sort) return undefined
  return SORT_MAP[sort] ?? sort
}

const resolveLimit = (limit: number | undefined, fallback: number) => {
  if (typeof limit === "number" && Number.isFinite(limit) && limit > 0) {
    return Math.max(1, Math.trunc(limit))
  }
  return Math.max(1, Math.trunc(fallback))
}

const resolveOffset = (offset: number | undefined, fallback: number) => {
  if (typeof offset === "number" && Number.isFinite(offset)) {
    return Math.max(0, Math.trunc(offset))
  }
  if (Number.isFinite(fallback)) {
    return Math.max(0, Math.trunc(fallback))
  }
  return 0
}

const resolveInputPage = (page: number | undefined, fallback = 1) => {
  if (typeof page === "number" && Number.isFinite(page) && page > 0) {
    return Math.max(1, Math.trunc(page))
  }
  return Math.max(1, Math.trunc(fallback))
}

const resolvePage = (
  params: Pick<StorefrontProductListParams, "offset" | "limit">,
  fallback = 1
) => {
  const safeLimit =
    Number.isFinite(params.limit) && params.limit > 0
      ? Math.max(1, Math.trunc(params.limit))
      : 0
  if (safeLimit > 0) {
    const safeOffset = resolveOffset(params.offset, 0)
    return Math.floor(safeOffset / safeLimit) + 1
  }
  return resolveInputPage(fallback, 1)
}

const isVariantInStock = (
  variant:
    | Pick<
        HttpTypes.StoreProductVariant,
        "manage_inventory" | "allow_backorder" | "inventory_quantity"
      >
    | undefined
) => {
  if (!variant) {
    return false
  }

  if (variant.manage_inventory === false) {
    return true
  }

  if (variant.allow_backorder === true) {
    return true
  }

  return (variant.inventory_quantity ?? 0) > 0
}

const transformProduct = (product: HttpTypes.StoreProduct): Product => {
  if (!product) {
    throw new Error("Cannot transform null product")
  }

  const primaryVariant = product.variants?.[0]
  const price = primaryVariant?.calculated_price?.calculated_amount
  const priceWithTax =
    primaryVariant?.calculated_price?.calculated_amount_with_tax

  const reducedImages =
    product.images && product.images.length > 2
      ? product.images.slice(0, 2)
      : product.images

  return {
    ...product,
    thumbnail: product.thumbnail,
    images: reducedImages,
    inStock: product.variants?.some((variant) => isVariantInStock(variant)) ?? false,
    price: price ?? null,
    priceWithTax: priceWithTax ?? null,
    primaryVariant: primaryVariant ?? null,
  }
}

export const storefrontProductQueryKeys: ProductQueryKeys<
  StorefrontProductListParams,
  StorefrontProductDetailParams
> = {
  list: (params) => {
    const normalizedCountryCode = normalizeCountryCode(params.country_code)
    const canonicalSort = resolveSortOrder(params.sort)
    return queryKeys.products.list({
      page: resolvePage(params),
      limit: params.limit,
      filters: params.filters,
      sort: canonicalSort,
      q: params.q,
      category: params.category,
      region_id: params.region_id,
      country_code: normalizedCountryCode,
    })
  },
  infinite: (params) => {
    const normalizedCountryCode = normalizeCountryCode(params.country_code)
    const canonicalSort = resolveSortOrder(params.sort)
    return queryKeys.products.infinite({
      pageRangeStart: resolvePage(params),
      limit: params.limit,
      filters: params.filters,
      sort: canonicalSort,
      q: params.q,
      category: params.category,
      region_id: params.region_id,
      country_code: normalizedCountryCode,
    })
  },
  detail: (params) => {
    const normalizedCountryCode = normalizeCountryCode(params.country_code)
    return queryKeys.product(params.handle, params.region_id, normalizedCountryCode)
  },
}

const storefrontProductCacheConfig: CacheConfig = {
  static: cacheConfig.static,
  semiStatic: cacheConfig.semiStatic,
  realtime: cacheConfig.realtime,
  userData: cacheConfig.user,
}

export const storefrontProductService = createMedusaProductService<
  Product,
  StorefrontProductListParams,
  StorefrontProductDetailParams
>(sdk, {
  normalizeListQuery: (params) => {
    const filters: ProductFilters | undefined = params.category
      ? {
          ...params.filters,
          categories: undefined,
        }
      : params.filters

    const normalizedCountryCode = normalizeCountryCode(params.country_code)
    const listQuery: Record<string, unknown> = {
      limit: params.limit,
      offset: params.offset,
      q: params.q,
      category_id: params.category,
      fields: params.fields ?? LIST_FIELDS,
      region_id: params.region_id,
    }

    if (normalizedCountryCode) {
      listQuery.country_code = normalizedCountryCode
    }

    const order = resolveSortOrder(params.sort)
    if (order) {
      listQuery.order = order
    }

    return buildMedusaQuery(filters, listQuery)
  },
  normalizeDetailQuery: (params) => {
    const normalizedCountryCode = normalizeCountryCode(params.country_code)

    return {
      handle: params.handle,
      limit: 1,
      region_id: params.region_id,
      country_code: normalizedCountryCode,
      province: params.province,
      cart_id: params.cart_id,
      locale: params.locale,
      fields: params.fields ?? DETAIL_FIELDS,
    }
  },
  transformListProduct: (product) => transformProduct(product),
  transformDetailProduct: (product) => transformProduct(product),
})

export const buildStorefrontProductListParams = (
  input: StorefrontProductListInput
): StorefrontProductListParams => {
  const limit = resolveLimit(input.limit, DEFAULT_PRODUCT_PAGE_SIZE)
  const page = resolveInputPage(input.page, 1)
  const offset = resolveOffset(input.offset, (page - 1) * limit)
  const normalizedCountryCode = normalizeCountryCode(input.country_code)
  const canonicalSort = resolveSortOrder(input.sort)

  return {
    limit,
    offset,
    fields: input.fields,
    filters: input.filters,
    category: input.category,
    sort: canonicalSort,
    q: input.q,
    region_id: input.region_id,
    country_code: normalizedCountryCode,
  }
}

export const fetchStorefrontProducts = (
  input: StorefrontProductListInput,
  signal?: AbortSignal
) =>
  storefrontProductService.getProducts(
    buildStorefrontProductListParams(input),
    signal
  )

const buildStorefrontPrefetchListParams = (input: StorefrontProductListInput) =>
  buildStorefrontProductListParams({
    ...input,
    page: 1,
    offset: 0,
  })

const buildStorefrontProductDetailParams = (
  input: StorefrontProductDetailInput
): StorefrontProductDetailParams => ({
  handle: input.handle,
  fields: input.fields,
  region_id: input.region_id,
  country_code: normalizeCountryCode(input.country_code),
  province: input.province,
  cart_id: input.cart_id,
  locale: input.locale,
})

const storefrontProductHooks = createProductHooks<
  Product,
  StorefrontProductListInput,
  StorefrontProductListParams,
  StorefrontProductDetailInput,
  StorefrontProductDetailParams
>({
  service: storefrontProductService,
  buildListParams: buildStorefrontProductListParams,
  buildPrefetchParams: buildStorefrontPrefetchListParams,
  buildDetailParams: buildStorefrontProductDetailParams,
  queryKeys: storefrontProductQueryKeys,
  cacheConfig: storefrontProductCacheConfig,
  defaultPageSize: DEFAULT_PRODUCT_PAGE_SIZE,
  requireRegion: false,
})

export const {
  useProducts: useStorefrontProducts,
  useInfiniteProducts: useStorefrontInfiniteProducts,
  useProduct: useStorefrontProduct,
  usePrefetchProducts: useStorefrontPrefetchProducts,
  usePrefetchProduct: useStorefrontPrefetchProduct,
} = storefrontProductHooks

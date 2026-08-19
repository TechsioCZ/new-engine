"use client"

import type { HttpTypes } from "@medusajs/types"
import type {
  CatalogFacets,
  CatalogListResponse,
  UseCatalogProductsResult,
} from "@techsio/storefront-data/catalog/types"
import type { RegionInfo } from "@techsio/storefront-data/shared/region"
import { useRegionContext } from "@techsio/storefront-data/shared/region-context"
import { useLocale } from "next-intl"
import type {
  CatalogProductsParams,
  CatalogQueryState,
} from "./catalog-query-state"
import { hasDefaultStockInventoryQuantity } from "./default-stock-availability"
import { withRequestLocale } from "./localized-query"
import { PRODUCT_CARD_FIELDS } from "./product-query-config"
import { useProducts } from "./products"
import { storefront } from "./storefront"

export type CatalogProductsInput = CatalogProductsParams & {
  sort?: CatalogQueryState["sort"]
  enabled?: boolean
}

export type CatalogProductsResponse = CatalogListResponse<
  HttpTypes.StoreProduct,
  CatalogFacets
>

const catalogService = storefront.services.catalog
const catalogHooks = storefront.hooks.catalog

type UseCatalogProductsOptions = Parameters<
  typeof catalogHooks.useCatalogProducts
>[1]

const resolveRegionCurrencyCode = (region: RegionInfo | null) => {
  if (
    region &&
    "currency_code" in region &&
    typeof region.currency_code === "string"
  ) {
    return region.currency_code
  }

  return
}

const applyActiveCatalogScope = (
  input: CatalogProductsInput,
  region: RegionInfo | null
): CatalogProductsInput =>
  region
    ? {
        ...input,
        country_code: region.country_code,
        currency_code: resolveRegionCurrencyCode(region),
        region_id: region.region_id,
        salesChannelId: region.salesChannelId,
      }
    : input

const hasCompleteCatalogScope = (input: CatalogProductsInput) =>
  Boolean(
    input.region_id &&
      input.country_code &&
      input.currency_code &&
      input.salesChannelId
  )

const variantNeedsInventorySnapshot = (
  variant: HttpTypes.StoreProductVariant
) =>
  Boolean(variant.id) &&
  variant.manage_inventory !== false &&
  variant.allow_backorder !== true &&
  !hasDefaultStockInventoryQuantity(variant)

const productNeedsInventorySnapshot = (product: HttpTypes.StoreProduct) =>
  (product.variants ?? []).some(variantNeedsInventorySnapshot)

const resolveInventorySnapshotHandles = (
  products: HttpTypes.StoreProduct[]
) => {
  const handles = new Set<string>()

  for (const product of products) {
    if (product.handle && productNeedsInventorySnapshot(product)) {
      handles.add(product.handle)
    }
  }

  return Array.from(handles)
}

const mergeProductInventorySnapshot = (
  product: HttpTypes.StoreProduct,
  inventoryProduct?: HttpTypes.StoreProduct
): HttpTypes.StoreProduct => {
  if (!inventoryProduct?.variants?.length) {
    return product
  }

  const inventoryVariantById = new Map(
    inventoryProduct.variants.map((variant) => [variant.id, variant])
  )

  return {
    ...product,
    variants:
      product.variants?.map((variant) => {
        const inventoryVariant = inventoryVariantById.get(variant.id)
        const inventoryVariantRecord = inventoryVariant as
          | (HttpTypes.StoreProductVariant & { inventory_items?: unknown })
          | undefined

        return inventoryVariant
          ? {
              ...variant,
              allow_backorder: inventoryVariant.allow_backorder,
              inventory_items: inventoryVariantRecord?.inventory_items,
              inventory_quantity: inventoryVariant.inventory_quantity,
              manage_inventory: inventoryVariant.manage_inventory,
            }
          : variant
      }) ?? product.variants,
  }
}

export const useCatalogProducts = (
  input: CatalogProductsInput,
  options?: UseCatalogProductsOptions
): UseCatalogProductsResult<HttpTypes.StoreProduct, CatalogFacets> => {
  const locale = useLocale()
  const region = useRegionContext()
  const scopedInput = applyActiveCatalogScope(
    withRequestLocale(input, locale),
    region
  )
  const catalogQuery = catalogHooks.useCatalogProducts(
    {
      ...scopedInput,
      enabled: input.enabled !== false && hasCompleteCatalogScope(scopedInput),
    },
    options
  )
  const inventorySnapshotHandles = resolveInventorySnapshotHandles(
    catalogQuery.products
  )
  const shouldLoadInventorySnapshots = inventorySnapshotHandles.length > 0
  const inventorySnapshotsQuery = useProducts({
    handle: inventorySnapshotHandles,
    limit: Math.max(1, inventorySnapshotHandles.length),
    fields: PRODUCT_CARD_FIELDS,
    enabled: catalogQuery.isSuccess && shouldLoadInventorySnapshots,
  })
  const inventoryProductByHandle = new Map(
    inventorySnapshotsQuery.products
      .filter((product) => product.handle)
      .map((product) => [product.handle, product])
  )
  const products =
    shouldLoadInventorySnapshots && inventorySnapshotsQuery.isLoading
      ? []
      : catalogQuery.products.map((product) =>
          mergeProductInventorySnapshot(
            product,
            product.handle
              ? inventoryProductByHandle.get(product.handle)
              : undefined
          )
        )

  return {
    ...catalogQuery,
    products,
    isLoading:
      catalogQuery.isLoading ||
      (shouldLoadInventorySnapshots && inventorySnapshotsQuery.isLoading),
    isFetching:
      catalogQuery.isFetching ||
      (shouldLoadInventorySnapshots && inventorySnapshotsQuery.isFetching),
    error: catalogQuery.error ?? inventorySnapshotsQuery.error,
  }
}

export const useSuspenseCatalogProducts = (
  input: CatalogProductsInput,
  options?: Parameters<typeof catalogHooks.useSuspenseCatalogProducts>[1]
) => {
  const locale = useLocale()
  const region = useRegionContext()
  const scopedInput = applyActiveCatalogScope(
    withRequestLocale(input, locale),
    region
  )

  if (!hasCompleteCatalogScope(scopedInput)) {
    throw new Error("Complete market scope is required for catalog queries")
  }

  return catalogHooks.useSuspenseCatalogProducts(scopedInput, options)
}

export const usePrefetchCatalogProducts = (
  ...args: Parameters<typeof catalogHooks.usePrefetchCatalogProducts>
) => {
  const locale = useLocale()
  const region = useRegionContext()
  const prefetch = catalogHooks.usePrefetchCatalogProducts(...args)

  return {
    ...prefetch,
    prefetchCatalogProducts: (
      input: CatalogProductsInput,
      ...prefetchArgs: Parameters<
        typeof prefetch.prefetchCatalogProducts
      > extends [unknown, ...infer TRest]
        ? TRest
        : never
    ) => {
      const scopedInput = applyActiveCatalogScope(
        withRequestLocale(input, locale),
        region
      )
      if (!hasCompleteCatalogScope(scopedInput)) {
        return Promise.resolve()
      }

      return prefetch.prefetchCatalogProducts(scopedInput, ...prefetchArgs)
    },
    delayedPrefetch: (
      input: CatalogProductsInput,
      ...prefetchArgs: Parameters<typeof prefetch.delayedPrefetch> extends [
        unknown,
        ...infer TRest,
      ]
        ? TRest
        : never
    ) => {
      const scopedInput = applyActiveCatalogScope(
        withRequestLocale(input, locale),
        region
      )
      if (!hasCompleteCatalogScope(scopedInput)) {
        return
      }

      return prefetch.delayedPrefetch(scopedInput, ...prefetchArgs)
    },
  }
}
export const prefetchCatalogProducts = catalogHooks.prefetchCatalogProducts

export const fetchCatalogProducts = (
  input: CatalogProductsInput,
  signal?: AbortSignal
) => catalogService.getCatalogProducts(input, signal)

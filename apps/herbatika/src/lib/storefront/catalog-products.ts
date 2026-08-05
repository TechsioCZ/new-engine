"use client"

import type { HttpTypes } from "@medusajs/types"
import type {
  CatalogFacets,
  UseCatalogProductsResult,
} from "@techsio/storefront-data/catalog/types"

import type {
  CatalogProductsParams,
  CatalogQueryState,
} from "./catalog-query-state"
import { hasDefaultStockInventoryQuantity } from "./default-stock-availability"
import { PRODUCT_CARD_FIELDS } from "./product-query-config"
import { useProducts } from "./products"
import { storefront } from "./storefront"

export type CatalogProductsInput = CatalogProductsParams & {
  sort?: CatalogQueryState["sort"]
  enabled?: boolean
}

const catalogHooks = storefront.hooks.catalog

type UseCatalogProductsOptions = Parameters<
  typeof catalogHooks.useCatalogProducts
>[1]

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

  return [...handles]
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

        return inventoryVariant
          ? {
              ...inventoryVariant,
              ...variant,
              allow_backorder: inventoryVariant.allow_backorder,
              ...(inventoryVariant.inventory_quantity === undefined
                ? {}
                : { inventory_quantity: inventoryVariant.inventory_quantity }),
              manage_inventory: inventoryVariant.manage_inventory,
            }
          : variant
      }) ?? product.variants,
  }
}

export const useCatalogProducts = (
  input: CatalogProductsInput,
  options?: UseCatalogProductsOptions
): UseCatalogProductsResult<HttpTypes.StoreProduct> => {
  const catalogQuery = catalogHooks.useCatalogProducts(input, options)
  const inventorySnapshotHandles = resolveInventorySnapshotHandles(
    catalogQuery.products
  )
  const shouldLoadInventorySnapshots = inventorySnapshotHandles.length > 0
  const inventorySnapshotsQuery = useProducts({
    enabled: catalogQuery.isSuccess && shouldLoadInventorySnapshots,
    fields: PRODUCT_CARD_FIELDS,
    handle: inventorySnapshotHandles,
    limit: Math.max(1, inventorySnapshotHandles.length),
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
    error: catalogQuery.error ?? inventorySnapshotsQuery.error,
    isFetching:
      catalogQuery.isFetching ||
      (shouldLoadInventorySnapshots && inventorySnapshotsQuery.isFetching),
    isLoading:
      catalogQuery.isLoading ||
      (shouldLoadInventorySnapshots && inventorySnapshotsQuery.isLoading),
    products,
  }
}

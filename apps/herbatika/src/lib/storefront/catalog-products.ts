"use client"

import type { HttpTypes } from "@medusajs/types"
import type {
  MedusaCatalogProduct,
  MedusaCatalogProductVariant,
} from "@techsio/storefront-data/catalog/medusa-service"
import type { UseCatalogProductsResult } from "@techsio/storefront-data/catalog/types"
import { useLocale } from "next-intl"

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

const variantNeedsInventorySnapshot = (variant: MedusaCatalogProductVariant) =>
  Boolean(variant.id) &&
  variant.manage_inventory !== false &&
  variant.allow_backorder !== true &&
  !hasDefaultStockInventoryQuantity(variant)

const productNeedsInventorySnapshot = (product: MedusaCatalogProduct) =>
  (product.variants ?? []).some(variantNeedsInventorySnapshot)

const resolveInventorySnapshotHandles = (products: MedusaCatalogProduct[]) => {
  const handles = new Set<string>()

  for (const product of products) {
    if (product.handle && productNeedsInventorySnapshot(product)) {
      handles.add(product.handle)
    }
  }

  return [...handles]
}

const mergeProductInventorySnapshot = (
  product: MedusaCatalogProduct,
  inventoryProduct?: HttpTypes.StoreProduct,
): MedusaCatalogProduct => {
  if (
    inventoryProduct === undefined ||
    !Array.isArray(inventoryProduct.variants) ||
    inventoryProduct.variants.length === 0
  ) {
    return product
  }

  const inventoryVariantById = new Map(
    inventoryProduct.variants.map((variant) => [variant.id, variant]),
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
  options?: UseCatalogProductsOptions,
): UseCatalogProductsResult<MedusaCatalogProduct> => {
  const locale = useLocale()
  const catalogQuery = catalogHooks.useCatalogProducts(
    { ...input, locale },
    options,
  )
  const inventorySnapshotHandles = resolveInventorySnapshotHandles(
    catalogQuery.products,
  )
  const shouldLoadInventorySnapshots = inventorySnapshotHandles.length > 0
  const inventorySnapshotsQuery = useProducts({
    enabled: catalogQuery.isSuccess && shouldLoadInventorySnapshots,
    fields: PRODUCT_CARD_FIELDS,
    handle: inventorySnapshotHandles,
    limit: Math.max(1, inventorySnapshotHandles.length),
  })
  const inventoryProductByHandle = new Map<string, HttpTypes.StoreProduct>()
  for (const product of inventorySnapshotsQuery.products) {
    if ((product.handle ?? "").length > 0) {
      inventoryProductByHandle.set(product.handle, product)
    }
  }
  const products =
    shouldLoadInventorySnapshots && inventorySnapshotsQuery.isLoading
      ? []
      : catalogQuery.products.map((product) =>
          mergeProductInventorySnapshot(
            product,
            product.handle
              ? inventoryProductByHandle.get(product.handle)
              : undefined,
          ),
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

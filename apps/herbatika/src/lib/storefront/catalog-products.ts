"use client";

import type { HttpTypes } from "@medusajs/types";
import type {
  CatalogFacets,
  CatalogListResponse,
  UseCatalogProductsResult,
} from "@techsio/storefront-data/catalog/types";
import { useMemo } from "react";
import {
  type CatalogProductsParams,
  type CatalogQueryState,
  PLP_PAGE_SIZE,
} from "./catalog-query-state";
import { resolveVariantInventoryState } from "./product-availability";
import { PRODUCT_CARD_FIELDS } from "./product-query-config";
import { useProducts } from "./products";
import { storefront } from "./storefront";

export type CatalogProductsInput = CatalogProductsParams & {
  sort?: CatalogQueryState["sort"];
  enabled?: boolean;
};

export type CatalogProductsResponse = CatalogListResponse<
  HttpTypes.StoreProduct,
  CatalogFacets
>;

const catalogService = storefront.services.catalog;
const catalogHooks = storefront.hooks.catalog;

type UseCatalogProductsOptions = Parameters<
  typeof catalogHooks.useCatalogProducts
>[1];

const productNeedsInventorySnapshot = (product: HttpTypes.StoreProduct) =>
  (product.variants ?? []).some(
    (variant) =>
      Boolean(variant.id) &&
      !resolveVariantInventoryState(variant).isInventoryKnown,
  );

const resolveInventorySnapshotHandles = (
  products: HttpTypes.StoreProduct[],
) => {
  const handles = new Set<string>();

  for (const product of products) {
    if (product.handle && productNeedsInventorySnapshot(product)) {
      handles.add(product.handle);
    }
  }

  return Array.from(handles);
};

const mergeProductInventorySnapshot = (
  product: HttpTypes.StoreProduct,
  inventoryProduct?: HttpTypes.StoreProduct,
): HttpTypes.StoreProduct => {
  if (!inventoryProduct?.variants?.length) {
    return product;
  }

  const inventoryVariantById = new Map(
    inventoryProduct.variants.map((variant) => [variant.id, variant]),
  );

  return {
    ...product,
    variants:
      product.variants?.map((variant) => {
        const inventoryVariant = inventoryVariantById.get(variant.id);

        return inventoryVariant
          ? {
              ...variant,
              allow_backorder: inventoryVariant.allow_backorder,
              inventory_quantity: inventoryVariant.inventory_quantity,
              manage_inventory: inventoryVariant.manage_inventory,
            }
          : variant;
      }) ?? product.variants,
  };
};

export const useCatalogProducts = (
  input: CatalogProductsInput,
  options?: UseCatalogProductsOptions,
): UseCatalogProductsResult<HttpTypes.StoreProduct, CatalogFacets> => {
  const catalogQuery = catalogHooks.useCatalogProducts(input, options);
  const inventorySnapshotHandles = useMemo(
    () => resolveInventorySnapshotHandles(catalogQuery.products),
    [catalogQuery.products],
  );
  const shouldLoadInventorySnapshots = inventorySnapshotHandles.length > 0;
  const inventorySnapshotsQuery = useProducts({
    handle: inventorySnapshotHandles,
    limit: Math.max(1, inventorySnapshotHandles.length),
    fields: PRODUCT_CARD_FIELDS,
    enabled: catalogQuery.isSuccess && shouldLoadInventorySnapshots,
  });
  const inventoryProductByHandle = useMemo(
    () =>
      new Map(
        inventorySnapshotsQuery.products
          .filter((product) => product.handle)
          .map((product) => [product.handle, product]),
      ),
    [inventorySnapshotsQuery.products],
  );
  const products = useMemo(() => {
    if (shouldLoadInventorySnapshots && inventorySnapshotsQuery.isLoading) {
      return [];
    }

    return catalogQuery.products.map((product) =>
      mergeProductInventorySnapshot(
        product,
        product.handle
          ? inventoryProductByHandle.get(product.handle)
          : undefined,
      ),
    );
  }, [
    catalogQuery.products,
    inventoryProductByHandle,
    inventorySnapshotsQuery.isLoading,
    shouldLoadInventorySnapshots,
  ]);

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
  };
};

export const useSuspenseCatalogProducts =
  catalogHooks.useSuspenseCatalogProducts;
export const usePrefetchCatalogProducts =
  catalogHooks.usePrefetchCatalogProducts;
export const prefetchCatalogProducts = catalogHooks.prefetchCatalogProducts;

export const fetchCatalogProducts = (
  input: CatalogProductsInput,
  signal?: AbortSignal,
) => catalogService.getCatalogProducts(input, signal);

export { PLP_PAGE_SIZE };

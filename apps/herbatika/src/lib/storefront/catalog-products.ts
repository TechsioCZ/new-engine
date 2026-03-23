"use client";

import type { HttpTypes } from "@medusajs/types";
import type {
  CatalogFacets,
  CatalogListResponse,
} from "@techsio/storefront-data/catalog/types";
import {
  PLP_PAGE_SIZE,
  type CatalogProductsParams,
  type CatalogQueryState,
} from "./catalog-query-state";
import { storefront } from "./storefront";

export type CatalogProductsInput = CatalogProductsParams & {
  sort?: CatalogQueryState["sort"];
  enabled?: boolean;
};

export type CatalogProductsResponse = CatalogListResponse<
  HttpTypes.StoreProduct,
  CatalogFacets
>;

export const catalogService = storefront.services.catalog;
export const catalogQueryKeys = storefront.queryKeys.catalog;
export const catalogHooks = storefront.hooks.catalog;

export const useCatalogProducts = catalogHooks.useCatalogProducts;
export const useSuspenseCatalogProducts = catalogHooks.useSuspenseCatalogProducts;
export const usePrefetchCatalogProducts = catalogHooks.usePrefetchCatalogProducts;
export const prefetchCatalogProducts = catalogHooks.prefetchCatalogProducts;

export const fetchCatalogProducts = (
  input: CatalogProductsInput,
  signal?: AbortSignal,
) => catalogService.getCatalogProducts(input, signal);

export { PLP_PAGE_SIZE };

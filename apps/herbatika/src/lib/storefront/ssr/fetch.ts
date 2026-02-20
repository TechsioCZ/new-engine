import type { HttpTypes } from "@medusajs/types";
import {
  MEDUSA_BACKEND_URL,
  MEDUSA_PUBLISHABLE_KEY,
  SSR_FETCH_OPTIONS,
  type SsrFetchProfile,
} from "./constants";
import { toQueryString } from "./query";
import type {
  CatalogListParams,
  CatalogStoreResponse,
  CategoryListParams,
  ProductDetailParams,
  ProductListParams,
  QueryInput,
  RegionListParams,
} from "./types";

const fetchStore = async <T>(
  path: string,
  query: unknown,
  fetchProfile: SsrFetchProfile,
  signal?: AbortSignal,
): Promise<T> => {
  const normalizedQuery =
    query && typeof query === "object" ? (query as QueryInput) : {};
  const queryString = toQueryString(normalizedQuery);
  const url = `${MEDUSA_BACKEND_URL}${path}${queryString ? `?${queryString}` : ""}`;

  const headers = new Headers();
  if (MEDUSA_PUBLISHABLE_KEY) {
    headers.set("x-publishable-api-key", MEDUSA_PUBLISHABLE_KEY);
  }

  const response = await fetch(url, {
    method: "GET",
    headers,
    signal,
    ...SSR_FETCH_OPTIONS[fetchProfile],
  });

  if (!response.ok) {
    const responseText = await response.text().catch(() => "");

    throw new Error(
      `Store request failed (${response.status}) for ${path}${queryString ? `?${queryString}` : ""}${
        responseText ? `: ${responseText}` : ""
      }`,
    );
  }

  return (await response.json()) as T;
};

export const fetchRegions = async (
  params: RegionListParams,
  signal?: AbortSignal,
): Promise<{ regions: HttpTypes.StoreRegion[]; count: number }> => {
  const response = await fetchStore<HttpTypes.StoreRegionListResponse>(
    "/store/regions",
    params,
    "static",
    signal,
  );

  return {
    regions: response.regions ?? [],
    count: response.count ?? response.regions?.length ?? 0,
  };
};

export const fetchCategories = async (
  params: CategoryListParams,
  signal?: AbortSignal,
): Promise<{ categories: HttpTypes.StoreProductCategory[]; count: number }> => {
  const response = await fetchStore<HttpTypes.StoreProductCategoryListResponse>(
    "/store/product-categories",
    params,
    "static",
    signal,
  );

  return {
    categories: response.product_categories ?? [],
    count: response.count ?? response.product_categories?.length ?? 0,
  };
};

export const fetchProducts = async (
  params: ProductListParams,
  signal?: AbortSignal,
): Promise<HttpTypes.StoreProductListResponse> => {
  return fetchStore<HttpTypes.StoreProductListResponse>(
    "/store/products",
    params,
    "semiStatic",
    signal,
  );
};

export const fetchCatalogProducts = async (
  params: CatalogListParams,
  signal?: AbortSignal,
): Promise<CatalogStoreResponse> => {
  return fetchStore<CatalogStoreResponse>(
    "/store/catalog/products",
    params,
    "semiStatic",
    signal,
  );
};

export const fetchProductByHandle = async (
  params: ProductDetailParams,
  signal?: AbortSignal,
): Promise<HttpTypes.StoreProduct | null> => {
  const response = await fetchProducts(
    {
      handle: params.handle,
      limit: 1,
      region_id: params.region_id,
      country_code: params.country_code,
      province: params.province,
      cart_id: params.cart_id,
      locale: params.locale,
      fields: params.fields,
    },
    signal,
  );

  return response.products?.[0] ?? null;
};

import "server-only";

import type { FindParams, HttpTypes } from "@medusajs/types";
import type { CatalogProductsParams } from "./catalog-query-state";
import { storefrontCacheConfig } from "./cache";
import {
  createMedusaCatalogService,
  type MedusaCatalogListInput,
} from "@techsio/storefront-data/catalog/medusa-service";
import {
  createMedusaCategoryService,
  type MedusaCategoryDetailInput,
  type MedusaCategoryListInput,
} from "@techsio/storefront-data/categories/medusa-service";
import {
  createMedusaProductService,
  type MedusaProductDetailInput,
  type MedusaProductListInput,
} from "@techsio/storefront-data/products/medusa-service";
import {
  createMedusaRegionService,
  type MedusaRegionDetailInput,
  type MedusaRegionListInput,
} from "@techsio/storefront-data/regions/medusa-service";
import {
  STOREFRONT_SEARCH_PRODUCT_CARD_FIELDS,
} from "./product-query-config";
import { storefrontSdk } from "./sdk";
import { storefrontCoreDefinition } from "./storefront-core-definition";
import type {
  ProductDetailParams,
  ProductListParams,
  RegionListParams,
} from "./ssr/types";

type CategoryListParams = FindParams & HttpTypes.StoreProductCategoryListParams;
type SearchProductsBatchInput = {
  handles: string[];
  regionId?: string | null;
  countryCode?: string | null;
  limit?: number;
};

export const storefrontServerServices = {
  products: createMedusaProductService<
    HttpTypes.StoreProduct,
    MedusaProductListInput,
    MedusaProductDetailInput
  >(storefrontSdk, storefrontCoreDefinition.products.serviceConfig),
  regions: createMedusaRegionService(storefrontSdk),
  categories: createMedusaCategoryService<
    HttpTypes.StoreProductCategory,
    MedusaCategoryListInput,
    MedusaCategoryDetailInput
  >(storefrontSdk, storefrontCoreDefinition.categories.serviceConfig),
  catalog: createMedusaCatalogService<
    HttpTypes.StoreProduct,
    MedusaCatalogListInput
  >(storefrontSdk, storefrontCoreDefinition.catalog.serviceConfig),
};

export const getServerRegionListQueryOptions = (params: RegionListParams) => {
  return {
    queryKey: storefrontCoreDefinition.queryKeys.regions.list(params),
    queryFn: ({ signal }: { signal?: AbortSignal }) =>
      storefrontServerServices.regions.getRegions(params, signal),
    ...storefrontCacheConfig.static,
  };
};

export const getServerCategoryListQueryOptions = (params: CategoryListParams) => {
  return {
    queryKey: storefrontCoreDefinition.queryKeys.categories.list(params),
    queryFn: ({ signal }: { signal?: AbortSignal }) =>
      storefrontServerServices.categories.getCategories(params, signal),
    ...storefrontCacheConfig.static,
  };
};

export const getServerCatalogListQueryOptions = (params: CatalogProductsParams) => {
  return {
    queryKey: storefrontCoreDefinition.queryKeys.catalog.list(params),
    queryFn: ({ signal }: { signal?: AbortSignal }) =>
      storefrontServerServices.catalog.getCatalogProducts(params, signal),
    ...storefrontCacheConfig.semiStatic,
  };
};

export const getServerProductListQueryOptions = (params: ProductListParams) => {
  return {
    queryKey: storefrontCoreDefinition.queryKeys.products.list(params),
    queryFn: ({ signal }: { signal?: AbortSignal }) =>
      storefrontServerServices.products.getProducts(params, signal),
    ...storefrontCacheConfig.semiStatic,
  };
};

export const getServerProductDetailQueryOptions = (params: ProductDetailParams) => {
  return {
    queryKey: storefrontCoreDefinition.queryKeys.products.detail(params),
    queryFn: ({ signal }: { signal?: AbortSignal }) =>
      storefrontServerServices.products.getProductByHandle(params, signal),
    ...storefrontCacheConfig.semiStatic,
  };
};

export const fetchServerSearchProductsByHandles = async (
  input: SearchProductsBatchInput,
  signal?: AbortSignal,
) => {
  if (input.handles.length === 0) {
    return {
      products: [] as HttpTypes.StoreProduct[],
      count: 0,
    };
  }

  const searchParams = new URLSearchParams();
  searchParams.set("offset", "0");
  searchParams.set("limit", String(input.limit ?? input.handles.length));
  searchParams.set("fields", STOREFRONT_SEARCH_PRODUCT_CARD_FIELDS);

  if (input.regionId) {
    searchParams.set("region_id", input.regionId);
  }

  if (input.countryCode) {
    searchParams.set("country_code", input.countryCode);
  }

  for (const handle of input.handles) {
    searchParams.append("handle[]", handle);
  }

  const response = await storefrontSdk.client.fetch<HttpTypes.StoreProductListResponse>(
    `/store/products?${searchParams.toString()}`,
    {
      signal,
    },
  );

  return {
    products: response.products ?? [],
    count: response.count ?? 0,
  };
};

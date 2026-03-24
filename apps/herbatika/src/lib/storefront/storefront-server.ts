import "server-only";

import type { FindParams, HttpTypes } from "@medusajs/types";
import type { CatalogProductsParams } from "./catalog-query-state";
import { storefrontCacheConfig } from "./cache";
import {
  createMedusaCatalogService,
  type MedusaCatalogListInput,
} from "@techsio/storefront-data/catalog/medusa-service";
import { createCatalogQueryKeys } from "@techsio/storefront-data/catalog/query-keys";
import {
  createMedusaCategoryService,
  type MedusaCategoryDetailInput,
  type MedusaCategoryListInput,
} from "@techsio/storefront-data/categories/medusa-service";
import { createCategoryQueryKeys } from "@techsio/storefront-data/categories/query-keys";
import {
  createMedusaProductService,
  type MedusaProductDetailInput,
  type MedusaProductListInput,
} from "@techsio/storefront-data/products/medusa-service";
import { createProductQueryKeys } from "@techsio/storefront-data/products/query-keys";
import {
  createMedusaRegionService,
  type MedusaRegionDetailInput,
  type MedusaRegionListInput,
} from "@techsio/storefront-data/regions/medusa-service";
import { createRegionQueryKeys } from "@techsio/storefront-data/regions/query-keys";
import {
  STOREFRONT_PRODUCT_CARD_FIELDS,
  STOREFRONT_PRODUCT_DETAIL_FIELDS,
  STOREFRONT_SEARCH_PRODUCT_CARD_FIELDS,
} from "./product-query-config";
import { STOREFRONT_QUERY_KEY_NAMESPACE } from "./query-keys";
import { storefrontSdk } from "./sdk";
import {
  STOREFRONT_CATALOG_DEFAULT_LIMIT,
  STOREFRONT_CATALOG_DEFAULT_SORT,
  STOREFRONT_CATEGORY_FIELDS,
} from "./storefront-config";
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

export const storefrontServerQueryKeys = {
  products: createProductQueryKeys<MedusaProductListInput, MedusaProductDetailInput>(
    STOREFRONT_QUERY_KEY_NAMESPACE,
  ),
  regions: createRegionQueryKeys<MedusaRegionListInput, MedusaRegionDetailInput>(
    STOREFRONT_QUERY_KEY_NAMESPACE,
  ),
  categories: createCategoryQueryKeys<
    MedusaCategoryListInput,
    MedusaCategoryDetailInput
  >(STOREFRONT_QUERY_KEY_NAMESPACE),
  catalog: createCatalogQueryKeys<MedusaCatalogListInput>(
    STOREFRONT_QUERY_KEY_NAMESPACE,
  ),
};

export const storefrontServerServices = {
  products: createMedusaProductService<
    HttpTypes.StoreProduct,
    MedusaProductListInput,
    MedusaProductDetailInput
  >(storefrontSdk, {
    defaultListFields: STOREFRONT_PRODUCT_CARD_FIELDS,
    defaultDetailFields: STOREFRONT_PRODUCT_DETAIL_FIELDS,
  }),
  regions: createMedusaRegionService(storefrontSdk),
  categories: createMedusaCategoryService<
    HttpTypes.StoreProductCategory,
    MedusaCategoryListInput,
    MedusaCategoryDetailInput
  >(storefrontSdk, {
    defaultListFields: STOREFRONT_CATEGORY_FIELDS,
    defaultDetailFields: STOREFRONT_CATEGORY_FIELDS,
  }),
  catalog: createMedusaCatalogService<HttpTypes.StoreProduct, MedusaCatalogListInput>(
    storefrontSdk,
    {
      defaultLimit: STOREFRONT_CATALOG_DEFAULT_LIMIT,
      defaultSort: STOREFRONT_CATALOG_DEFAULT_SORT,
    },
  ),
};

export const getServerRegionListQueryOptions = (params: RegionListParams) => {
  return {
    queryKey: storefrontServerQueryKeys.regions.list(params),
    queryFn: ({ signal }: { signal?: AbortSignal }) =>
      storefrontServerServices.regions.getRegions(params, signal),
    ...storefrontCacheConfig.static,
  };
};

export const getServerCategoryListQueryOptions = (params: CategoryListParams) => {
  return {
    queryKey: storefrontServerQueryKeys.categories.list(params),
    queryFn: ({ signal }: { signal?: AbortSignal }) =>
      storefrontServerServices.categories.getCategories(params, signal),
    ...storefrontCacheConfig.static,
  };
};

export const getServerCatalogListQueryOptions = (params: CatalogProductsParams) => {
  return {
    queryKey: storefrontServerQueryKeys.catalog.list(params),
    queryFn: ({ signal }: { signal?: AbortSignal }) =>
      storefrontServerServices.catalog.getCatalogProducts(params, signal),
    ...storefrontCacheConfig.semiStatic,
  };
};

export const getServerProductListQueryOptions = (params: ProductListParams) => {
  return {
    queryKey: storefrontServerQueryKeys.products.list(params),
    queryFn: ({ signal }: { signal?: AbortSignal }) =>
      storefrontServerServices.products.getProducts(params, signal),
    ...storefrontCacheConfig.semiStatic,
  };
};

export const getServerProductDetailQueryOptions = (params: ProductDetailParams) => {
  return {
    queryKey: storefrontServerQueryKeys.products.detail(params),
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

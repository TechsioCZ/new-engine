import "server-only";

import type { HttpTypes } from "@medusajs/types";
import type { QueryClient } from "@tanstack/react-query";
import type { MedusaCatalogListInput } from "@techsio/storefront-data/catalog/medusa-service";
import type { CatalogFacets } from "@techsio/storefront-data/catalog/types";
import type {
  MedusaCategoryDetailInput,
  MedusaCategoryListInput,
} from "@techsio/storefront-data/categories/medusa-service";
import {
  createMedusaStorefrontServerReadPreset,
} from "@techsio/storefront-data/medusa/server-read";
import type {
  MedusaProductDetailInput,
  MedusaProductListInput,
} from "@techsio/storefront-data/products/medusa-service";
import type {
  MedusaRegionDetailInput,
  MedusaRegionListInput,
} from "@techsio/storefront-data/regions/medusa-service";
import { STOREFRONT_SEARCH_PRODUCT_CARD_FIELDS } from "./product-query-config";
import { storefrontSdk } from "./sdk";
import { storefrontCoreDefinition } from "./storefront-core-definition";
import type {
  CategoryListParams,
  CatalogListParams,
  ProductDetailParams,
  ProductListParams,
  RegionListParams,
} from "./ssr/types";

const storefrontServerRead = createMedusaStorefrontServerReadPreset<
  HttpTypes.StoreProduct,
  HttpTypes.StoreProductCategory,
  HttpTypes.StoreCollection,
  HttpTypes.StoreProduct,
  CatalogFacets
>({
  sdk: storefrontSdk,
  queryKeyNamespace: storefrontCoreDefinition.namespace,
  cacheConfig: storefrontCoreDefinition.cacheConfig,
  products: {
    serviceConfig: storefrontCoreDefinition.products.serviceConfig,
    hooks: {
      buildListParams:
        storefrontCoreDefinition.products.hooks.buildListParams as (
          input: MedusaProductListInput,
        ) => ProductListParams,
      buildDetailParams:
        storefrontCoreDefinition.products.hooks.buildDetailParams as (
          input: MedusaProductDetailInput,
        ) => ProductDetailParams,
    },
    queryKeys: storefrontCoreDefinition.queryKeys.products,
  },
  orders: {
    serviceConfig: storefrontCoreDefinition.orders.serviceConfig,
    hooks: storefrontCoreDefinition.orders.hooks,
    queryKeys: storefrontCoreDefinition.queryKeys.orders,
  },
  regions: {
    queryKeys: storefrontCoreDefinition.queryKeys.regions,
  },
  categories: {
    serviceConfig: storefrontCoreDefinition.categories.serviceConfig,
    hooks: {
      buildListParams:
        storefrontCoreDefinition.categories.hooks.buildListParams as (
          input: MedusaCategoryListInput,
        ) => CategoryListParams,
      buildDetailParams:
        storefrontCoreDefinition.categories.hooks.buildDetailParams as (
          input: MedusaCategoryDetailInput,
        ) => MedusaCategoryDetailInput,
    },
    queryKeys: storefrontCoreDefinition.queryKeys.categories,
  },
  catalog: {
    serviceConfig: storefrontCoreDefinition.catalog.serviceConfig,
    queryKeys: storefrontCoreDefinition.queryKeys.catalog,
  },
});

export const fetchServerRegions = (
  queryClient: QueryClient,
  listParams: RegionListParams,
) =>
  queryClient.fetchQuery(
    storefrontServerRead.queries.regions.getListQueryOptions(listParams),
  );

export const prefetchServerProducts = (
  queryClient: QueryClient,
  listParams: ProductListParams,
) =>
  queryClient.prefetchQuery(
    storefrontServerRead.queries.products.getListQueryOptions(listParams),
  );

export const fetchServerProduct = (
  queryClient: QueryClient,
  detailParams: ProductDetailParams,
) =>
  queryClient.fetchQuery(
    storefrontServerRead.queries.products.getDetailQueryOptions(detailParams),
  );

export const fetchServerCategories = (
  queryClient: QueryClient,
  listParams: CategoryListParams,
) =>
  queryClient.fetchQuery(
    storefrontServerRead.queries.categories.getListQueryOptions(listParams),
  );

export const prefetchServerCatalogProducts = (
  queryClient: QueryClient,
  listParams: CatalogListParams,
) =>
  queryClient.prefetchQuery(
    storefrontServerRead.queries.catalog.getListQueryOptions(listParams),
  );

type SearchProductsBatchInput = {
  handles: string[];
  regionId?: string | null;
  countryCode?: string | null;
  limit?: number;
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

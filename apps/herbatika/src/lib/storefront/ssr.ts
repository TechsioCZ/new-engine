import "server-only";

import type { FindParams, HttpTypes } from "@medusajs/types";
import {
  createQueryKey,
  normalizeQueryKeyPart,
  type RegionInfo,
} from "@techsio/storefront-data/shared";
import { dehydrate, getServerQueryClient } from "@techsio/storefront-data/server";
import type { QueryClient } from "@tanstack/react-query";
import { cookies } from "next/headers";
import { storefrontCacheConfig } from "./cache";
import { buildCategoryListParams } from "./category-query-config";
import {
  PLP_PAGE_SIZE,
  resolveProductSortOrder,
  type PlpQueryState,
} from "./plp-config";
import {
  buildProductListParams,
  STOREFRONT_PRODUCT_DETAIL_FIELDS,
} from "./product-query-config";
import { STOREFRONT_QUERY_KEY_NAMESPACE } from "./query-keys";
import {
  REGION_COUNTRY_CODE_STORAGE_KEY,
  REGION_STORAGE_KEY,
  resolveRegionInfoFromCookieValues,
} from "./region-preferences";
import { REGION_LIST_FIELDS, REGION_LIST_LIMIT } from "./region-query-config";
import { resolveRegionByIdOrDefault, toRegionInfo } from "./region-selection";

const HOMEPAGE_PRODUCTS_LIMIT = 24;
const CATEGORY_LIST_LIMIT = 500;
const PDP_RELATED_PRODUCTS_LIMIT = 13;
const PDP_RELATED_PRODUCTS_FIELDS =
  "id,title,handle,thumbnail,*variants.calculated_price";

const MEDUSA_BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000";
const MEDUSA_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? "";

type RegionListParams = HttpTypes.StoreRegionFilters & {
  fields?: string;
  limit?: number;
  offset?: number;
};

type CategoryListParams = FindParams & HttpTypes.StoreProductCategoryListParams;
type ProductListParams = HttpTypes.StoreProductListParams;
type ProductDetailParams = {
  handle: string;
  region_id?: string;
  country_code?: string;
  province?: string;
  cart_id?: string;
  locale?: string;
  fields?: string;
};

type QueryParamPrimitive = string | number | boolean;
type QueryParamValue =
  | QueryParamPrimitive
  | null
  | undefined
  | QueryParamPrimitive[]
  | null[]
  | undefined[];
type QueryInput = Record<string, QueryParamValue>;

const buildListQueryKey = (
  resource: "products" | "categories" | "regions",
  params: unknown,
) => {
  return createQueryKey(
    STOREFRONT_QUERY_KEY_NAMESPACE,
    resource,
    "list",
    normalizeQueryKeyPart(params, { omitKeys: ["enabled"] }),
  );
};

const buildDetailQueryKey = (
  resource: "products" | "categories" | "regions",
  params: unknown,
) => {
  return createQueryKey(
    STOREFRONT_QUERY_KEY_NAMESPACE,
    resource,
    "detail",
    normalizeQueryKeyPart(params, { omitKeys: ["enabled"] }),
  );
};

const toQueryString = (query: QueryInput): string => {
  const searchParams = new URLSearchParams();

  for (const [key, rawValue] of Object.entries(query)) {
    if (rawValue === null || rawValue === undefined) {
      continue;
    }

    if (Array.isArray(rawValue)) {
      for (const item of rawValue) {
        if (item === null || item === undefined) {
          continue;
        }

        searchParams.append(key, String(item));
      }

      continue;
    }

    searchParams.append(key, String(rawValue));
  }

  return searchParams.toString();
};

const fetchStore = async <T>(
  path: string,
  query: unknown,
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
    cache: "no-store",
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

const fetchRegions = async (
  params: RegionListParams,
  signal?: AbortSignal,
): Promise<{ regions: HttpTypes.StoreRegion[]; count: number }> => {
  const response = await fetchStore<HttpTypes.StoreRegionListResponse>(
    "/store/regions",
    params,
    signal,
  );

  return {
    regions: response.regions ?? [],
    count: response.count ?? response.regions?.length ?? 0,
  };
};

const fetchCategories = async (
  params: CategoryListParams,
  signal?: AbortSignal,
): Promise<{ categories: HttpTypes.StoreProductCategory[]; count: number }> => {
  const response = await fetchStore<HttpTypes.StoreProductCategoryListResponse>(
    "/store/product-categories",
    params,
    signal,
  );

  return {
    categories: response.product_categories ?? [],
    count: response.count ?? response.product_categories?.length ?? 0,
  };
};

const fetchProducts = async (
  params: ProductListParams,
  signal?: AbortSignal,
): Promise<HttpTypes.StoreProductListResponse> => {
  return fetchStore<HttpTypes.StoreProductListResponse>(
    "/store/products",
    params,
    signal,
  );
};

const fetchProductByHandle = async (
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

const resolveCookieRegionPreference = async (): Promise<RegionInfo | null> => {
  const cookieStore = await cookies();

  return resolveRegionInfoFromCookieValues(
    cookieStore.get(REGION_STORAGE_KEY)?.value,
    cookieStore.get(REGION_COUNTRY_CODE_STORAGE_KEY)?.value,
  );
};

const resolveRelatedCategoryIds = (product: HttpTypes.StoreProduct | null): string[] => {
  const productCategories = product?.categories ?? [];
  if (productCategories.length === 0) {
    return [];
  }

  const parentCategoryIds = new Set<string>();
  const allCategoryIds = new Set<string>();

  for (const category of productCategories) {
    if (category.id) {
      allCategoryIds.add(category.id);
    }

    if (category.parent_category_id) {
      parentCategoryIds.add(category.parent_category_id);
    }
  }

  const leafCategoryIds = Array.from(allCategoryIds).filter(
    (categoryId) => !parentCategoryIds.has(categoryId),
  );

  return (leafCategoryIds.length > 0 ? leafCategoryIds : Array.from(allCategoryIds)).slice(
    0,
    3,
  );
};

const collectDescendantCategoryIds = (
  categories: HttpTypes.StoreProductCategory[],
  rootCategoryId: string,
): string[] => {
  const childrenByParentId = new Map<string, string[]>();

  for (const category of categories) {
    if (!category.parent_category_id) {
      continue;
    }

    const siblings = childrenByParentId.get(category.parent_category_id) ?? [];
    siblings.push(category.id);
    childrenByParentId.set(category.parent_category_id, siblings);
  }

  const stack = [rootCategoryId];
  const visited = new Set<string>([rootCategoryId]);
  const descendants: string[] = [];

  while (stack.length > 0) {
    const currentId = stack.pop();
    if (!currentId) {
      continue;
    }

    const childIds = childrenByParentId.get(currentId) ?? [];
    for (const childId of childIds) {
      if (visited.has(childId)) {
        continue;
      }

      visited.add(childId);
      descendants.push(childId);
      stack.push(childId);
    }
  }

  return descendants;
};

const getRegionServerContext = async () => {
  const queryClient = getServerQueryClient();
  const cookieRegionPreference = await resolveCookieRegionPreference();

  const listParams: RegionListParams = {
    fields: REGION_LIST_FIELDS,
    limit: REGION_LIST_LIMIT,
  };

  const regionListResponse = await queryClient.fetchQuery({
    queryKey: buildListQueryKey("regions", listParams),
    queryFn: ({ signal }) => fetchRegions(listParams, signal),
    ...storefrontCacheConfig.static,
  });

  const resolvedRegionRecord = resolveRegionByIdOrDefault(
    regionListResponse.regions,
    cookieRegionPreference?.region_id,
  );
  const region = resolvedRegionRecord
    ? toRegionInfo(resolvedRegionRecord)
    : cookieRegionPreference;

  return {
    queryClient,
    region,
  };
};

const prefetchProductList = async (
  queryClient: QueryClient,
  listParams: ProductListParams,
) => {
  await queryClient.prefetchQuery({
    queryKey: buildListQueryKey("products", listParams),
    queryFn: ({ signal }) => fetchProducts(listParams, signal),
    ...storefrontCacheConfig.semiStatic,
  });
};

const prefetchProductDetail = async (
  queryClient: QueryClient,
  detailParams: ProductDetailParams,
) => {
  return queryClient.fetchQuery({
    queryKey: buildDetailQueryKey("products", detailParams),
    queryFn: ({ signal }) => fetchProductByHandle(detailParams, signal),
    ...storefrontCacheConfig.semiStatic,
  });
};

export const prefetchHomePageStorefrontData = async () => {
  const { queryClient, region } = await getRegionServerContext();

  if (region) {
    const listParams = buildProductListParams({
      page: 1,
      limit: HOMEPAGE_PRODUCTS_LIMIT,
      region_id: region.region_id,
      country_code: region.country_code,
    });

    await prefetchProductList(queryClient, listParams);
  }

  return {
    region,
    dehydratedState: dehydrate(queryClient),
  };
};

export const prefetchCategoryPageStorefrontData = async (
  slug: string,
  queryState: PlpQueryState,
) => {
  const { queryClient, region } = await getRegionServerContext();

  const categoryListParams = buildCategoryListParams({
    page: 1,
    limit: CATEGORY_LIST_LIMIT,
    fields: "id,name,handle,parent_category_id,rank",
  });

  const categoryResponse = await queryClient.fetchQuery({
    queryKey: buildListQueryKey("categories", categoryListParams),
    queryFn: ({ signal }) => fetchCategories(categoryListParams, signal),
    ...storefrontCacheConfig.static,
  });

  const activeCategory =
    categoryResponse.categories.find((category) => category.handle === slug) ?? null;

  if (region && activeCategory) {
    const categoryIds = [
      activeCategory.id,
      ...collectDescendantCategoryIds(categoryResponse.categories, activeCategory.id),
    ];
    const sortOrder = resolveProductSortOrder(queryState.sort);
    const searchQuery = queryState.q.trim();

    const productListParams = buildProductListParams({
      page: queryState.page,
      limit: PLP_PAGE_SIZE,
      category_id: categoryIds,
      order: sortOrder,
      q: searchQuery || undefined,
      region_id: region.region_id,
      country_code: region.country_code,
    });

    await prefetchProductList(queryClient, productListParams);
  }

  return {
    region,
    dehydratedState: dehydrate(queryClient),
  };
};

export const prefetchProductDetailPageStorefrontData = async (handle: string) => {
  const { queryClient, region } = await getRegionServerContext();

  if (region) {
    const detailParams: ProductDetailParams = {
      handle,
      fields: STOREFRONT_PRODUCT_DETAIL_FIELDS,
      region_id: region.region_id,
      country_code: region.country_code,
    };

    const product = await prefetchProductDetail(queryClient, detailParams);
    const relatedCategoryIds = resolveRelatedCategoryIds(product);

    if (relatedCategoryIds.length > 0 && product?.id) {
      const relatedProductsListParams = buildProductListParams({
        page: 1,
        limit: PDP_RELATED_PRODUCTS_LIMIT,
        category_id: relatedCategoryIds,
        order: "-created_at",
        fields: PDP_RELATED_PRODUCTS_FIELDS,
        region_id: region.region_id,
        country_code: region.country_code,
      });

      await prefetchProductList(queryClient, relatedProductsListParams);
    }
  }

  return {
    region,
    dehydratedState: dehydrate(queryClient),
  };
};

import "server-only";

import type { RegionInfo } from "@techsio/storefront-data/shared";
import { getServerQueryClient } from "@techsio/storefront-data/server";
import type { QueryClient } from "@tanstack/react-query";
import { cookies } from "next/headers";
import { storefrontCacheConfig } from "../cache";
import {
  REGION_COUNTRY_CODE_STORAGE_KEY,
  REGION_STORAGE_KEY,
  resolveRegionInfoFromCookieValues,
} from "../region-preferences";
import { REGION_LIST_FIELDS, REGION_LIST_LIMIT } from "../region-query-config";
import { resolveRegionByIdOrDefault, toRegionInfo } from "../region-selection";
import { fetchProductByHandle, fetchProducts, fetchRegions } from "./fetch";
import { buildDetailQueryKey, buildListQueryKey } from "./query";
import type {
  ProductDetailParams,
  ProductListParams,
  RegionListParams,
} from "./types";

const resolveCookieRegionPreference = async (): Promise<RegionInfo | null> => {
  const cookieStore = await cookies();

  return resolveRegionInfoFromCookieValues(
    cookieStore.get(REGION_STORAGE_KEY)?.value,
    cookieStore.get(REGION_COUNTRY_CODE_STORAGE_KEY)?.value,
  );
};

export const getRegionServerContext = async () => {
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

export const prefetchProductList = async (
  queryClient: QueryClient,
  listParams: ProductListParams,
) => {
  await queryClient.prefetchQuery({
    queryKey: buildListQueryKey("products", listParams),
    queryFn: ({ signal }) => fetchProducts(listParams, signal),
    ...storefrontCacheConfig.semiStatic,
  });
};

export const prefetchProductDetail = async (
  queryClient: QueryClient,
  detailParams: ProductDetailParams,
) => {
  return queryClient.fetchQuery({
    queryKey: buildDetailQueryKey("products", detailParams),
    queryFn: ({ signal }) => fetchProductByHandle(detailParams, signal),
    ...storefrontCacheConfig.semiStatic,
  });
};

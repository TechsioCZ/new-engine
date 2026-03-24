import "server-only";

import type { RegionInfo } from "@techsio/storefront-data/shared/region";
import { getServerQueryClient } from "@techsio/storefront-data/server/get-query-client";
import type { QueryClient } from "@tanstack/react-query";
import { cookies } from "next/headers";
import {
  getServerProductDetailQueryOptions,
  getServerProductListQueryOptions,
  getServerRegionListQueryOptions,
} from "../storefront-server";
import {
  REGION_COUNTRY_CODE_STORAGE_KEY,
  REGION_STORAGE_KEY,
  resolveRegionInfoFromCookieValues,
} from "../region-preferences";
import { REGION_LIST_FIELDS, REGION_LIST_LIMIT } from "../region-query-config";
import { resolveRegionByIdOrDefault, toRegionInfo } from "../region-selection";
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

  const regionListResponse = await queryClient.fetchQuery(
    getServerRegionListQueryOptions(listParams),
  );

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
  await queryClient.prefetchQuery(
    getServerProductListQueryOptions(listParams),
  );
};

export const prefetchProductDetail = async (
  queryClient: QueryClient,
  detailParams: ProductDetailParams,
) => {
  return queryClient.fetchQuery(getServerProductDetailQueryOptions(detailParams));
};

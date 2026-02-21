"use client";

import type { HttpTypes } from "@medusajs/types";
import { createQueryKey, normalizeQueryKeyPart } from "@techsio/storefront-data/shared";
import { useQuery, type QueryClient } from "@tanstack/react-query";
import { storefrontCacheConfig } from "./cache";
import type { StorefrontSearchResult } from "./meili-search";
import { STOREFRONT_QUERY_KEY_NAMESPACE } from "./query-keys";

type StorefrontSearchInput = {
  q: string;
  page?: number;
  limit?: number;
  enabled?: boolean;
};

type StorefrontSearchProductsInput = {
  handles: string[];
  regionId?: string;
  countryCode?: string;
  enabled?: boolean;
};

type StorefrontSearchProductsResult = {
  products: HttpTypes.StoreProduct[];
  count: number;
};

const DEFAULT_SEARCH_PAGE = 1;
const DEFAULT_SEARCH_LIMIT = 24;

const toPositiveInteger = (
  value: number | undefined,
  fallbackValue: number,
): number => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallbackValue;
  }

  const normalizedValue = Math.trunc(value);
  if (normalizedValue < 1) {
    return fallbackValue;
  }

  return normalizedValue;
};

const normalizeSearchInput = (input: StorefrontSearchInput) => {
  return {
    q: input.q.trim(),
    page: toPositiveInteger(input.page, DEFAULT_SEARCH_PAGE),
    limit: toPositiveInteger(input.limit, DEFAULT_SEARCH_LIMIT),
    enabled: input.enabled ?? true,
  };
};

const normalizeSearchProductsInput = (input: StorefrontSearchProductsInput) => {
  const handles = Array.from(
    new Set(
      input.handles
        .map((handle) => handle.trim())
        .filter((handle) => handle.length > 0),
    ),
  ).sort((left, right) => left.localeCompare(right));

  return {
    handles,
    regionId: input.regionId?.trim() || "",
    countryCode: input.countryCode?.trim() || "",
    enabled: input.enabled ?? true,
  };
};

const parseSearchErrorMessage = async (response: Response): Promise<string> => {
  try {
    const payload = (await response.json()) as { message?: string };
    if (typeof payload.message === "string" && payload.message.trim().length > 0) {
      return payload.message;
    }
  } catch {
    // noop
  }

  return `Search failed with status ${response.status}`;
};

export const searchQueryKeys = {
  all: () => createQueryKey(STOREFRONT_QUERY_KEY_NAMESPACE, "search"),
  list: (input: StorefrontSearchInput) =>
    createQueryKey(
      STOREFRONT_QUERY_KEY_NAMESPACE,
      "search",
      "list",
      normalizeQueryKeyPart(normalizeSearchInput(input), {
        omitKeys: ["enabled"],
      }),
    ),
  products: (input: StorefrontSearchProductsInput) =>
    createQueryKey(
      STOREFRONT_QUERY_KEY_NAMESPACE,
      "search",
      "products",
      normalizeQueryKeyPart(normalizeSearchProductsInput(input), {
        omitKeys: ["enabled"],
      }),
    ),
};

export const fetchStorefrontSearch = async (
  input: StorefrontSearchInput,
  signal?: AbortSignal,
): Promise<StorefrontSearchResult> => {
  const normalizedInput = normalizeSearchInput(input);
  if (!normalizedInput.q) {
    return {
      provider: "meili",
      query: "",
      hits: [],
      estimatedTotalHits: 0,
      processingTimeMs: 0,
      page: normalizedInput.page,
      pageSize: normalizedInput.limit,
      totalPages: 0,
    };
  }

  const response = await fetch(
    `/api/storefront-search?q=${encodeURIComponent(normalizedInput.q)}&limit=${normalizedInput.limit}&page=${normalizedInput.page}`,
    {
      method: "GET",
      cache: "no-store",
      signal,
    },
  );

  if (!response.ok) {
    throw new Error(await parseSearchErrorMessage(response));
  }

  return (await response.json()) as StorefrontSearchResult;
};

export const useStorefrontSearch = (input: StorefrontSearchInput) => {
  const normalizedInput = normalizeSearchInput(input);
  const isQueryEnabled = normalizedInput.enabled && normalizedInput.q.length > 0;

  return useQuery({
    queryKey: searchQueryKeys.list(normalizedInput),
    queryFn: ({ signal }) => fetchStorefrontSearch(normalizedInput, signal),
    enabled: isQueryEnabled,
    ...storefrontCacheConfig.semiStatic,
  });
};

export const fetchStorefrontSearchProducts = async (
  input: StorefrontSearchProductsInput,
  signal?: AbortSignal,
): Promise<StorefrontSearchProductsResult> => {
  const normalizedInput = normalizeSearchProductsInput(input);
  if (normalizedInput.handles.length === 0) {
    return { products: [], count: 0 };
  }

  const response = await fetch("/api/storefront-search/products", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      handles: normalizedInput.handles,
      regionId: normalizedInput.regionId || undefined,
      countryCode: normalizedInput.countryCode || undefined,
    }),
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error(await parseSearchErrorMessage(response));
  }

  return (await response.json()) as StorefrontSearchProductsResult;
};

export const useStorefrontSearchProducts = (input: StorefrontSearchProductsInput) => {
  const normalizedInput = normalizeSearchProductsInput(input);
  const isQueryEnabled =
    normalizedInput.enabled &&
    normalizedInput.handles.length > 0 &&
    Boolean(normalizedInput.regionId);

  return useQuery({
    queryKey: searchQueryKeys.products(normalizedInput),
    queryFn: ({ signal }) => fetchStorefrontSearchProducts(normalizedInput, signal),
    enabled: isQueryEnabled,
    ...storefrontCacheConfig.semiStatic,
  });
};

export const prefetchStorefrontSearch = async (
  queryClient: QueryClient,
  input: StorefrontSearchInput,
) => {
  const normalizedInput = normalizeSearchInput(input);
  if (!normalizedInput.q) {
    return;
  }

  await queryClient.prefetchQuery({
    queryKey: searchQueryKeys.list(normalizedInput),
    queryFn: ({ signal }) => fetchStorefrontSearch(normalizedInput, signal),
    ...storefrontCacheConfig.semiStatic,
  });
};

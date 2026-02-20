import {
  createQueryKey,
  normalizeQueryKeyPart,
} from "@techsio/storefront-data/shared";
import { STOREFRONT_QUERY_KEY_NAMESPACE } from "../query-keys";
import type { QueryInput } from "./types";

export const buildListQueryKey = (
  resource: "products" | "categories" | "regions" | "catalog",
  params: unknown,
) => {
  return createQueryKey(
    STOREFRONT_QUERY_KEY_NAMESPACE,
    resource,
    "list",
    normalizeQueryKeyPart(params, { omitKeys: ["enabled"] }),
  );
};

export const buildDetailQueryKey = (
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

export const toQueryString = (query: QueryInput): string => {
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

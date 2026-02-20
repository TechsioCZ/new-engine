import type { MeiliSearchConfig } from "./types";
import { normalizeOptionalString } from "./utils";

export const resolveMeiliSearchConfig = (): MeiliSearchConfig => {
  const host = normalizeOptionalString(process.env.MEILISEARCH_HOST);
  const apiKey = normalizeOptionalString(process.env.MEILISEARCH_SEARCH_API_KEY);

  if (!host) {
    throw new Error("MEILISEARCH_HOST is not configured.");
  }

  if (!apiKey) {
    throw new Error("MEILISEARCH_SEARCH_API_KEY is not configured.");
  }

  return {
    host: host.replace(/\/$/, ""),
    apiKey,
    indexes: {
      products:
        normalizeOptionalString(process.env.MEILISEARCH_PRODUCTS_INDEX) ??
        "products",
      categories:
        normalizeOptionalString(process.env.MEILISEARCH_CATEGORIES_INDEX) ??
        "categories",
      producers:
        normalizeOptionalString(process.env.MEILISEARCH_PRODUCERS_INDEX) ??
        "producers",
    },
  };
};

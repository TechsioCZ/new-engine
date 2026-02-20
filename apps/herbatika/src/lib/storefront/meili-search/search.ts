import { fetchMeili } from "./client";
import { resolveMeiliSearchConfig } from "./config";
import type {
  MeiliSearchPayload,
  StorefrontSearchHit,
  StorefrontSearchResult,
} from "./types";
import { resolveSearchLimit, resolveSearchPage, toSearchHit } from "./utils";

export const searchStorefrontProducts = async (
  query: string,
  options?: {
    limit?: number;
    page?: number;
  },
): Promise<StorefrontSearchResult> => {
  const normalizedQuery = query.trim();
  const resolvedLimit = resolveSearchLimit(options?.limit);
  const resolvedPage = resolveSearchPage(options?.page);

  if (!normalizedQuery) {
    return {
      provider: "meili",
      query: "",
      hits: [],
      estimatedTotalHits: 0,
      processingTimeMs: 0,
      page: resolvedPage,
      pageSize: resolvedLimit,
      totalPages: 0,
    };
  }

  const config = resolveMeiliSearchConfig();
  const offset = (resolvedPage - 1) * resolvedLimit;

  const payload = await fetchMeili<MeiliSearchPayload>(
    config,
    `/indexes/${encodeURIComponent(config.indexes.products)}/search`,
    {
      method: "POST",
      body: JSON.stringify({
        q: normalizedQuery,
        limit: resolvedLimit,
        offset,
        attributesToRetrieve: ["id", "title", "handle", "thumbnail", "description"],
      }),
    },
  );

  const rawHits = Array.isArray(payload.hits) ? payload.hits : [];
  const hits = rawHits
    .map(toSearchHit)
    .filter((hit): hit is StorefrontSearchHit => Boolean(hit));
  const estimatedTotalHits =
    typeof payload.estimatedTotalHits === "number"
      ? payload.estimatedTotalHits
      : hits.length;
  const totalPages =
    estimatedTotalHits > 0
      ? Math.max(1, Math.ceil(estimatedTotalHits / resolvedLimit))
      : 0;

  return {
    provider: "meili",
    query: normalizedQuery,
    hits,
    estimatedTotalHits,
    processingTimeMs:
      typeof payload.processingTimeMs === "number" ? payload.processingTimeMs : 0,
    page: resolvedPage,
    pageSize: resolvedLimit,
    totalPages,
  };
};

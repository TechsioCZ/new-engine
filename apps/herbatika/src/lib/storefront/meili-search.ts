export type StorefrontSearchHit = {
  id: string;
  title: string;
  handle: string;
  thumbnail: string | null;
  descriptionSnippet: string;
};

export type StorefrontSearchResult = {
  provider: "meili";
  query: string;
  hits: StorefrontSearchHit[];
  estimatedTotalHits: number;
  processingTimeMs: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type StorefrontSearchHealth = {
  provider: "meili";
  status: "ok";
  host: string;
  indexes: {
    products: {
      name: string;
      numberOfDocuments: number;
      isIndexing: boolean;
    };
    categories: {
      name: string;
      numberOfDocuments: number;
      isIndexing: boolean;
    };
    producers: {
      name: string;
      numberOfDocuments: number;
      isIndexing: boolean;
    };
  };
};

type MeiliSearchPayload = {
  hits?: unknown[];
  estimatedTotalHits?: number;
  processingTimeMs?: number;
};

type MeiliIndexStatsPayload = {
  numberOfDocuments?: number;
  isIndexing?: boolean;
};

type MeiliSearchConfig = {
  host: string;
  apiKey: string;
  indexes: {
    products: string;
    categories: string;
    producers: string;
  };
};

const DEFAULT_SEARCH_LIMIT = 12;
const MAX_SEARCH_LIMIT = 48;

const normalizeOptionalString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
};

const stripHtml = (value: string): string => {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
};

const toSnippet = (value: string, maxLength = 180): string => {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
};

const resolveMeiliSearchConfig = (): MeiliSearchConfig => {
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
        normalizeOptionalString(process.env.MEILISEARCH_PRODUCTS_INDEX) ?? "products",
      categories:
        normalizeOptionalString(process.env.MEILISEARCH_CATEGORIES_INDEX) ??
        "categories",
      producers:
        normalizeOptionalString(process.env.MEILISEARCH_PRODUCERS_INDEX) ?? "producers",
    },
  };
};

const resolveSearchLimit = (limit?: number): number => {
  if (typeof limit !== "number" || Number.isNaN(limit)) {
    return DEFAULT_SEARCH_LIMIT;
  }

  const normalizedLimit = Math.trunc(limit);
  if (normalizedLimit < 1) {
    return 1;
  }

  return Math.min(normalizedLimit, MAX_SEARCH_LIMIT);
};

const resolveSearchPage = (page?: number): number => {
  if (typeof page !== "number" || Number.isNaN(page)) {
    return 1;
  }

  const normalizedPage = Math.trunc(page);
  if (normalizedPage < 1) {
    return 1;
  }

  return normalizedPage;
};

const toSearchHit = (input: unknown): StorefrontSearchHit | null => {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }

  const record = input as Record<string, unknown>;
  const id = normalizeOptionalString(record.id);
  const title = normalizeOptionalString(record.title);
  const handle = normalizeOptionalString(record.handle);

  if (!(id && title && handle)) {
    return null;
  }

  const thumbnail = normalizeOptionalString(record.thumbnail);
  const description = normalizeOptionalString(record.description);

  return {
    id,
    title,
    handle,
    thumbnail,
    descriptionSnippet: description ? toSnippet(stripHtml(description)) : "",
  };
};

const fetchMeili = async <TPayload>(
  config: MeiliSearchConfig,
  path: string,
  init: RequestInit,
): Promise<TPayload> => {
  const response = await fetch(`${config.host}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.apiKey}`,
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const responseBody = await response.text().catch(() => "");
    throw new Error(
      `Meilisearch request failed (${response.status}) for ${path}${responseBody ? `: ${responseBody}` : ""}`,
    );
  }

  return (await response.json()) as TPayload;
};

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
    estimatedTotalHits > 0 ? Math.max(1, Math.ceil(estimatedTotalHits / resolvedLimit)) : 0;

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

const fetchIndexStats = async (
  config: MeiliSearchConfig,
  indexName: string,
): Promise<{ name: string; numberOfDocuments: number; isIndexing: boolean }> => {
  const payload = await fetchMeili<MeiliIndexStatsPayload>(
    config,
    `/indexes/${encodeURIComponent(indexName)}/stats`,
    {
      method: "GET",
    },
  );

  return {
    name: indexName,
    numberOfDocuments:
      typeof payload.numberOfDocuments === "number" ? payload.numberOfDocuments : 0,
    isIndexing: payload.isIndexing === true,
  };
};

export const getStorefrontSearchHealth = async (): Promise<StorefrontSearchHealth> => {
  const config = resolveMeiliSearchConfig();

  await fetchMeili<Record<string, unknown>>(config, "/health", {
    method: "GET",
  });

  const [products, categories, producers] = await Promise.all([
    fetchIndexStats(config, config.indexes.products),
    fetchIndexStats(config, config.indexes.categories),
    fetchIndexStats(config, config.indexes.producers),
  ]);

  return {
    provider: "meili",
    status: "ok",
    host: config.host,
    indexes: {
      products,
      categories,
      producers,
    },
  };
};

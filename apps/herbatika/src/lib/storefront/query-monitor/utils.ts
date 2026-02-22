import { STOREFRONT_QUERY_KEY_NAMESPACE } from "../query-keys";
import type { QueryLike, TrackedApiKind } from "./types";

export const isStorefrontNamespaceQuery = (query: QueryLike): boolean => {
  const firstKeySegment = query.queryKey?.[0];
  return firstKeySegment === STOREFRONT_QUERY_KEY_NAMESPACE;
};

export const getObserverCount = (query: QueryLike): number => {
  const unsafeQuery = query as unknown as { getObserversCount?: () => number };
  if (typeof unsafeQuery.getObserversCount === "function") {
    return unsafeQuery.getObserversCount();
  }
  return 0;
};

export const hasData = (query: QueryLike): boolean => {
  return query.state.data !== undefined;
};

export const isFresh = (query: QueryLike): boolean => {
  try {
    return hasData(query) && !query.state.isInvalidated && !query.isStale();
  } catch {
    return hasData(query) && !query.state.isInvalidated;
  }
};

export const nowIso = (): string => new Date().toISOString();

export const getRequestUrl = (input: RequestInfo | URL): string => {
  if (typeof input === "string") {
    return input;
  }

  if (input instanceof URL) {
    return input.toString();
  }

  return input.url;
};

export const getTrackedApiKind = (url: string): TrackedApiKind | null => {
  const isSearchPath = (path: string): boolean =>
    path === "/api/storefront-search" ||
    path.startsWith("/api/storefront-search/");

  try {
    const resolved = new URL(url, window.location.origin);
    if (resolved.pathname.startsWith("/store/")) {
      return "store";
    }
    if (isSearchPath(resolved.pathname)) {
      return "search";
    }
    return null;
  } catch {
    if (url.includes("/store/")) {
      return "store";
    }
    if (
      url.includes("/api/storefront-search?") ||
      url.endsWith("/api/storefront-search") ||
      url.includes("/api/storefront-search/")
    ) {
      return "search";
    }
    return null;
  }
};

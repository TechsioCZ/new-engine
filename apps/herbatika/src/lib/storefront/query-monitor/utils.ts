import { STOREFRONT_QUERY_KEY_NAMESPACE } from "../query-keys";
import type { QueryLike } from "./types";

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

export const isStoreRequest = (url: string): boolean => {
  try {
    const resolved = new URL(url, window.location.origin);
    return resolved.pathname.startsWith("/store/");
  } catch {
    return url.includes("/store/");
  }
};

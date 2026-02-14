import type {
  QueryClient,
  QueryKey,
  Query as TanstackQuery,
} from "@tanstack/react-query";
import { STOREFRONT_QUERY_KEY_NAMESPACE } from "./query-keys";

type QueryActionType = "fetch" | "success" | "error";
type PrefetchKind = "prefetch" | "observer";

type QueryLike = TanstackQuery<unknown, unknown, unknown, QueryKey>;

export type StorefrontMonitorSnapshot = {
  namespace: string;
  updatedAt: number;
  query: {
    added: number;
    removed: number;
    observerAdded: number;
    cacheHit: number;
    cacheStale: number;
    cacheMiss: number;
    fetchStarted: number;
    fetchSuccess: number;
    fetchError: number;
  };
  prefetch: {
    fetchStarted: number;
    fetchSuccess: number;
    fetchError: number;
    reuseHit: number;
    reuseMiss: number;
  };
  network: {
    storeRequests: number;
    ok2xx: number;
    client4xx: number;
    server5xx: number;
    failed: number;
  };
};

type StorefrontMonitorListener = (snapshot: StorefrontMonitorSnapshot) => void;

type MonitorWindow = Window & {
  __HERBATIKA_STOREFRONT_MONITOR__?: {
    getSnapshot: () => StorefrontMonitorSnapshot;
    reset: () => void;
    printSummary: () => void;
    setVerbose: (verbose: boolean) => void;
  };
};

const defaultSnapshot = (): StorefrontMonitorSnapshot => ({
  namespace: STOREFRONT_QUERY_KEY_NAMESPACE,
  updatedAt: Date.now(),
  query: {
    added: 0,
    removed: 0,
    observerAdded: 0,
    cacheHit: 0,
    cacheStale: 0,
    cacheMiss: 0,
    fetchStarted: 0,
    fetchSuccess: 0,
    fetchError: 0,
  },
  prefetch: {
    fetchStarted: 0,
    fetchSuccess: 0,
    fetchError: 0,
    reuseHit: 0,
    reuseMiss: 0,
  },
  network: {
    storeRequests: 0,
    ok2xx: 0,
    client4xx: 0,
    server5xx: 0,
    failed: 0,
  },
});

const monitorState = {
  snapshot: defaultSnapshot(),
  listeners: new Set<StorefrontMonitorListener>(),
  installedClients: new WeakSet<QueryClient>(),
  inFlightKinds: new Map<string, PrefetchKind>(),
  prefetchedQueryHashes: new Set<string>(),
  originalFetch: null as typeof globalThis.fetch | null,
  fetchPatched: false,
  verbose: false,
};

const isStorefrontNamespaceQuery = (query: QueryLike): boolean => {
  const firstKeySegment = query.queryKey?.[0];
  return firstKeySegment === STOREFRONT_QUERY_KEY_NAMESPACE;
};

const getObserverCount = (query: QueryLike): number => {
  const unsafeQuery = query as unknown as { getObserversCount?: () => number };
  if (typeof unsafeQuery.getObserversCount === "function") {
    return unsafeQuery.getObserversCount();
  }
  return 0;
};

const hasData = (query: QueryLike): boolean => {
  return query.state.data !== undefined;
};

const isFresh = (query: QueryLike): boolean => {
  try {
    return hasData(query) && !query.state.isInvalidated && !query.isStale();
  } catch {
    return hasData(query) && !query.state.isInvalidated;
  }
};

const nowIso = (): string => new Date().toISOString();

const bump = (
  section: keyof StorefrontMonitorSnapshot,
  key: string,
  amount = 1,
) => {
  const targetSection = monitorState.snapshot[
    section
  ] as unknown as Record<string, number>;
  targetSection[key] = (targetSection[key] ?? 0) + amount;
  monitorState.snapshot.updatedAt = Date.now();
};

const emitSnapshot = () => {
  const snapshot = getStorefrontMonitorSnapshot();
  for (const listener of monitorState.listeners) {
    listener(snapshot);
  }
};

const logVerbose = (message: string, payload?: Record<string, unknown>) => {
  if (!monitorState.verbose) {
    return;
  }
  if (payload) {
    console.info(`[storefront-monitor] ${message}`, payload);
    return;
  }
  console.info(`[storefront-monitor] ${message}`);
};

const getRequestUrl = (input: RequestInfo | URL): string => {
  if (typeof input === "string") {
    return input;
  }

  if (input instanceof URL) {
    return input.toString();
  }

  return input.url;
};

const isStoreRequest = (url: string): boolean => {
  try {
    const resolved = new URL(url, window.location.origin);
    return resolved.pathname.startsWith("/store/");
  } catch {
    return url.includes("/store/");
  }
};

const handleQueryAction = (
  query: QueryLike,
  actionType: QueryActionType,
) => {
  bump("query", actionType === "fetch" ? "fetchStarted" : actionType === "success" ? "fetchSuccess" : "fetchError");

  const queryHash = query.queryHash;
  const observerCount = getObserverCount(query);

  if (actionType === "fetch") {
    const fetchKind: PrefetchKind = observerCount === 0 ? "prefetch" : "observer";
    monitorState.inFlightKinds.set(queryHash, fetchKind);
    if (fetchKind === "prefetch") {
      bump("prefetch", "fetchStarted");
    }
    logVerbose("query fetch started", {
      at: nowIso(),
      queryKey: query.queryKey,
      observerCount,
      fetchKind,
    });
    return;
  }

  const fetchKind = monitorState.inFlightKinds.get(queryHash);
  monitorState.inFlightKinds.delete(queryHash);

  if (fetchKind === "prefetch") {
    if (actionType === "success") {
      bump("prefetch", "fetchSuccess");
      monitorState.prefetchedQueryHashes.add(queryHash);
    } else {
      bump("prefetch", "fetchError");
    }
  }

  logVerbose(`query ${actionType}`, {
    at: nowIso(),
    queryKey: query.queryKey,
    fetchKind: fetchKind ?? "unknown",
  });
};

const setupFetchPatch = () => {
  if (typeof window === "undefined") {
    return;
  }
  if (monitorState.fetchPatched) {
    return;
  }

  monitorState.originalFetch = window.fetch.bind(window);
  const patchedFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = getRequestUrl(input);
    const shouldTrack = isStoreRequest(url);
    if (shouldTrack) {
      bump("network", "storeRequests");
    }

    try {
      const response = await (monitorState.originalFetch as typeof window.fetch)(
        input,
        init,
      );
      if (shouldTrack) {
        if (response.status >= 500) {
          bump("network", "server5xx");
        } else if (response.status >= 400) {
          bump("network", "client4xx");
        } else {
          bump("network", "ok2xx");
        }
        emitSnapshot();
      }
      return response;
    } catch (error) {
      if (shouldTrack) {
        bump("network", "failed");
        emitSnapshot();
      }
      throw error;
    }
  }) as typeof window.fetch;

  Object.assign(patchedFetch, monitorState.originalFetch);
  window.fetch = patchedFetch;
  monitorState.fetchPatched = true;
};

const registerWindowMonitorApi = () => {
  if (typeof window === "undefined") {
    return;
  }

  const monitorWindow = window as MonitorWindow;
  monitorWindow.__HERBATIKA_STOREFRONT_MONITOR__ = {
    getSnapshot: getStorefrontMonitorSnapshot,
    reset: resetStorefrontMonitor,
    printSummary: printStorefrontMonitorSummary,
    setVerbose: (verbose: boolean) => {
      monitorState.verbose = Boolean(verbose);
    },
  };
};

export const installStorefrontMonitor = (queryClient: QueryClient): void => {
  if (process.env.NODE_ENV === "production" || typeof window === "undefined") {
    return;
  }

  registerWindowMonitorApi();
  setupFetchPatch();

  if (monitorState.installedClients.has(queryClient)) {
    return;
  }

  queryClient.getQueryCache().subscribe((event) => {
    const query = event.query as QueryLike | undefined;
    if (!query || !isStorefrontNamespaceQuery(query)) {
      return;
    }

    if (event.type === "added") {
      bump("query", "added");
      emitSnapshot();
      return;
    }

    if (event.type === "removed") {
      bump("query", "removed");
      monitorState.prefetchedQueryHashes.delete(query.queryHash);
      emitSnapshot();
      return;
    }

    if (event.type === "observerAdded") {
      bump("query", "observerAdded");
      if (!hasData(query)) {
        bump("query", "cacheMiss");
      } else if (isFresh(query)) {
        bump("query", "cacheHit");
      } else {
        bump("query", "cacheStale");
      }

      if (monitorState.prefetchedQueryHashes.has(query.queryHash)) {
        if (isFresh(query)) {
          bump("prefetch", "reuseHit");
        } else {
          bump("prefetch", "reuseMiss");
        }
      }

      emitSnapshot();
      return;
    }

    if (event.type === "updated") {
      const actionType = event.action?.type;
      if (
        actionType === "fetch" ||
        actionType === "success" ||
        actionType === "error"
      ) {
        handleQueryAction(query, actionType);
        emitSnapshot();
      }
    }
  });

  monitorState.installedClients.add(queryClient);

  if (monitorState.verbose) {
    console.info("[storefront-monitor] installed");
  }
};

export const subscribeStorefrontMonitor = (
  listener: StorefrontMonitorListener,
): (() => void) => {
  monitorState.listeners.add(listener);
  listener(getStorefrontMonitorSnapshot());

  return () => {
    monitorState.listeners.delete(listener);
  };
};

export const getStorefrontMonitorSnapshot = (): StorefrontMonitorSnapshot => {
  const snapshot = monitorState.snapshot;
  return {
    ...snapshot,
    query: { ...snapshot.query },
    prefetch: { ...snapshot.prefetch },
    network: { ...snapshot.network },
  };
};

export const resetStorefrontMonitor = (): void => {
  monitorState.snapshot = defaultSnapshot();
  monitorState.inFlightKinds.clear();
  monitorState.prefetchedQueryHashes.clear();
  emitSnapshot();
};

export const printStorefrontMonitorSummary = (): void => {
  const snapshot = getStorefrontMonitorSnapshot();
  console.table({
    cacheHit: snapshot.query.cacheHit,
    cacheStale: snapshot.query.cacheStale,
    cacheMiss: snapshot.query.cacheMiss,
    fetchStarted: snapshot.query.fetchStarted,
    fetchSuccess: snapshot.query.fetchSuccess,
    fetchError: snapshot.query.fetchError,
    prefetchFetchStarted: snapshot.prefetch.fetchStarted,
    prefetchFetchSuccess: snapshot.prefetch.fetchSuccess,
    prefetchFetchError: snapshot.prefetch.fetchError,
    prefetchReuseHit: snapshot.prefetch.reuseHit,
    prefetchReuseMiss: snapshot.prefetch.reuseMiss,
    storeRequests: snapshot.network.storeRequests,
    store2xx: snapshot.network.ok2xx,
    store4xx: snapshot.network.client4xx,
    store5xx: snapshot.network.server5xx,
    storeFailed: snapshot.network.failed,
  });
};

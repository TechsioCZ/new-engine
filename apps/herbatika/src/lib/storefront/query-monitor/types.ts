import type {
  Query as TanstackQuery,
  QueryClient,
  QueryKey,
} from "@tanstack/react-query";

export type QueryActionType = "fetch" | "success" | "error";
export type PrefetchKind = "prefetch" | "observer";

export type QueryLike = TanstackQuery<unknown, unknown, unknown, QueryKey>;

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

export type StorefrontMonitorListener = (
  snapshot: StorefrontMonitorSnapshot,
) => void;

export type MonitorWindow = Window & {
  __HERBATIKA_STOREFRONT_MONITOR__?: {
    getSnapshot: () => StorefrontMonitorSnapshot;
    reset: () => void;
    printSummary: () => void;
    setVerbose: (verbose: boolean) => void;
  };
};

export type StorefrontMonitorState = {
  snapshot: StorefrontMonitorSnapshot;
  listeners: Set<StorefrontMonitorListener>;
  installedClients: WeakSet<QueryClient>;
  inFlightKinds: Map<string, PrefetchKind>;
  prefetchedQueryHashes: Set<string>;
  originalFetch: typeof globalThis.fetch | null;
  fetchPatched: boolean;
  verbose: boolean;
};

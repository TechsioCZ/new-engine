import { STOREFRONT_QUERY_KEY_NAMESPACE } from "../query-keys";
import type { StorefrontMonitorSnapshot, StorefrontMonitorState } from "./types";

export const defaultSnapshot = (): StorefrontMonitorSnapshot => ({
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

export const monitorState: StorefrontMonitorState = {
  snapshot: defaultSnapshot(),
  listeners: new Set(),
  installedClients: new WeakSet(),
  inFlightKinds: new Map(),
  prefetchedQueryHashes: new Set(),
  originalFetch: null,
  fetchPatched: false,
  verbose: false,
};

export const setStorefrontMonitorVerbose = (verbose: boolean) => {
  monitorState.verbose = Boolean(verbose);
};

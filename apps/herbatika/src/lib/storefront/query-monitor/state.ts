import { STOREFRONT_QUERY_KEY_NAMESPACE } from "../query-keys";
import type { StorefrontMonitorSnapshot, StorefrontMonitorState } from "./types";

const createMonitorInstanceId = () =>
  `monitor-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const defaultSnapshot = (
  instanceId: string,
  bootedAt: number,
): StorefrontMonitorSnapshot => ({
  namespace: STOREFRONT_QUERY_KEY_NAMESPACE,
  instanceId,
  bootedAt,
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
    storeOk2xx: 0,
    storeClient4xx: 0,
    storeServer5xx: 0,
    storeAborted: 0,
    storeFailed: 0,
    searchRequests: 0,
    searchOk2xx: 0,
    searchClient4xx: 0,
    searchServer5xx: 0,
    searchAborted: 0,
    searchFailed: 0,
  },
});

const bootedAt = Date.now();
const instanceId = createMonitorInstanceId();

export const monitorState: StorefrontMonitorState = {
  instanceId,
  bootedAt,
  snapshot: defaultSnapshot(instanceId, bootedAt),
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

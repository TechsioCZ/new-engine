import { defaultSnapshot, monitorState } from "./state";
import type {
  StorefrontMonitorListener,
  StorefrontMonitorSnapshot,
} from "./types";

export const getStorefrontMonitorSnapshot = (): StorefrontMonitorSnapshot => {
  const snapshot = monitorState.snapshot;
  return {
    ...snapshot,
    query: { ...snapshot.query },
    prefetch: { ...snapshot.prefetch },
    network: { ...snapshot.network },
  };
};

export const bump = (
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

export const emitSnapshot = () => {
  const snapshot = getStorefrontMonitorSnapshot();
  for (const listener of monitorState.listeners) {
    listener(snapshot);
  }
};

export const logVerbose = (message: string, payload?: Record<string, unknown>) => {
  if (!monitorState.verbose) {
    return;
  }

  if (payload) {
    console.info(`[storefront-monitor] ${message}`, payload);
    return;
  }

  console.info(`[storefront-monitor] ${message}`);
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

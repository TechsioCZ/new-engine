import { defaultSnapshot, monitorState } from "./state";
import type {
  StorefrontMonitorDiff,
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

const diffMetricSection = <
  Section extends
    | StorefrontMonitorSnapshot["query"]
    | StorefrontMonitorSnapshot["prefetch"]
    | StorefrontMonitorSnapshot["network"],
>(
  before: Section,
  after: Section,
): Section => {
  const keys = new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ]);
  const delta: Record<string, number> = {};

  for (const key of keys) {
    const beforeValue = before[key as keyof Section] as number | undefined;
    const afterValue = after[key as keyof Section] as number | undefined;
    delta[key] = (afterValue ?? 0) - (beforeValue ?? 0);
  }

  return delta as Section;
};

export const diffStorefrontMonitorSnapshots = (
  before: StorefrontMonitorSnapshot,
  after: StorefrontMonitorSnapshot,
): StorefrontMonitorDiff => {
  if (before.instanceId !== after.instanceId) {
    return {
      mode: "reset",
      query: { ...after.query },
      prefetch: { ...after.prefetch },
      network: { ...after.network },
    };
  }

  return {
    mode: "delta",
    query: diffMetricSection(before.query, after.query),
    prefetch: diffMetricSection(before.prefetch, after.prefetch),
    network: diffMetricSection(before.network, after.network),
  };
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
  monitorState.snapshot = defaultSnapshot(
    monitorState.instanceId,
    monitorState.bootedAt,
  );
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
    store2xx: snapshot.network.storeOk2xx,
    store4xx: snapshot.network.storeClient4xx,
    store5xx: snapshot.network.storeServer5xx,
    storeAborted: snapshot.network.storeAborted,
    storeFailedNonAbort: snapshot.network.storeFailed,
    searchRequests: snapshot.network.searchRequests,
    search2xx: snapshot.network.searchOk2xx,
    search4xx: snapshot.network.searchClient4xx,
    search5xx: snapshot.network.searchServer5xx,
    searchAborted: snapshot.network.searchAborted,
    searchFailedNonAbort: snapshot.network.searchFailed,
  });
};

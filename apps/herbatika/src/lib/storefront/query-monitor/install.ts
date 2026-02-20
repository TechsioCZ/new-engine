import type { QueryClient } from "@tanstack/react-query";
import { registerWindowMonitorApi, setupFetchPatch } from "./network";
import { monitorState } from "./state";
import { bump, emitSnapshot, logVerbose } from "./snapshot";
import type { PrefetchKind, QueryActionType, QueryLike } from "./types";
import { getObserverCount, hasData, isFresh, isStorefrontNamespaceQuery, nowIso } from "./utils";

const handleQueryAction = (
  query: QueryLike,
  actionType: QueryActionType,
) => {
  bump(
    "query",
    actionType === "fetch"
      ? "fetchStarted"
      : actionType === "success"
        ? "fetchSuccess"
        : "fetchError",
  );

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

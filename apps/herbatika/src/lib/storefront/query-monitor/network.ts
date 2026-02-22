import { monitorState, setStorefrontMonitorVerbose } from "./state";
import {
  bump,
  diffStorefrontMonitorSnapshots,
  emitSnapshot,
  getStorefrontMonitorSnapshot,
  printStorefrontMonitorSummary,
  resetStorefrontMonitor,
} from "./snapshot";
import type { MonitorWindow } from "./types";
import type { TrackedApiKind } from "./types";
import { getRequestUrl, getTrackedApiKind } from "./utils";

type NetworkMetricKeys = {
  requests: string;
  ok2xx: string;
  client4xx: string;
  server5xx: string;
  aborted: string;
  failed: string;
};

const networkMetricKeysByKind: Record<TrackedApiKind, NetworkMetricKeys> = {
  store: {
    requests: "storeRequests",
    ok2xx: "storeOk2xx",
    client4xx: "storeClient4xx",
    server5xx: "storeServer5xx",
    aborted: "storeAborted",
    failed: "storeFailed",
  },
  search: {
    requests: "searchRequests",
    ok2xx: "searchOk2xx",
    client4xx: "searchClient4xx",
    server5xx: "searchServer5xx",
    aborted: "searchAborted",
    failed: "searchFailed",
  },
};

const isAbortLikeError = (error: unknown): boolean => {
  if (error instanceof DOMException) {
    return error.name === "AbortError";
  }

  if (typeof error !== "object" || error === null) {
    return false;
  }

  const maybeName = (error as { name?: unknown }).name;
  if (typeof maybeName === "string" && maybeName === "AbortError") {
    return true;
  }

  const maybeMessage = (error as { message?: unknown }).message;
  return (
    typeof maybeMessage === "string" &&
    /\babort(ed)?\b/i.test(maybeMessage)
  );
};

export const setupFetchPatch = () => {
  if (typeof window === "undefined") {
    return;
  }

  if (monitorState.fetchPatched) {
    return;
  }

  monitorState.originalFetch = window.fetch.bind(window);
  const patchedFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = getRequestUrl(input);
    const apiKind = getTrackedApiKind(url);
    if (apiKind) {
      bump("network", networkMetricKeysByKind[apiKind].requests);
    }

    try {
      const response = await (monitorState.originalFetch as typeof window.fetch)(
        input,
        init,
      );
      if (apiKind) {
        const metricKeys = networkMetricKeysByKind[apiKind];
        if (response.status >= 500) {
          bump("network", metricKeys.server5xx);
        } else if (response.status >= 400) {
          bump("network", metricKeys.client4xx);
        } else {
          bump("network", metricKeys.ok2xx);
        }
        emitSnapshot();
      }
      return response;
    } catch (error) {
      if (apiKind) {
        const metricKeys = networkMetricKeysByKind[apiKind];
        if (isAbortLikeError(error)) {
          bump("network", metricKeys.aborted);
        } else {
          bump("network", metricKeys.failed);
        }
        emitSnapshot();
      }
      throw error;
    }
  }) as typeof window.fetch;

  Object.assign(patchedFetch, monitorState.originalFetch);
  window.fetch = patchedFetch;
  monitorState.fetchPatched = true;
};

export const registerWindowMonitorApi = () => {
  if (typeof window === "undefined") {
    return;
  }

  const monitorWindow = window as MonitorWindow;
  monitorWindow.__HERBATIKA_STOREFRONT_MONITOR__ = {
    getSnapshot: getStorefrontMonitorSnapshot,
    diffSnapshots: diffStorefrontMonitorSnapshots,
    reset: resetStorefrontMonitor,
    printSummary: printStorefrontMonitorSummary,
    setVerbose: setStorefrontMonitorVerbose,
  };
};

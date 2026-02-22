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
import { getRequestUrl, isStoreRequest } from "./utils";

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
        if (isAbortLikeError(error)) {
          bump("network", "aborted");
        } else {
          bump("network", "failed");
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

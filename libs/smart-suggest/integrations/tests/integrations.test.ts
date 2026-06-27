import type {
  SmartSuggestProvider,
  SmartSuggestProviderResult,
  SmartSuggestRequest,
} from "@techsio/smart-suggest-core";
import { describe, expect, it, vi } from "vitest";

import {
  createMapyCzProvider,
  createSmartSuggestProviderRegistry,
  type SmartSuggestProviderFetch,
} from "../src/index";

const addressRequest: SmartSuggestRequest = {
  countryCode: "CZ",
  kind: "address",
  limit: 3,
  query: "Vaclavske namesti",
};

const createSuggestionProvider = (id: string, displayLabel: string): SmartSuggestProvider => ({
  cachePolicy: { kind: "none" },
  id,
  name: id,
  supportedKinds: ["address"],
  suggest: () =>
    Promise.resolve({
      cachePolicy: { kind: "none" },
      suggestions: [
        {
          confidence: 0.8,
          displayLabel,
          id: `${id}-suggestion`,
          kind: "address",
          source: {
            id,
            kind: "live-provider",
            name: id,
          },
        },
      ],
    }),
});

const jsonResponse = (body: unknown, init?: ResponseInit) => {
  const responseInit: ResponseInit = {
    headers: { "content-type": "application/json" },
    status: init?.status ?? 200,
  };

  if (init?.statusText !== undefined) {
    responseInit.statusText = init.statusText;
  }

  return new Response(JSON.stringify(body), responseInit);
};

describe("createSmartSuggestProviderRegistry", () => {
  it("uses configured provider priority before declaration order", async () => {
    const registry = createSmartSuggestProviderRegistry({
      priority: ["preferred", "fallback"],
      providers: [
        createSuggestionProvider("fallback", "Fallback result"),
        createSuggestionProvider("preferred", "Preferred result"),
      ],
    });

    await expect(
      registry.suggest(addressRequest, { requestId: "request-1" }),
    ).resolves.toMatchObject({
      provider: { id: "preferred" },
      response: {
        cacheStatus: "disabled",
        requestId: "request-1",
        suggestions: [{ displayLabel: "Preferred result" }],
      },
    });
  });

  it("falls back after provider timeout and records provider events", async () => {
    vi.useFakeTimers();

    try {
      const timedOutProvider: SmartSuggestProvider = {
        cachePolicy: { kind: "none" },
        id: "slow",
        name: "Slow",
        supportedKinds: ["address"],
        suggest: () =>
          new Promise<SmartSuggestProviderResult>(() => {
            // Intentionally unresolved to exercise provider timeout fallback.
          }),
      };
      const fallbackProvider = createSuggestionProvider("fallback", "Fallback result");
      const providerEvents = vi.fn();
      const registry = createSmartSuggestProviderRegistry({
        onProviderEvent: providerEvents,
        providers: [timedOutProvider, fallbackProvider],
        timeoutMs: 10,
      });
      const result = registry.suggest(addressRequest, {
        requestId: "request-2",
      });

      await vi.advanceTimersByTimeAsync(11);
      await expect(result).resolves.toMatchObject({
        provider: { id: "fallback" },
        response: {
          providerEvents: [
            {
              errorCode: "provider-timeout",
              providerId: "slow",
              status: "timeout",
            },
            { providerId: "fallback", status: "success" },
          ],
          suggestions: [{ displayLabel: "Fallback result" }],
        },
      });
      expect(providerEvents).toHaveBeenCalledWith(
        expect.objectContaining({ providerId: "slow", status: "timeout" }),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("propagates caller aborts when providers ignore the signal", async () => {
    vi.useFakeTimers();

    try {
      const ignoredAbortProvider: SmartSuggestProvider = {
        cachePolicy: { kind: "none" },
        id: "ignores-abort",
        name: "Ignores abort",
        supportedKinds: ["address"],
        suggest: () =>
          new Promise<SmartSuggestProviderResult>(() => {
            // Intentionally unresolved to prove caller abort wins the race.
          }),
      };
      const abortController = new AbortController();
      const abortReason = new Error("caller aborted");
      const registry = createSmartSuggestProviderRegistry({
        providers: [ignoredAbortProvider],
        timeoutMs: 10_000,
      });
      const result = registry.suggest(addressRequest, {
        requestId: "request-abort",
        signal: abortController.signal,
      });

      abortController.abort(abortReason);

      await expect(result).rejects.toBe(abortReason);
    } finally {
      vi.useRealTimers();
    }
  });

  it("opens the circuit after repeated provider failures", async () => {
    let now = 1000;
    const failingProvider: SmartSuggestProvider = {
      cachePolicy: { kind: "none" },
      id: "failing",
      name: "Failing",
      supportedKinds: ["address"],
      suggest: vi.fn(() => Promise.reject(new Error("Provider unavailable"))),
    };
    const registry = createSmartSuggestProviderRegistry({
      circuitBreaker: { failureThreshold: 1, openMs: 500 },
      now: () => now,
      providers: [failingProvider],
    });

    await expect(
      registry.suggest(addressRequest, { requestId: "request-3" }),
    ).resolves.toMatchObject({
      response: {
        providerEvents: [
          {
            errorCode: "provider-unavailable",
            providerId: "failing",
            status: "error",
          },
        ],
      },
    });
    await expect(
      registry.suggest(addressRequest, { requestId: "request-4" }),
    ).resolves.toMatchObject({
      response: {
        providerEvents: [
          {
            errorCode: "provider-unavailable",
            providerId: "failing",
            status: "skipped",
          },
        ],
      },
    });
    expect(failingProvider.suggest).toHaveBeenCalledTimes(1);

    now += 501;

    await registry.suggest(addressRequest, { requestId: "request-5" });
    expect(failingProvider.suggest).toHaveBeenCalledTimes(2);
  });
});

describe("createMapyCzProvider", () => {
  it("normalizes Mapy suggest responses and keeps cache disabled", async () => {
    const fetchMock = vi.fn<SmartSuggestProviderFetch>(() =>
      Promise.resolve(
        jsonResponse({
          items: [
            {
              id: "mapy-address-1",
              label: "Václavské náměstí 832/19",
              name: "Václavské náměstí 832/19",
              position: { lat: 50.081, lon: 14.428 },
              regionalStructure: [
                { isoCode: "CZ", name: "Česko", type: "country" },
                { name: "Praha", type: "municipality" },
              ],
              type: "regional.address",
              zip: "110 00",
            },
          ],
        }),
      ),
    );
    const provider = createMapyCzProvider({
      apiKey: "test-key",
      endpointUrl: "https://mapy.test/suggest",
      fetch: fetchMock,
    });

    await expect(
      provider.suggest(addressRequest, {
        cachePolicy: provider.cachePolicy,
        requestId: "request-6",
      }),
    ).resolves.toMatchObject({
      cachePolicy: { kind: "none" },
      suggestions: [
        {
          address: {
            city: "Praha",
            countryCode: "CZ",
            line1: "Václavské náměstí 832/19",
            postalCode: "110 00",
          },
          displayLabel: "Václavské náměstí 832/19, 110 00, Praha, CZ",
          source: { id: "mapy-cz", kind: "live-provider" },
        },
      ],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://mapy.test/suggest?apikey=test-key&query=Vaclavske+namesti&lang=cs&limit=3&type=regional.address&locality=cz",
      expect.objectContaining({ method: "GET" }),
    );
  });
});

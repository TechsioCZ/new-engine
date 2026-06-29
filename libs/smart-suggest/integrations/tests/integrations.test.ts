import {
  ProviderAborted,
  ProviderNetwork,
  type SmartSuggestProvider,
  type SmartSuggestRequest,
} from "@techsio/smart-suggest-core";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Exit from "effect/Exit";
import { describe, expect, it, vi } from "@effect/vitest";

import {
  createHereDiscoverProvider,
  createMapyCzProvider,
  createNominatimProvider,
  createRadarAutocompleteProvider,
  createRuianGeocodeProvider,
  createSmartSuggestProviderRegistry,
  type SmartSuggestProviderFetch,
} from "../src/integrations";

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
    Effect.succeed({
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
  it.effect(
    "aggregates configured providers in priority order before applying the request limit",
    () =>
      Effect.gen(function* () {
        const registry = createSmartSuggestProviderRegistry({
          priority: ["preferred", "fallback"],
          providers: [
            createSuggestionProvider("fallback", "Fallback result"),
            createSuggestionProvider("preferred", "Preferred result"),
          ],
        });

        const result = yield* registry.suggest(addressRequest, { requestId: "request-1" });

        expect(result).toMatchObject({
          provider: { id: "preferred" },
          response: {
            cacheStatus: "disabled",
            requestId: "request-1",
            suggestions: [
              { displayLabel: "Preferred result" },
              { displayLabel: "Fallback result" },
            ],
          },
        });
      }),
  );

  it.live("falls back after provider timeout and records provider events", () =>
    Effect.gen(function* () {
      vi.useFakeTimers();

      try {
        const timedOutProvider: SmartSuggestProvider = {
          cachePolicy: { kind: "none" },
          id: "slow",
          name: "Slow",
          supportedKinds: ["address"],
          suggest: () => Effect.never,
        };
        const fallbackProvider = createSuggestionProvider("fallback", "Fallback result");
        const providerEvents = vi.fn();
        const registry = createSmartSuggestProviderRegistry({
          onProviderEvent: providerEvents,
          providers: [timedOutProvider, fallbackProvider],
          timeoutMs: 10,
        });
        const fiber = yield* registry
          .suggest(addressRequest, {
            requestId: "request-2",
          })
          .pipe(Effect.forkChild({ startImmediately: true }));

        yield* Effect.promise(() => vi.advanceTimersByTimeAsync(11));

        const result = yield* Fiber.join(fiber);

        expect(result).toMatchObject({
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
    }),
  );

  it.live("propagates caller aborts when providers ignore the signal", () =>
    Effect.gen(function* () {
      vi.useFakeTimers();

      try {
        const ignoredAbortProvider: SmartSuggestProvider = {
          cachePolicy: { kind: "none" },
          id: "ignores-abort",
          name: "Ignores abort",
          supportedKinds: ["address"],
          suggest: () => Effect.never,
        };
        const abortController = new AbortController();
        const abortReason = new Error("caller aborted");
        const registry = createSmartSuggestProviderRegistry({
          providers: [ignoredAbortProvider],
          timeoutMs: 10_000,
        });
        const fiber = yield* registry
          .suggest(addressRequest, {
            requestId: "request-abort",
            signal: abortController.signal,
          })
          .pipe(Effect.forkChild({ startImmediately: true }));

        abortController.abort(abortReason);

        const exit = yield* Effect.exit(Fiber.join(fiber));

        expect(Exit.isFailure(exit)).toBe(true);

        if (!Exit.isFailure(exit)) {
          return;
        }

        const failure = Cause.squash(exit.cause);

        expect(failure).toBeInstanceOf(ProviderAborted);

        if (!(failure instanceof ProviderAborted)) {
          return;
        }

        expect(failure).toMatchObject({
          _tag: "ProviderAborted",
          providerId: "ignores-abort",
        });
        expect(failure.cause).toEqual({
          message: abortReason.message,
          name: abortReason.name,
        });
      } finally {
        vi.useRealTimers();
      }
    }),
  );

  it.effect("opens the circuit after repeated provider failures", () =>
    Effect.gen(function* () {
      let now = 1000;
      const failingProvider: SmartSuggestProvider = {
        cachePolicy: { kind: "none" },
        id: "failing",
        name: "Failing",
        supportedKinds: ["address"],
        suggest: vi.fn(() =>
          Effect.fail(
            new ProviderNetwork({
              cause: { message: "Provider unavailable", name: "Error" },
              message: "Provider unavailable",
              providerId: "failing",
            }),
          ),
        ),
      };
      const registry = createSmartSuggestProviderRegistry({
        circuitBreaker: { failureThreshold: 1, openMs: 500 },
        now: () => now,
        providers: [failingProvider],
      });

      const firstResult = yield* registry.suggest(addressRequest, { requestId: "request-3" });
      const secondResult = yield* registry.suggest(addressRequest, { requestId: "request-4" });

      expect(firstResult).toMatchObject({
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
      expect(secondResult).toMatchObject({
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

      yield* registry.suggest(addressRequest, { requestId: "request-5" });
      expect(failingProvider.suggest).toHaveBeenCalledTimes(2);
    }),
  );
});

describe("createMapyCzProvider", () => {
  it.effect("normalizes Mapy suggest responses and keeps cache disabled", () =>
    Effect.gen(function* () {
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

      const result = yield* provider.suggest(addressRequest, {
        cachePolicy: provider.cachePolicy,
        requestId: "request-6",
      });

      expect(result).toMatchObject({
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
    }),
  );
});

describe("createRuianGeocodeProvider", () => {
  it.effect("normalizes RÚIAN address-point suggestions and drops generic street rows", () =>
    Effect.gen(function* () {
      const fetchMock = vi.fn<SmartSuggestProviderFetch>(() =>
        Promise.resolve(
          jsonResponse({
            suggestions: [
              {
                isCollection: false,
                magicKey: "4_34593",
                text: "K louži, Praha",
                type: "Ulice",
              },
              {
                isCollection: false,
                magicKey: "1_1203603",
                text: "K louži 1258/12, Vršovice, 10100 Praha 10",
                type: "AdresniMisto",
              },
            ],
          }),
        ),
      );
      const provider = createRuianGeocodeProvider({
        baseUrl: "https://ruian.test/geocode",
        fetch: fetchMock,
      });

      const result = yield* provider.suggest(
        { countryCode: "CZ", kind: "address", limit: 20, query: "K Louži" },
        {
          cachePolicy: provider.cachePolicy,
          requestId: "request-ruian",
        },
      );

      expect(result).toMatchObject({
        suggestions: [
          {
            address: {
              city: "Praha 10",
              countryCode: "CZ",
              district: "Vršovice",
              houseNumber: "1258",
              orientationNumber: "12",
              postalCode: "101 00",
              street: "K louži",
            },
            confidence: 0.98,
            displayLabel: "K louži 1258/12, Vršovice, 10100 Praha 10",
            id: "ruian-geocode:1_1203603",
            source: { id: "ruian-geocode", kind: "live-provider" },
          },
        ],
      });
      expect(fetchMock).toHaveBeenCalledWith(
        "https://ruian.test/geocode/suggest?text=K+Lou%C5%BEi&f=json&maxSuggestions=20",
        expect.objectContaining({ method: "GET" }),
      );
    }),
  );

  it.effect("does not emit RÚIAN administrative rows for address suggestions", () =>
    Effect.gen(function* () {
      const fetchMock = vi.fn<SmartSuggestProviderFetch>(() =>
        Promise.resolve(
          jsonResponse({
            suggestions: [
              {
                isCollection: false,
                magicKey: "4_123",
                text: "Liberecký kraj",
                type: "VyssiUzemneSamospravnyCelek",
              },
              {
                isCollection: false,
                magicKey: "4_456",
                text: "Králova Lhota (Písek)",
                type: "Obec",
              },
              {
                isCollection: false,
                magicKey: "4_789",
                text: "K louži, Praha",
                type: "Ulice",
              },
            ],
          }),
        ),
      );
      const provider = createRuianGeocodeProvider({
        baseUrl: "https://ruian.test/geocode",
        fetch: fetchMock,
      });

      const result = yield* provider.suggest(
        { countryCode: "CZ", kind: "address", limit: 20, query: "K L" },
        {
          cachePolicy: provider.cachePolicy,
          requestId: "request-ruian-admin",
        },
      );

      expect(result).toMatchObject({ suggestions: [] });
    }),
  );

  it.effect("expands trailing RÚIAN house-number prefixes to recover matching address points", () =>
    Effect.gen(function* () {
      const fetchMock = vi.fn<SmartSuggestProviderFetch>((input) => {
        const url = new URL(String(input));
        const query = url.searchParams.get("text");

        if (query === "K Louži 125") {
          return Promise.resolve(
            jsonResponse({
              suggestions: [
                {
                  isCollection: false,
                  magicKey: "1_999999",
                  text: "K Louži 125, 25228 Vonoklasy",
                  type: "AdresniMisto",
                },
              ],
            }),
          );
        }

        return Promise.resolve(
          jsonResponse({
            suggestions: [
              {
                isCollection: false,
                magicKey: "1_1203603",
                text: "K louži 1258/12, Vršovice, 10100 Praha 10",
                type: "AdresniMisto",
              },
              {
                isCollection: false,
                magicKey: "1_784",
                text: "K louži 784/3, Vršovice, 10100 Praha 10",
                type: "AdresniMisto",
              },
              {
                isCollection: false,
                magicKey: "4_34593",
                text: "K louži, Praha",
                type: "Ulice",
              },
            ],
          }),
        );
      });
      const provider = createRuianGeocodeProvider({
        baseUrl: "https://ruian.test/geocode",
        fetch: fetchMock,
      });

      const result = yield* provider.suggest(
        { countryCode: "CZ", kind: "address", limit: 20, query: "K Louži 125" },
        {
          cachePolicy: provider.cachePolicy,
          requestId: "request-ruian-prefix",
        },
      );

      expect(result.suggestions.map((suggestion) => suggestion.displayLabel)).toEqual([
        "K Louži 125, 25228 Vonoklasy",
        "K louži 1258/12, Vršovice, 10100 Praha 10",
      ]);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(
        fetchMock.mock.calls.map(([input]) => new URL(String(input)).searchParams.get("text")),
      ).toEqual(["K Louži 125", "K Louži"]);
    }),
  );

  it.effect("matches RÚIAN expanded rows by orientation-number prefix too", () =>
    Effect.gen(function* () {
      const fetchMock = vi.fn<SmartSuggestProviderFetch>((input) => {
        const url = new URL(String(input));

        if (url.searchParams.get("text") === "K Louži 12") {
          return Promise.resolve(jsonResponse({ suggestions: [] }));
        }

        return Promise.resolve(
          jsonResponse({
            suggestions: [
              {
                isCollection: false,
                magicKey: "1_1203603",
                text: "K louži 1258/12, Vršovice, 10100 Praha 10",
                type: "AdresniMisto",
              },
              {
                isCollection: false,
                magicKey: "1_784",
                text: "K louži 784/3, Vršovice, 10100 Praha 10",
                type: "AdresniMisto",
              },
            ],
          }),
        );
      });
      const provider = createRuianGeocodeProvider({
        baseUrl: "https://ruian.test/geocode",
        fetch: fetchMock,
      });

      const result = yield* provider.suggest(
        { countryCode: "CZ", kind: "address", limit: 20, query: "K Louži 12" },
        {
          cachePolicy: provider.cachePolicy,
          requestId: "request-ruian-orientation-prefix",
        },
      );

      expect(result.suggestions.map((suggestion) => suggestion.displayLabel)).toEqual([
        "K louži 1258/12, Vršovice, 10100 Praha 10",
      ]);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    }),
  );

  it.effect("ranks exact-street RÚIAN expansion matches ahead of broader street-name matches", () =>
    Effect.gen(function* () {
      const fetchMock = vi.fn<SmartSuggestProviderFetch>((input) => {
        const url = new URL(String(input));

        if (url.searchParams.get("text") === "K Louži 1") {
          return Promise.resolve(
            jsonResponse({
              suggestions: [
                {
                  isCollection: false,
                  magicKey: "1_1312",
                  text: "K louži 1312/1, Vršovice, 10100 Praha 10",
                  type: "AdresniMisto",
                },
                {
                  isCollection: false,
                  magicKey: "1_kaci",
                  text: "Ke Kačí louži 18/1, Černice, 32600 Plzeň",
                  type: "AdresniMisto",
                },
              ],
            }),
          );
        }

        return Promise.resolve(
          jsonResponse({
            suggestions: [
              {
                isCollection: false,
                magicKey: "1_1203603",
                text: "K louži 1258/12, Vršovice, 10100 Praha 10",
                type: "AdresniMisto",
              },
            ],
          }),
        );
      });
      const provider = createRuianGeocodeProvider({
        baseUrl: "https://ruian.test/geocode",
        fetch: fetchMock,
      });

      const result = yield* provider.suggest(
        { countryCode: "CZ", kind: "address", limit: 20, query: "K Louži 1" },
        {
          cachePolicy: provider.cachePolicy,
          requestId: "request-ruian-street-rank",
        },
      );

      expect(result.suggestions.map((suggestion) => suggestion.displayLabel)).toEqual([
        "K louži 1312/1, Vršovice, 10100 Praha 10",
        "K louži 1258/12, Vršovice, 10100 Praha 10",
        "Ke Kačí louži 18/1, Černice, 32600 Plzeň",
      ]);
    }),
  );

  it.effect("skips non-CZ address requests without calling RÚIAN", () =>
    Effect.gen(function* () {
      const fetchMock = vi.fn<SmartSuggestProviderFetch>();
      const provider = createRuianGeocodeProvider({ fetch: fetchMock });

      const result = yield* provider.suggest(
        { countryCode: "SK", kind: "address", limit: 20, query: "Hlavná" },
        {
          cachePolicy: provider.cachePolicy,
          requestId: "request-ruian-skip",
        },
      );

      expect(result).toMatchObject({ suggestions: [] });
      expect(fetchMock).not.toHaveBeenCalled();
    }),
  );
});

describe("createRadarAutocompleteProvider", () => {
  it.effect("normalizes Radar autocomplete responses", () =>
    Effect.gen(function* () {
      const fetchMock = vi.fn<SmartSuggestProviderFetch>(() =>
        Promise.resolve(
          jsonResponse({
            addresses: [
              {
                city: "Praha",
                countryCode: "CZ",
                formattedAddress: "K Louži 1, Praha",
                latitude: 50.03,
                longitude: 14.5,
                number: "1",
                postalCode: "101 00",
                state: "Praha",
                street: "K Louži",
              },
            ],
          }),
        ),
      );
      const provider = createRadarAutocompleteProvider({
        apiKey: "radar-key",
        baseUrl: "https://radar.test",
        fetch: fetchMock,
        layers: "address",
        near: "50.087,14.421",
      });

      const result = yield* provider.suggest(addressRequest, {
        cachePolicy: provider.cachePolicy,
        requestId: "request-radar",
      });

      expect(result).toMatchObject({
        suggestions: [
          {
            address: {
              city: "Praha",
              countryCode: "CZ",
              line1: "K Louži 1",
              postalCode: "101 00",
            },
            displayLabel: "K Louži 1, Praha",
            source: { id: "radar-autocomplete", kind: "live-provider" },
          },
        ],
      });
      expect(fetchMock).toHaveBeenCalledWith(
        "https://radar.test/v1/search/autocomplete?query=Vaclavske+namesti&limit=3&layers=address&near=50.087%2C14.421&countryCode=CZ",
        expect.objectContaining({
          headers: { accept: "application/json", authorization: "radar-key" },
          method: "GET",
        }),
      );
    }),
  );
});

describe("createHereDiscoverProvider", () => {
  it.effect("normalizes HERE discover responses and maps CZ country filters to HERE alpha-3", () =>
    Effect.gen(function* () {
      const fetchMock = vi.fn<SmartSuggestProviderFetch>(() =>
        Promise.resolve(
          jsonResponse({
            items: [
              {
                address: {
                  city: "Praha",
                  countryCode: "CZE",
                  houseNumber: "1",
                  label: "K Louži 1, Praha, Česko",
                  postalCode: "101 00",
                  street: "K Louži",
                },
                id: "here-1",
                position: { lat: 50.03, lng: 14.5 },
                resultType: "houseNumber",
                scoring: { queryScore: 0.91 },
                title: "K Louži 1",
              },
            ],
          }),
        ),
      );
      const provider = createHereDiscoverProvider({
        apiKey: "here-key",
        baseUrl: "https://here.test",
        fetch: fetchMock,
      });

      const result = yield* provider.suggest(addressRequest, {
        cachePolicy: provider.cachePolicy,
        requestId: "request-here",
      });

      expect(result).toMatchObject({
        suggestions: [
          {
            address: {
              city: "Praha",
              countryCode: "CZ",
              line1: "K Louži 1",
              postalCode: "101 00",
            },
            confidence: 0.91,
            id: "here-discover:here-1",
            source: { id: "here-discover", kind: "live-provider" },
          },
        ],
      });
      expect(fetchMock).toHaveBeenCalledWith(
        "https://here.test/v1/discover?q=Vaclavske+namesti&apiKey=here-key&limit=3&in=countryCode%3ACZE",
        expect.objectContaining({ method: "GET" }),
      );
    }),
  );
});

describe("createNominatimProvider", () => {
  it.effect("normalizes Nominatim responses with required request headers", () =>
    Effect.gen(function* () {
      const fetchMock = vi.fn<SmartSuggestProviderFetch>(() =>
        Promise.resolve(
          jsonResponse([
            {
              address: {
                city: "Praha",
                country_code: "cz",
                house_number: "1",
                postcode: "101 00",
                road: "K Louži",
                state: "Praha",
              },
              class: "place",
              display_name: "K Louži 1, Praha, Česko",
              importance: 0.7,
              lat: "50.03",
              lon: "14.5",
              osm_id: 123,
              osm_type: "way",
              place_id: 456,
              type: "house",
            },
          ]),
        ),
      );
      const provider = createNominatimProvider({
        baseUrl: "https://nominatim.test",
        email: "ops@example.test",
        fetch: fetchMock,
        referer: "https://shop.example.test",
        userAgent: "smart-suggest-test",
      });

      const result = yield* provider.suggest(addressRequest, {
        cachePolicy: provider.cachePolicy,
        requestId: "request-nominatim",
      });

      expect(result).toMatchObject({
        suggestions: [
          {
            address: {
              city: "Praha",
              countryCode: "CZ",
              line1: "K Louži 1",
              postalCode: "101 00",
            },
            confidence: 0.7,
            id: "nominatim:456",
            source: { id: "nominatim", kind: "live-provider" },
          },
        ],
      });
      expect(fetchMock).toHaveBeenCalledWith(
        "https://nominatim.test/search?q=Vaclavske+namesti&format=jsonv2&addressdetails=1&limit=3&countrycodes=cz&email=ops%40example.test",
        expect.objectContaining({
          headers: {
            accept: "application/json",
            referer: "https://shop.example.test",
            "user-agent": "smart-suggest-test",
          },
          method: "GET",
        }),
      );
    }),
  );

  it.effect(
    "drops Nominatim rows that are not complete address points for address suggestions",
    () =>
      Effect.gen(function* () {
        const fetchMock = vi.fn<SmartSuggestProviderFetch>(() =>
          Promise.resolve(
            jsonResponse([
              {
                address: {
                  country_code: "cz",
                  postcode: "101 00",
                  road: "K Louži",
                },
                class: "highway",
                display_name: "K Louži, Praha, Česko",
                importance: 0.6,
                place_id: 1,
                type: "residential",
              },
              {
                address: {
                  city: "Praha",
                  country_code: "cz",
                  house_number: "1258/12",
                  postcode: "101 00",
                  road: "K Louži",
                },
                class: "place",
                display_name: "1258/12, K Louži, Praha, Česko",
                importance: 0.8,
                place_id: 2,
                type: "house",
              },
            ]),
          ),
        );
        const provider = createNominatimProvider({
          baseUrl: "https://nominatim.test",
          fetch: fetchMock,
          userAgent: "smart-suggest-test",
        });

        const result = yield* provider.suggest(
          { countryCode: "CZ", kind: "address", limit: 20, query: "K Louži" },
          {
            cachePolicy: provider.cachePolicy,
            requestId: "request-nominatim-filter",
          },
        );

        expect(result).toMatchObject({
          suggestions: [
            {
              address: {
                houseNumber: "1258",
                orientationNumber: "12",
                street: "K Louži",
              },
              displayLabel: "1258/12, K Louži, Praha, Česko",
              source: { id: "nominatim" },
            },
          ],
        });
      }),
  );
});

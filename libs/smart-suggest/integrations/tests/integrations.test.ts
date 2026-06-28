import type {
  SmartSuggestProvider,
  SmartSuggestProviderResult,
  SmartSuggestRequest,
} from '@techsio/smart-suggest-core';
import { describe, expect, it, vi } from 'vitest';

import {
  createHereDiscoverProvider,
  createMapyCzProvider,
  createNominatimProvider,
  createRadarAutocompleteProvider,
  createRuianGeocodeProvider,
  createSmartSuggestProviderRegistry,
  type SmartSuggestProviderFetch,
} from '../src/index';

const addressRequest: SmartSuggestRequest = {
  countryCode: 'CZ',
  kind: 'address',
  limit: 3,
  query: 'Vaclavske namesti',
};

const createSuggestionProvider = (id: string, displayLabel: string): SmartSuggestProvider => ({
  cachePolicy: { kind: 'none' },
  id,
  name: id,
  supportedKinds: ['address'],
  suggest: () =>
    Promise.resolve({
      cachePolicy: { kind: 'none' },
      suggestions: [
        {
          confidence: 0.8,
          displayLabel,
          id: `${id}-suggestion`,
          kind: 'address',
          source: {
            id,
            kind: 'live-provider',
            name: id,
          },
        },
      ],
    }),
});

const jsonResponse = (body: unknown, init?: ResponseInit) => {
  const responseInit: ResponseInit = {
    headers: { 'content-type': 'application/json' },
    status: init?.status ?? 200,
  };

  if (init?.statusText !== undefined) {
    responseInit.statusText = init.statusText;
  }

  return new Response(JSON.stringify(body), responseInit);
};

describe('createSmartSuggestProviderRegistry', () => {
  it('aggregates configured providers in priority order before applying the request limit', async () => {
    const registry = createSmartSuggestProviderRegistry({
      priority: ['preferred', 'fallback'],
      providers: [
        createSuggestionProvider('fallback', 'Fallback result'),
        createSuggestionProvider('preferred', 'Preferred result'),
      ],
    });

    await expect(
      registry.suggest(addressRequest, { requestId: 'request-1' }),
    ).resolves.toMatchObject({
      provider: { id: 'preferred' },
      response: {
        cacheStatus: 'disabled',
        requestId: 'request-1',
        suggestions: [{ displayLabel: 'Preferred result' }, { displayLabel: 'Fallback result' }],
      },
    });
  });

  it('falls back after provider timeout and records provider events', async () => {
    vi.useFakeTimers();

    try {
      const timedOutProvider: SmartSuggestProvider = {
        cachePolicy: { kind: 'none' },
        id: 'slow',
        name: 'Slow',
        supportedKinds: ['address'],
        suggest: () =>
          new Promise<SmartSuggestProviderResult>(() => {
            // Intentionally unresolved to exercise provider timeout fallback.
          }),
      };
      const fallbackProvider = createSuggestionProvider('fallback', 'Fallback result');
      const providerEvents = vi.fn();
      const registry = createSmartSuggestProviderRegistry({
        onProviderEvent: providerEvents,
        providers: [timedOutProvider, fallbackProvider],
        timeoutMs: 10,
      });
      const result = registry.suggest(addressRequest, {
        requestId: 'request-2',
      });

      await vi.advanceTimersByTimeAsync(11);
      await expect(result).resolves.toMatchObject({
        provider: { id: 'fallback' },
        response: {
          providerEvents: [
            {
              errorCode: 'provider-timeout',
              providerId: 'slow',
              status: 'timeout',
            },
            { providerId: 'fallback', status: 'success' },
          ],
          suggestions: [{ displayLabel: 'Fallback result' }],
        },
      });
      expect(providerEvents).toHaveBeenCalledWith(
        expect.objectContaining({ providerId: 'slow', status: 'timeout' }),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('propagates caller aborts when providers ignore the signal', async () => {
    vi.useFakeTimers();

    try {
      const ignoredAbortProvider: SmartSuggestProvider = {
        cachePolicy: { kind: 'none' },
        id: 'ignores-abort',
        name: 'Ignores abort',
        supportedKinds: ['address'],
        suggest: () =>
          new Promise<SmartSuggestProviderResult>(() => {
            // Intentionally unresolved to prove caller abort wins the race.
          }),
      };
      const abortController = new AbortController();
      const abortReason = new Error('caller aborted');
      const registry = createSmartSuggestProviderRegistry({
        providers: [ignoredAbortProvider],
        timeoutMs: 10_000,
      });
      const result = registry.suggest(addressRequest, {
        requestId: 'request-abort',
        signal: abortController.signal,
      });

      abortController.abort(abortReason);

      await expect(result).rejects.toBe(abortReason);
    } finally {
      vi.useRealTimers();
    }
  });

  it('opens the circuit after repeated provider failures', async () => {
    let now = 1000;
    const failingProvider: SmartSuggestProvider = {
      cachePolicy: { kind: 'none' },
      id: 'failing',
      name: 'Failing',
      supportedKinds: ['address'],
      suggest: vi.fn(() => Promise.reject(new Error('Provider unavailable'))),
    };
    const registry = createSmartSuggestProviderRegistry({
      circuitBreaker: { failureThreshold: 1, openMs: 500 },
      now: () => now,
      providers: [failingProvider],
    });

    await expect(
      registry.suggest(addressRequest, { requestId: 'request-3' }),
    ).resolves.toMatchObject({
      response: {
        providerEvents: [
          {
            errorCode: 'provider-unavailable',
            providerId: 'failing',
            status: 'error',
          },
        ],
      },
    });
    await expect(
      registry.suggest(addressRequest, { requestId: 'request-4' }),
    ).resolves.toMatchObject({
      response: {
        providerEvents: [
          {
            errorCode: 'provider-unavailable',
            providerId: 'failing',
            status: 'skipped',
          },
        ],
      },
    });
    expect(failingProvider.suggest).toHaveBeenCalledTimes(1);

    now += 501;

    await registry.suggest(addressRequest, { requestId: 'request-5' });
    expect(failingProvider.suggest).toHaveBeenCalledTimes(2);
  });
});

describe('createMapyCzProvider', () => {
  it('normalizes Mapy suggest responses and keeps cache disabled', async () => {
    const fetchMock = vi.fn<SmartSuggestProviderFetch>(() =>
      Promise.resolve(
        jsonResponse({
          items: [
            {
              id: 'mapy-address-1',
              label: 'Václavské náměstí 832/19',
              name: 'Václavské náměstí 832/19',
              position: { lat: 50.081, lon: 14.428 },
              regionalStructure: [
                { isoCode: 'CZ', name: 'Česko', type: 'country' },
                { name: 'Praha', type: 'municipality' },
              ],
              type: 'regional.address',
              zip: '110 00',
            },
          ],
        }),
      ),
    );
    const provider = createMapyCzProvider({
      apiKey: 'test-key',
      endpointUrl: 'https://mapy.test/suggest',
      fetch: fetchMock,
    });

    await expect(
      provider.suggest(addressRequest, {
        cachePolicy: provider.cachePolicy,
        requestId: 'request-6',
      }),
    ).resolves.toMatchObject({
      cachePolicy: { kind: 'none' },
      suggestions: [
        {
          address: {
            city: 'Praha',
            countryCode: 'CZ',
            line1: 'Václavské náměstí 832/19',
            postalCode: '110 00',
          },
          displayLabel: 'Václavské náměstí 832/19, 110 00, Praha, CZ',
          source: { id: 'mapy-cz', kind: 'live-provider' },
        },
      ],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://mapy.test/suggest?apikey=test-key&query=Vaclavske+namesti&lang=cs&limit=3&type=regional.address&locality=cz',
      expect.objectContaining({ method: 'GET' }),
    );
  });
});

describe('createRuianGeocodeProvider', () => {
  it('normalizes RÚIAN address-point suggestions and drops generic street rows', async () => {
    const fetchMock = vi.fn<SmartSuggestProviderFetch>(() =>
      Promise.resolve(
        jsonResponse({
          suggestions: [
            {
              isCollection: false,
              magicKey: '4_34593',
              text: 'K louži, Praha',
              type: 'Ulice',
            },
            {
              isCollection: false,
              magicKey: '1_1203603',
              text: 'K louži 1258/12, Vršovice, 10100 Praha 10',
              type: 'AdresniMisto',
            },
          ],
        }),
      ),
    );
    const provider = createRuianGeocodeProvider({
      baseUrl: 'https://ruian.test/geocode',
      fetch: fetchMock,
    });

    await expect(
      provider.suggest(
        { countryCode: 'CZ', kind: 'address', limit: 20, query: 'K Louži' },
        {
          cachePolicy: provider.cachePolicy,
          requestId: 'request-ruian',
        },
      ),
    ).resolves.toMatchObject({
      suggestions: [
        {
          address: {
            city: 'Praha 10',
            countryCode: 'CZ',
            district: 'Vršovice',
            houseNumber: '1258',
            orientationNumber: '12',
            postalCode: '101 00',
            street: 'K louži',
          },
          confidence: 0.98,
          displayLabel: 'K louži 1258/12, Vršovice, 10100 Praha 10',
          id: 'ruian-geocode:1_1203603',
          source: { id: 'ruian-geocode', kind: 'live-provider' },
        },
      ],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://ruian.test/geocode/suggest?text=K+Lou%C5%BEi&f=json&maxSuggestions=20',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('does not emit RÚIAN administrative rows for address suggestions', async () => {
    const fetchMock = vi.fn<SmartSuggestProviderFetch>(() =>
      Promise.resolve(
        jsonResponse({
          suggestions: [
            {
              isCollection: false,
              magicKey: '4_123',
              text: 'Liberecký kraj',
              type: 'VyssiUzemneSamospravnyCelek',
            },
            {
              isCollection: false,
              magicKey: '4_456',
              text: 'Králova Lhota (Písek)',
              type: 'Obec',
            },
            {
              isCollection: false,
              magicKey: '4_789',
              text: 'K louži, Praha',
              type: 'Ulice',
            },
          ],
        }),
      ),
    );
    const provider = createRuianGeocodeProvider({
      baseUrl: 'https://ruian.test/geocode',
      fetch: fetchMock,
    });

    await expect(
      provider.suggest(
        { countryCode: 'CZ', kind: 'address', limit: 20, query: 'K L' },
        {
          cachePolicy: provider.cachePolicy,
          requestId: 'request-ruian-admin',
        },
      ),
    ).resolves.toMatchObject({ suggestions: [] });
  });

  it('expands trailing RÚIAN house-number prefixes to recover matching address points', async () => {
    const fetchMock = vi.fn<SmartSuggestProviderFetch>((input) => {
      const url = new URL(String(input));
      const query = url.searchParams.get('text');

      if (query === 'K Louži 125') {
        return Promise.resolve(
          jsonResponse({
            suggestions: [
              {
                isCollection: false,
                magicKey: '1_999999',
                text: 'K Louži 125, 25228 Vonoklasy',
                type: 'AdresniMisto',
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
              magicKey: '1_1203603',
              text: 'K louži 1258/12, Vršovice, 10100 Praha 10',
              type: 'AdresniMisto',
            },
            {
              isCollection: false,
              magicKey: '1_784',
              text: 'K louži 784/3, Vršovice, 10100 Praha 10',
              type: 'AdresniMisto',
            },
            {
              isCollection: false,
              magicKey: '4_34593',
              text: 'K louži, Praha',
              type: 'Ulice',
            },
          ],
        }),
      );
    });
    const provider = createRuianGeocodeProvider({
      baseUrl: 'https://ruian.test/geocode',
      fetch: fetchMock,
    });

    const result = await provider.suggest(
      { countryCode: 'CZ', kind: 'address', limit: 20, query: 'K Louži 125' },
      {
        cachePolicy: provider.cachePolicy,
        requestId: 'request-ruian-prefix',
      },
    );

    expect(result.suggestions.map((suggestion) => suggestion.displayLabel)).toEqual([
      'K Louži 125, 25228 Vonoklasy',
      'K louži 1258/12, Vršovice, 10100 Praha 10',
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(
      fetchMock.mock.calls.map(([input]) => new URL(String(input)).searchParams.get('text')),
    ).toEqual(['K Louži 125', 'K Louži']);
  });

  it('matches RÚIAN expanded rows by orientation-number prefix too', async () => {
    const fetchMock = vi.fn<SmartSuggestProviderFetch>((input) => {
      const url = new URL(String(input));

      if (url.searchParams.get('text') === 'K Louži 12') {
        return Promise.resolve(jsonResponse({ suggestions: [] }));
      }

      return Promise.resolve(
        jsonResponse({
          suggestions: [
            {
              isCollection: false,
              magicKey: '1_1203603',
              text: 'K louži 1258/12, Vršovice, 10100 Praha 10',
              type: 'AdresniMisto',
            },
            {
              isCollection: false,
              magicKey: '1_784',
              text: 'K louži 784/3, Vršovice, 10100 Praha 10',
              type: 'AdresniMisto',
            },
          ],
        }),
      );
    });
    const provider = createRuianGeocodeProvider({
      baseUrl: 'https://ruian.test/geocode',
      fetch: fetchMock,
    });

    const result = await provider.suggest(
      { countryCode: 'CZ', kind: 'address', limit: 20, query: 'K Louži 12' },
      {
        cachePolicy: provider.cachePolicy,
        requestId: 'request-ruian-orientation-prefix',
      },
    );

    expect(result.suggestions.map((suggestion) => suggestion.displayLabel)).toEqual([
      'K louži 1258/12, Vršovice, 10100 Praha 10',
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('ranks exact-street RÚIAN expansion matches ahead of broader street-name matches', async () => {
    const fetchMock = vi.fn<SmartSuggestProviderFetch>((input) => {
      const url = new URL(String(input));

      if (url.searchParams.get('text') === 'K Louži 1') {
        return Promise.resolve(
          jsonResponse({
            suggestions: [
              {
                isCollection: false,
                magicKey: '1_1312',
                text: 'K louži 1312/1, Vršovice, 10100 Praha 10',
                type: 'AdresniMisto',
              },
              {
                isCollection: false,
                magicKey: '1_kaci',
                text: 'Ke Kačí louži 18/1, Černice, 32600 Plzeň',
                type: 'AdresniMisto',
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
              magicKey: '1_1203603',
              text: 'K louži 1258/12, Vršovice, 10100 Praha 10',
              type: 'AdresniMisto',
            },
          ],
        }),
      );
    });
    const provider = createRuianGeocodeProvider({
      baseUrl: 'https://ruian.test/geocode',
      fetch: fetchMock,
    });

    const result = await provider.suggest(
      { countryCode: 'CZ', kind: 'address', limit: 20, query: 'K Louži 1' },
      {
        cachePolicy: provider.cachePolicy,
        requestId: 'request-ruian-street-rank',
      },
    );

    expect(result.suggestions.map((suggestion) => suggestion.displayLabel)).toEqual([
      'K louži 1312/1, Vršovice, 10100 Praha 10',
      'K louži 1258/12, Vršovice, 10100 Praha 10',
      'Ke Kačí louži 18/1, Černice, 32600 Plzeň',
    ]);
  });

  it('skips non-CZ address requests without calling RÚIAN', async () => {
    const fetchMock = vi.fn<SmartSuggestProviderFetch>();
    const provider = createRuianGeocodeProvider({ fetch: fetchMock });

    await expect(
      provider.suggest(
        { countryCode: 'SK', kind: 'address', limit: 20, query: 'Hlavná' },
        {
          cachePolicy: provider.cachePolicy,
          requestId: 'request-ruian-skip',
        },
      ),
    ).resolves.toMatchObject({ suggestions: [] });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('createRadarAutocompleteProvider', () => {
  it('normalizes Radar autocomplete responses', async () => {
    const fetchMock = vi.fn<SmartSuggestProviderFetch>(() =>
      Promise.resolve(
        jsonResponse({
          addresses: [
            {
              city: 'Praha',
              countryCode: 'CZ',
              formattedAddress: 'K Louži 1, Praha',
              latitude: 50.03,
              longitude: 14.5,
              number: '1',
              postalCode: '101 00',
              state: 'Praha',
              street: 'K Louži',
            },
          ],
        }),
      ),
    );
    const provider = createRadarAutocompleteProvider({
      apiKey: 'radar-key',
      baseUrl: 'https://radar.test',
      fetch: fetchMock,
      layers: 'address',
      near: '50.087,14.421',
    });

    await expect(
      provider.suggest(addressRequest, {
        cachePolicy: provider.cachePolicy,
        requestId: 'request-radar',
      }),
    ).resolves.toMatchObject({
      suggestions: [
        {
          address: {
            city: 'Praha',
            countryCode: 'CZ',
            line1: 'K Louži 1',
            postalCode: '101 00',
          },
          displayLabel: 'K Louži 1, Praha',
          source: { id: 'radar-autocomplete', kind: 'live-provider' },
        },
      ],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://radar.test/v1/search/autocomplete?query=Vaclavske+namesti&limit=3&layers=address&near=50.087%2C14.421&countryCode=CZ',
      expect.objectContaining({
        headers: { accept: 'application/json', authorization: 'radar-key' },
        method: 'GET',
      }),
    );
  });
});

describe('createHereDiscoverProvider', () => {
  it('normalizes HERE discover responses and maps CZ country filters to HERE alpha-3', async () => {
    const fetchMock = vi.fn<SmartSuggestProviderFetch>(() =>
      Promise.resolve(
        jsonResponse({
          items: [
            {
              address: {
                city: 'Praha',
                countryCode: 'CZE',
                houseNumber: '1',
                label: 'K Louži 1, Praha, Česko',
                postalCode: '101 00',
                street: 'K Louži',
              },
              id: 'here-1',
              position: { lat: 50.03, lng: 14.5 },
              resultType: 'houseNumber',
              scoring: { queryScore: 0.91 },
              title: 'K Louži 1',
            },
          ],
        }),
      ),
    );
    const provider = createHereDiscoverProvider({
      apiKey: 'here-key',
      baseUrl: 'https://here.test',
      fetch: fetchMock,
    });

    await expect(
      provider.suggest(addressRequest, {
        cachePolicy: provider.cachePolicy,
        requestId: 'request-here',
      }),
    ).resolves.toMatchObject({
      suggestions: [
        {
          address: {
            city: 'Praha',
            countryCode: 'CZ',
            line1: 'K Louži 1',
            postalCode: '101 00',
          },
          confidence: 0.91,
          id: 'here-discover:here-1',
          source: { id: 'here-discover', kind: 'live-provider' },
        },
      ],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://here.test/v1/discover?q=Vaclavske+namesti&apiKey=here-key&limit=3&in=countryCode%3ACZE',
      expect.objectContaining({ method: 'GET' }),
    );
  });
});

describe('createNominatimProvider', () => {
  it('normalizes Nominatim responses with required request headers', async () => {
    const fetchMock = vi.fn<SmartSuggestProviderFetch>(() =>
      Promise.resolve(
        jsonResponse([
          {
            address: {
              city: 'Praha',
              country_code: 'cz',
              house_number: '1',
              postcode: '101 00',
              road: 'K Louži',
              state: 'Praha',
            },
            class: 'place',
            display_name: 'K Louži 1, Praha, Česko',
            importance: 0.7,
            lat: '50.03',
            lon: '14.5',
            osm_id: 123,
            osm_type: 'way',
            place_id: 456,
            type: 'house',
          },
        ]),
      ),
    );
    const provider = createNominatimProvider({
      baseUrl: 'https://nominatim.test',
      email: 'ops@example.test',
      fetch: fetchMock,
      referer: 'https://shop.example.test',
      userAgent: 'smart-suggest-test',
    });

    await expect(
      provider.suggest(addressRequest, {
        cachePolicy: provider.cachePolicy,
        requestId: 'request-nominatim',
      }),
    ).resolves.toMatchObject({
      suggestions: [
        {
          address: {
            city: 'Praha',
            countryCode: 'CZ',
            line1: 'K Louži 1',
            postalCode: '101 00',
          },
          confidence: 0.7,
          id: 'nominatim:456',
          source: { id: 'nominatim', kind: 'live-provider' },
        },
      ],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://nominatim.test/search?q=Vaclavske+namesti&format=jsonv2&addressdetails=1&limit=3&countrycodes=cz&email=ops%40example.test',
      expect.objectContaining({
        headers: {
          accept: 'application/json',
          referer: 'https://shop.example.test',
          'user-agent': 'smart-suggest-test',
        },
        method: 'GET',
      }),
    );
  });

  it('drops Nominatim rows that are not complete address points for address suggestions', async () => {
    const fetchMock = vi.fn<SmartSuggestProviderFetch>(() =>
      Promise.resolve(
        jsonResponse([
          {
            address: {
              country_code: 'cz',
              postcode: '101 00',
              road: 'K Louži',
            },
            class: 'highway',
            display_name: 'K Louži, Praha, Česko',
            importance: 0.6,
            place_id: 1,
            type: 'residential',
          },
          {
            address: {
              city: 'Praha',
              country_code: 'cz',
              house_number: '1258/12',
              postcode: '101 00',
              road: 'K Louži',
            },
            class: 'place',
            display_name: '1258/12, K Louži, Praha, Česko',
            importance: 0.8,
            place_id: 2,
            type: 'house',
          },
        ]),
      ),
    );
    const provider = createNominatimProvider({
      baseUrl: 'https://nominatim.test',
      fetch: fetchMock,
      userAgent: 'smart-suggest-test',
    });

    await expect(
      provider.suggest(
        { countryCode: 'CZ', kind: 'address', limit: 20, query: 'K Louži' },
        {
          cachePolicy: provider.cachePolicy,
          requestId: 'request-nominatim-filter',
        },
      ),
    ).resolves.toMatchObject({
      suggestions: [
        {
          address: {
            houseNumber: '1258',
            orientationNumber: '12',
            street: 'K Louži',
          },
          displayLabel: '1258/12, K Louži, Praha, Česko',
          source: { id: 'nominatim' },
        },
      ],
    });
  });
});

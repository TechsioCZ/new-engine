import {
  type AddressParts,
  normalizeSuggestLimit,
  type ProviderCachePolicy,
  type ProviderEventSummary,
  type SmartSuggestCountryCode,
  type SmartSuggestErrorCode,
  type SmartSuggestProvider,
  type SmartSuggestProviderResult,
  type SmartSuggestRequest,
  type SmartSuggestResponse,
  type SmartSuggestSuggestion,
  type SuggestionAttribution,
} from '@techsio/smart-suggest-core';

export type SmartSuggestProviderFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export type SmartSuggestCircuitBreakerConfig = {
  failureThreshold: number;
  openMs: number;
};

export type SmartSuggestProviderRegistryOptions = {
  circuitBreaker?: SmartSuggestCircuitBreakerConfig;
  now?: () => number;
  onProviderEvent?: (event: ProviderEventSummary) => void;
  priority?: readonly string[];
  providers: readonly SmartSuggestProvider[];
  timeoutMs?: number;
};

export type SmartSuggestProviderRegistrySuggestContext = {
  requestId?: string;
  signal?: AbortSignal;
};

export type SmartSuggestProviderRegistryResult = {
  provider?: SmartSuggestProvider;
  providerEvents: readonly ProviderEventSummary[];
  response: SmartSuggestResponse;
};

export type SmartSuggestProviderRegistry = {
  suggest: (
    request: SmartSuggestRequest,
    context?: SmartSuggestProviderRegistrySuggestContext,
  ) => Promise<SmartSuggestProviderRegistryResult>;
};

export class SmartSuggestProviderTimeoutError extends Error {
  readonly providerId: string;

  constructor(providerId: string) {
    super(`Smart Suggest provider "${providerId}" timed out.`);
    this.name = 'SmartSuggestProviderTimeoutError';
    this.providerId = providerId;
  }
}

export class SmartSuggestProviderHttpError extends Error {
  readonly providerId: string;
  readonly status: number;

  constructor(providerId: string, status: number) {
    super(`Smart Suggest provider "${providerId}" failed with ${status}.`);
    this.name = 'SmartSuggestProviderHttpError';
    this.providerId = providerId;
    this.status = status;
  }
}

type CircuitState = {
  failureCount: number;
  openedUntil?: number;
};

type ProviderRunSuccess = {
  event: ProviderEventSummary;
  result: SmartSuggestProviderResult;
  status: 'success';
};

type ProviderRunFailure = {
  event: ProviderEventSummary;
  status: 'failure';
};

type ProviderRunResult = ProviderRunFailure | ProviderRunSuccess;

type ProviderRunOptions = {
  context: {
    requestId: string;
    signal?: AbortSignal;
  };
  now: () => number;
  provider: SmartSuggestProvider;
  request: SmartSuggestRequest;
  timeoutMs: number;
};

const defaultCircuitBreaker: SmartSuggestCircuitBreakerConfig = {
  failureThreshold: 2,
  openMs: 30_000,
};

const liveProviderCachePolicy: ProviderCachePolicy = { kind: 'none' };

const defaultFetch: SmartSuggestProviderFetch = (input, init) => fetch(input, init);

const createRequestId = () => globalThis.crypto?.randomUUID?.() ?? `smart-suggest-${Date.now()}`;

const toCacheStatus = (cachePolicy: ProviderCachePolicy) =>
  cachePolicy.kind === 'none' ? 'disabled' : 'miss';

const createProviderEvent = (
  providerId: string,
  status: ProviderEventSummary['status'],
  latencyMs: number,
  errorCode?: SmartSuggestErrorCode,
) => {
  const event: ProviderEventSummary = {
    latencyMs: Math.max(0, Math.round(latencyMs)),
    providerId,
    status,
  };

  if (errorCode !== undefined) {
    event.errorCode = errorCode;
  }

  return event;
};

const sortProviders = (
  providers: readonly SmartSuggestProvider[],
  priority: readonly string[] | undefined,
  request: SmartSuggestRequest,
) => {
  const supportedProviders = providers.filter((provider) =>
    provider.supportedKinds.includes(request.kind),
  );

  if (priority === undefined || priority.length === 0) {
    return supportedProviders;
  }

  const priorityIndexes = new Map(priority.map((providerId, index) => [providerId, index]));

  return supportedProviders.toSorted((left, right) => {
    const leftIndex = priorityIndexes.get(left.id) ?? Number.MAX_SAFE_INTEGER;
    const rightIndex = priorityIndexes.get(right.id) ?? Number.MAX_SAFE_INTEGER;
    return leftIndex - rightIndex || left.id.localeCompare(right.id);
  });
};

const readCircuitState = (states: Map<string, CircuitState>, providerId: string) => {
  const existingState = states.get(providerId);

  if (existingState !== undefined) {
    return existingState;
  }

  const initialState: CircuitState = { failureCount: 0 };
  states.set(providerId, initialState);
  return initialState;
};

const markProviderSuccess = (states: Map<string, CircuitState>, providerId: string) => {
  states.set(providerId, { failureCount: 0 });
};

const markProviderFailure = (
  states: Map<string, CircuitState>,
  providerId: string,
  circuitBreaker: SmartSuggestCircuitBreakerConfig,
  now: () => number,
) => {
  const state = readCircuitState(states, providerId);
  const failureCount = state.failureCount + 1;
  const nextState: CircuitState = { failureCount };

  if (failureCount >= circuitBreaker.failureThreshold) {
    nextState.openedUntil = now() + circuitBreaker.openMs;
  }

  states.set(providerId, nextState);
};

const isCircuitOpen = (
  states: Map<string, CircuitState>,
  providerId: string,
  now: () => number,
) => {
  const openedUntil = readCircuitState(states, providerId).openedUntil;
  return openedUntil !== undefined && openedUntil > now();
};

const createTimeoutSignal = (
  providerId: string,
  parentSignal: AbortSignal | undefined,
  timeoutMs: number,
) => {
  const controller = new AbortController();
  const timeoutError = new SmartSuggestProviderTimeoutError(providerId);
  const timeout = setTimeout(() => {
    controller.abort(timeoutError);
  }, timeoutMs);
  const abortFromParent = () => {
    controller.abort(parentSignal?.reason);
  };

  if (parentSignal?.aborted === true) {
    abortFromParent();
  } else {
    parentSignal?.addEventListener('abort', abortFromParent, { once: true });
  }

  return {
    cleanup: () => {
      clearTimeout(timeout);
      parentSignal?.removeEventListener('abort', abortFromParent);
    },
    signal: controller.signal,
    timeoutError,
  };
};

const isTimeoutError = (error: unknown) =>
  error instanceof SmartSuggestProviderTimeoutError ||
  (error instanceof DOMException && error.name === 'TimeoutError');

const runProvider = async (options: ProviderRunOptions): Promise<ProviderRunResult> => {
  const { context, now, provider, request, timeoutMs } = options;
  const startedAt = now();
  const timeoutSignal = createTimeoutSignal(provider.id, context.signal, timeoutMs);
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutSignal.signal.addEventListener(
      'abort',
      () => {
        reject(timeoutSignal.signal.reason);
      },
      { once: true },
    );
  });

  try {
    const result = await Promise.race([
      provider.suggest(request, {
        cachePolicy: provider.cachePolicy,
        requestId: context.requestId,
        signal: timeoutSignal.signal,
      }),
      timeoutPromise,
    ]);

    return {
      event: createProviderEvent(provider.id, 'success', now() - startedAt),
      result,
      status: 'success',
    };
  } catch (error) {
    if (timeoutSignal.signal.aborted && !isTimeoutError(error)) {
      throw error;
    }

    const errorCode: SmartSuggestErrorCode = isTimeoutError(error)
      ? 'provider-timeout'
      : 'provider-unavailable';

    return {
      event: createProviderEvent(
        provider.id,
        isTimeoutError(error) ? 'timeout' : 'error',
        now() - startedAt,
        errorCode,
      ),
      status: 'failure',
    };
  } finally {
    timeoutSignal.cleanup();
  }
};

const toProviderResponse = (
  requestId: string,
  result: SmartSuggestProviderResult,
  providerEvents: readonly ProviderEventSummary[],
): SmartSuggestResponse => ({
  cacheStatus: toCacheStatus(result.cachePolicy),
  providerEvents: [...providerEvents],
  requestId,
  suggestions: result.suggestions.map((suggestion) => ({
    ...suggestion,
    cacheStatus: toCacheStatus(result.cachePolicy),
  })),
});

const normalizeDedupeText = (value: string) =>
  value
    .normalize('NFKD')
    .replaceAll(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('cs-CZ')
    .replaceAll(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replaceAll(/\s+/g, ' ');

const suggestionDedupeKey = (suggestion: SmartSuggestSuggestion) => {
  const address = suggestion.address;
  const addressKey = [
    address?.countryCode,
    address?.postalCode,
    address?.city,
    address?.street ?? address?.line1,
    address?.houseNumber,
    address?.orientationNumber,
  ]
    .filter((value) => value !== undefined && value.trim() !== '')
    .join('|');

  return normalizeDedupeText(addressKey === '' ? suggestion.displayLabel : addressKey);
};

const dedupeProviderSuggestions = (
  suggestions: readonly SmartSuggestSuggestion[],
  limit: number | undefined,
) => {
  const dedupedByKey = new Map<string, SmartSuggestSuggestion>();

  for (const suggestion of suggestions) {
    const key = suggestionDedupeKey(suggestion);

    if (key === '') {
      continue;
    }

    const existing = dedupedByKey.get(key);

    if (existing === undefined || suggestion.confidence > existing.confidence) {
      dedupedByKey.set(key, suggestion);
    }
  }

  const normalizedLimit = normalizeSuggestLimit(limit);
  return [...dedupedByKey.values()]
    .toSorted((left, right) => right.confidence - left.confidence)
    .slice(0, normalizedLimit);
};

export const createSmartSuggestProviderRegistry = (
  options: SmartSuggestProviderRegistryOptions,
): SmartSuggestProviderRegistry => {
  const circuitBreaker = options.circuitBreaker ?? defaultCircuitBreaker;
  const now = options.now ?? Date.now;
  const states = new Map<string, CircuitState>();

  const emitEvent = (events: ProviderEventSummary[], event: ProviderEventSummary) => {
    events.push(event);
    options.onProviderEvent?.(event);
  };

  return {
    suggest: async (request, context = {}) => {
      const requestId = context.requestId ?? createRequestId();
      const providerEvents: ProviderEventSummary[] = [];
      const suggestions: SmartSuggestSuggestion[] = [];
      let firstSuccessfulProvider: SmartSuggestProvider | undefined;

      for (const provider of sortProviders(options.providers, options.priority, request)) {
        if (isCircuitOpen(states, provider.id, now)) {
          emitEvent(
            providerEvents,
            createProviderEvent(provider.id, 'skipped', 0, 'provider-unavailable'),
          );
          continue;
        }

        const providerContext: ProviderRunOptions['context'] = { requestId };

        if (context.signal !== undefined) {
          providerContext.signal = context.signal;
        }

        const providerResult = await runProvider({
          context: providerContext,
          now,
          provider,
          request,
          timeoutMs: options.timeoutMs ?? 1500,
        });
        emitEvent(providerEvents, providerResult.event);

        if (providerResult.status === 'success') {
          markProviderSuccess(states, provider.id);

          if (providerResult.result.suggestions.length > 0) {
            firstSuccessfulProvider ??= provider;
            suggestions.push(
              ...toProviderResponse(requestId, providerResult.result, providerEvents).suggestions,
            );
          }

          continue;
        }

        markProviderFailure(states, provider.id, circuitBreaker, now);
      }

      const response: SmartSuggestResponse = {
        cacheStatus: 'disabled',
        providerEvents,
        requestId,
        suggestions: dedupeProviderSuggestions(suggestions, request.limit),
      };
      const result: SmartSuggestProviderRegistryResult = { providerEvents, response };

      if (firstSuccessfulProvider !== undefined) {
        result.provider = firstSuccessfulProvider;
      }

      return result;
    },
  };
};

export type MapyCzProviderOptions = {
  apiKey: string;
  attribution?: SuggestionAttribution;
  endpointUrl?: string;
  fetch?: SmartSuggestProviderFetch;
  language?: string;
  limit?: number;
};

export type RadarAutocompleteProviderOptions = {
  apiKey: string;
  attribution?: SuggestionAttribution;
  baseUrl?: string;
  countryCode?: SmartSuggestCountryCode;
  fetch?: SmartSuggestProviderFetch;
  layers?: string;
  limit?: number;
  near?: string;
};

export type HereDiscoverProviderOptions = {
  apiKey: string;
  at?: string;
  attribution?: SuggestionAttribution;
  baseUrl?: string;
  fetch?: SmartSuggestProviderFetch;
  inArea?: string;
  language?: string;
  limit?: number;
};

export type NominatimProviderOptions = {
  attribution?: SuggestionAttribution;
  baseUrl?: string;
  email?: string;
  fetch?: SmartSuggestProviderFetch;
  limit?: number;
  referer?: string;
  userAgent: string;
};

export type RuianGeocodeProviderOptions = {
  attribution?: SuggestionAttribution;
  baseUrl?: string;
  fetch?: SmartSuggestProviderFetch;
  limit?: number;
};

export type SmartSuggestProviderRuntimeConfig = {
  circuitBreaker?: SmartSuggestCircuitBreakerConfig;
  hereDiscover?: HereDiscoverProviderOptions;
  mapyCz?: MapyCzProviderOptions;
  nominatim?: NominatimProviderOptions;
  now?: () => number;
  onProviderEvent?: (event: ProviderEventSummary) => void;
  priority?: readonly string[];
  radarAutocomplete?: RadarAutocompleteProviderOptions;
  ruianGeocode?: RuianGeocodeProviderOptions;
  timeoutMs?: number;
};

type MapyRegionalEntry = {
  isoCode?: unknown;
  name?: unknown;
  type?: unknown;
};

type MapySuggestionEntity = {
  id?: unknown;
  label?: unknown;
  location?: unknown;
  name?: unknown;
  position?: unknown;
  regionalStructure?: unknown;
  type?: unknown;
  zip?: unknown;
};

const mapyAttribution: SuggestionAttribution = {
  label: 'Mapy.cz',
  url: 'https://developer.mapy.com/',
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const readRecordValue = (record: Record<string, unknown>, key: string) => record[key];

const readOptionalRecord = (value: unknown) => (isRecord(value) ? value : undefined);

const optionalString = (value: unknown) =>
  typeof value === 'string' && value.trim() !== '' ? value : undefined;

const optionalNumber = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const readMapyEntities = (body: unknown): readonly MapySuggestionEntity[] => {
  if (Array.isArray(body)) {
    return body.filter(isRecord);
  }

  if (!isRecord(body)) {
    return [];
  }

  const candidates = ['items', 'results', 'suggestions', 'data'].map((key) =>
    readRecordValue(body, key),
  );
  const firstArray = candidates.find(Array.isArray);
  return firstArray?.filter(isRecord) ?? [];
};

const readRegionalStructure = (entity: MapySuggestionEntity): readonly MapyRegionalEntry[] =>
  Array.isArray(entity.regionalStructure) ? entity.regionalStructure.filter(isRecord) : [];

const findRegionalName = (regionalStructure: readonly MapyRegionalEntry[], type: string) =>
  optionalString(regionalStructure.find((entry) => entry.type === type)?.name);

const findRegionalIsoCode = (regionalStructure: readonly MapyRegionalEntry[]) =>
  toCountryCode(
    optionalString(regionalStructure.find((entry) => entry.isoCode !== undefined)?.isoCode),
  );

const alpha2ByAlpha3: Record<string, string> = {
  AUT: 'AT',
  CZE: 'CZ',
  DEU: 'DE',
  ESP: 'ES',
  FRA: 'FR',
  GBR: 'GB',
  HUN: 'HU',
  ITA: 'IT',
  POL: 'PL',
  SVK: 'SK',
  USA: 'US',
};

const toCountryCode = (value: string | undefined) => {
  const normalized = value?.trim().toUpperCase();
  const alpha2 = normalized === undefined ? undefined : alpha2ByAlpha3[normalized];
  return normalized === '' || normalized === undefined
    ? undefined
    : ((alpha2 ?? normalized) as SmartSuggestCountryCode);
};

const readPositionMetadata = (position: unknown) => {
  if (!isRecord(position)) {
    return {};
  }

  const latitude = optionalNumber(readRecordValue(position, 'lat'));
  const longitude = optionalNumber(
    readRecordValue(position, 'lon') ?? readRecordValue(position, 'lng'),
  );

  return {
    ...(latitude === undefined ? {} : { latitude }),
    ...(longitude === undefined ? {} : { longitude }),
  };
};

const toMapyAddressParts = (
  entity: MapySuggestionEntity,
  request: SmartSuggestRequest,
): AddressParts => {
  const regionalStructure = readRegionalStructure(entity);
  const city =
    findRegionalName(regionalStructure, 'municipality') ??
    findRegionalName(regionalStructure, 'municipality_part');
  const countryCode = findRegionalIsoCode(regionalStructure) ?? request.countryCode;
  const line1 = optionalString(entity.name) ?? optionalString(entity.label);
  const postalCode = optionalString(entity.zip);
  const region = findRegionalName(regionalStructure, 'regional_region');
  const address: AddressParts = {};

  if (city !== undefined) {
    address.city = city;
  }

  if (countryCode !== undefined) {
    address.countryCode = countryCode;
  }

  if (line1 !== undefined) {
    address.line1 = line1;
  }

  if (postalCode !== undefined) {
    address.postalCode = postalCode;
  }

  if (region !== undefined) {
    address.region = region;
  }

  return address;
};

const toDisplayLabel = (entity: MapySuggestionEntity, address: AddressParts) => {
  const label = optionalString(entity.label);

  if (
    label !== undefined &&
    (label.includes(',') ||
      (address.postalCode !== undefined && label.includes(address.postalCode)))
  ) {
    return label;
  }

  return [
    label ?? optionalString(entity.name),
    address.postalCode,
    address.city,
    address.countryCode,
  ]
    .filter((value) => value !== undefined && value.trim() !== '')
    .join(', ');
};

const toMapySuggestion = (
  entity: MapySuggestionEntity,
  index: number,
  request: SmartSuggestRequest,
  attribution: SuggestionAttribution,
): SmartSuggestSuggestion | undefined => {
  const address = toMapyAddressParts(entity, request);
  const displayLabel = toDisplayLabel(entity, address);

  if (displayLabel === '') {
    return;
  }

  return {
    address,
    attribution,
    confidence: 0.72,
    displayLabel,
    id: optionalString(entity.id) ?? `mapy-${index}`,
    kind: request.kind,
    metadata: {
      providerType: optionalString(entity.type) ?? null,
      ...readPositionMetadata(entity.position),
    },
    source: {
      attribution,
      id: 'mapy-cz',
      kind: 'live-provider',
      name: 'Mapy.cz',
    },
  };
};

const toMapyUrl = (
  endpointUrl: string,
  apiKey: string,
  request: SmartSuggestRequest,
  options: Pick<MapyCzProviderOptions, 'language' | 'limit'>,
) => {
  const params = new URLSearchParams();
  params.set('apikey', apiKey);
  params.set('query', request.query);
  params.set('lang', request.language ?? options.language ?? 'cs');
  params.set('limit', String(normalizeSuggestLimit(request.limit ?? options.limit)));
  params.set('type', request.kind === 'address' ? 'regional.address' : 'regional');

  if (request.countryCode !== undefined) {
    params.set('locality', request.countryCode.toLowerCase());
  }

  return `${endpointUrl}?${params.toString()}`;
};

export const createMapyCzProvider = (options: MapyCzProviderOptions): SmartSuggestProvider => {
  const fetchImpl = options.fetch ?? defaultFetch;
  const endpointUrl = options.endpointUrl ?? 'https://api.mapy.com/v1/suggest';
  const attribution = options.attribution ?? mapyAttribution;

  return {
    cachePolicy: liveProviderCachePolicy,
    id: 'mapy-cz',
    name: 'Mapy.cz',
    supportedKinds: ['address', 'place'],
    suggest: async (request, context) => {
      const requestInit: RequestInit = {
        headers: { accept: 'application/json' },
        method: 'GET',
      };

      if (context.signal !== undefined) {
        requestInit.signal = context.signal;
      }

      const response = await fetchImpl(
        toMapyUrl(endpointUrl, options.apiKey, request, options),
        requestInit,
      );

      if (!response.ok) {
        throw new SmartSuggestProviderHttpError('mapy-cz', response.status);
      }

      const body = (await response.json()) as unknown;
      const suggestions = readMapyEntities(body)
        .map((entity, index) => toMapySuggestion(entity, index, request, attribution))
        .filter((suggestion) => suggestion !== undefined);

      return {
        attribution,
        cachePolicy: liveProviderCachePolicy,
        suggestions,
      };
    },
  };
};

const readRuianSuggestionEntries = (body: unknown) =>
  isRecord(body) ? readArray(readRecordValue(body, 'suggestions')) : [];

const ruianPostalCityPattern = /^\s*(?<first>\d{3})\s*(?<second>\d{2})\s+(?<city>.+?)\s*$/u;
const ruianStreetHousePattern =
  /^(?<street>.+?)\s+(?<houseNumber>\d{1,6}[a-zA-Z]?)(?:\/(?<orientationNumber>\d{1,5}[a-zA-Z]?))?$/u;
const ruianTrailingAddressNumberPattern =
  /(?:^|[\s,])(?<numberPrefix>\d{1,6}[a-zA-Z]?)\s*$/u;
const ruianAddressNumberPattern =
  /(?:^|[^\p{L}\p{N}])(?<houseNumber>\d{1,6}[a-zA-Z]?)(?:\s*\/\s*(?<orientationNumber>\d{1,5}[a-zA-Z]?))?(?=$|[^\p{L}\p{N}])/gu;
const ruianTextSignalPattern = /\p{L}/u;

const formatRuianPostalCode = (first: string, second: string) => `${first} ${second}`;

const addressFromRuianText = (
  text: string,
  request: SmartSuggestRequest,
): AddressParts | undefined => {
  const segments = text
    .split(',')
    .map((segment) => segment.trim())
    .filter((segment) => segment !== '');
  const [streetSegment, districtSegment, postalCitySegment] = segments;

  if (streetSegment === undefined) {
    return undefined;
  }

  const parts: AddressParts = {
    countryCode: request.countryCode ?? 'CZ',
  };
  const streetHouseMatch = ruianStreetHousePattern.exec(streetSegment);

  if (streetHouseMatch?.groups !== undefined) {
    const street = streetHouseMatch.groups['street'];
    const houseNumber = streetHouseMatch.groups['houseNumber'];
    const orientationNumber = streetHouseMatch.groups['orientationNumber'];

    if (street !== undefined && houseNumber !== undefined) {
      parts.street = street;
      parts.houseNumber = houseNumber;

      if (orientationNumber !== undefined) {
        parts.orientationNumber = orientationNumber;
      }
    } else {
      parts.street = streetSegment;
    }
  } else {
    parts.street = streetSegment;
  }

  if (districtSegment !== undefined) {
    parts.district = districtSegment;
  }

  if (postalCitySegment !== undefined) {
    const postalCityMatch = ruianPostalCityPattern.exec(postalCitySegment);

    if (postalCityMatch?.groups !== undefined) {
      const first = postalCityMatch.groups['first'];
      const second = postalCityMatch.groups['second'];
      const city = postalCityMatch.groups['city'];

      if (first !== undefined && second !== undefined && city !== undefined) {
        parts.postalCode = formatRuianPostalCode(first, second);
        parts.city = city;
      }
    } else {
      parts.city = postalCitySegment;
    }
  } else if (districtSegment !== undefined && streetHouseMatch === null) {
    parts.city = districtSegment;
    delete parts.district;
  }

  return parts;
};

const isRuianAddressPoint = (entry: Record<string, unknown>) =>
  compactString(entry['type']) === 'AdresniMisto';

type RuianAddressNumberPrefixExpansion = {
  numberPrefix: string;
  request: SmartSuggestRequest;
};

const createRuianAddressNumberPrefixExpansion = (
  request: SmartSuggestRequest,
): RuianAddressNumberPrefixExpansion | undefined => {
  const match = ruianTrailingAddressNumberPattern.exec(request.query);
  const numberPrefix = match?.groups?.['numberPrefix'];

  if (match === null || numberPrefix === undefined) {
    return;
  }

  const expandedQuery = request.query
    .slice(0, match.index)
    .replaceAll(/[\s,]+$/g, '')
    .trim();

  if (expandedQuery === '' || expandedQuery === request.query.trim()) {
    return;
  }

  if (!ruianTextSignalPattern.test(expandedQuery)) {
    return;
  }

  return {
    numberPrefix: numberPrefix.toLocaleLowerCase('cs-CZ'),
    request: {
      ...request,
      query: expandedQuery,
    },
  };
};

const collectRuianAddressNumbersFromText = (value: string | undefined) => {
  if (value === undefined) {
    return [];
  }

  const numbers: string[] = [];

  for (const match of value.matchAll(ruianAddressNumberPattern)) {
    const houseNumber = match.groups?.['houseNumber'];
    const orientationNumber = match.groups?.['orientationNumber'];

    if (houseNumber !== undefined) {
      numbers.push(houseNumber.toLocaleLowerCase('cs-CZ'));
    }

    if (orientationNumber !== undefined) {
      numbers.push(orientationNumber.toLocaleLowerCase('cs-CZ'));
    }
  }

  return numbers;
};

const suggestionMatchesRuianAddressNumberPrefix = (
  suggestion: SmartSuggestSuggestion,
  numberPrefix: string,
) => {
  const address = suggestion.address;

  if (address === undefined) {
    return false;
  }

  const numbers = [
    address.houseNumber?.toLocaleLowerCase('cs-CZ'),
    address.orientationNumber?.toLocaleLowerCase('cs-CZ'),
    ...collectRuianAddressNumbersFromText(address.line1),
  ].filter((value) => value !== undefined);

  return numbers.some((number) => number.startsWith(numberPrefix));
};

const dedupeRuianSuggestions = (
  suggestions: readonly SmartSuggestSuggestion[],
  limit: number,
) => {
  const deduped: SmartSuggestSuggestion[] = [];
  const seen = new Set<string>();

  for (const suggestion of suggestions) {
    const key = suggestionDedupeKey(suggestion);

    if (key === '' || seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(suggestion);

    if (deduped.length >= limit) {
      break;
    }
  }

  return deduped;
};

const scoreRuianExpandedStreetMatch = (
  suggestion: SmartSuggestSuggestion,
  expansion: RuianAddressNumberPrefixExpansion | undefined,
) => {
  const street = suggestion.address?.street;

  if (street === undefined || expansion === undefined) {
    return 0;
  }

  const normalizedStreet = normalizeDedupeText(street);
  const normalizedExpandedQuery = normalizeDedupeText(expansion.request.query);

  if (normalizedStreet === '' || normalizedExpandedQuery === '') {
    return 0;
  }

  if (
    normalizedExpandedQuery === normalizedStreet ||
    normalizedExpandedQuery.startsWith(`${normalizedStreet} `)
  ) {
    return 2;
  }

  if (normalizedStreet.startsWith(normalizedExpandedQuery)) {
    return 1;
  }

  return 0;
};

const sortRuianExpandedSuggestions = (
  suggestions: readonly SmartSuggestSuggestion[],
  expansion: RuianAddressNumberPrefixExpansion | undefined,
) =>
  suggestions
    .map((suggestion, index) => ({
      index,
      score: scoreRuianExpandedStreetMatch(suggestion, expansion),
      suggestion,
    }))
    .toSorted((left, right) => right.score - left.score || left.index - right.index)
    .map(({ suggestion }) => suggestion);

const toRuianSuggestion = (
  entry: Record<string, unknown>,
  index: number,
  request: SmartSuggestRequest,
  attribution: SuggestionAttribution,
): SmartSuggestSuggestion | undefined => {
  const displayLabel = compactString(entry['text']);

  if (displayLabel === undefined) {
    return;
  }

  const magicKey = firstString(entry['magicKey']);
  const type = compactString(entry['type']);
  const address = addressFromRuianText(displayLabel, request);
  const suggestion: SmartSuggestSuggestion = {
    attribution,
    confidence: type === 'AdresniMisto' ? 0.98 : 0.72,
    displayLabel,
    id: `ruian-geocode:${magicKey ?? index}`,
    kind: request.kind,
    source: {
      attribution,
      id: 'ruian-geocode',
      kind: 'live-provider',
      name: 'RÚIAN geocoder',
    },
  };

  if (address !== undefined) {
    suggestion.address = address;
  }

  const metadata: Record<string, string | number | boolean | null> = {};

  readMetadataString(metadata, 'magicKey', magicKey);
  readMetadataString(metadata, 'type', type);

  const isCollection = entry['isCollection'];

  if (typeof isCollection === 'boolean') {
    metadata['isCollection'] = isCollection;
  }

  const normalizedMetadata = metadataOrUndefined(metadata);

  if (normalizedMetadata !== undefined) {
    suggestion.metadata = normalizedMetadata;
  }

  return suggestion;
};

const toRuianUrl = (
  baseUrl: string,
  request: SmartSuggestRequest,
  options: Pick<RuianGeocodeProviderOptions, 'limit'>,
) => {
  const params = new URLSearchParams();
  params.set('text', request.query);
  params.set('f', 'json');
  params.set('maxSuggestions', String(normalizeSuggestLimit(request.limit ?? options.limit)));

  return `${baseUrl.replaceAll(/\/+$/g, '')}/suggest?${params.toString()}`;
};

export const createRuianGeocodeProvider = (
  options: RuianGeocodeProviderOptions = {},
): SmartSuggestProvider => {
  const fetchImpl = options.fetch ?? defaultFetch;
  const attribution = options.attribution ?? ruianAttribution;
  const baseUrl =
    options.baseUrl ?? 'https://ags.cuzk.gov.cz/arcgis/rest/services/RUIAN/MapServer/exts/GeocodeSOE';

  return {
    cachePolicy: liveProviderCachePolicy,
    id: 'ruian-geocode',
    name: 'RÚIAN geocoder',
    supportedKinds: ['address'],
    suggest: async (request, context) => {
      if (request.countryCode !== undefined && request.countryCode !== 'CZ') {
        return {
          attribution,
          cachePolicy: liveProviderCachePolicy,
          suggestions: [],
        };
      }

      const requestInit: RequestInit = {
        headers: { accept: 'application/json' },
        method: 'GET',
      };

      if (context.signal !== undefined) {
        requestInit.signal = context.signal;
      }

      const fetchAddressPointSuggestions = async (ruianRequest: SmartSuggestRequest) => {
        const response = await fetchImpl(toRuianUrl(baseUrl, ruianRequest, options), requestInit);
        const body = await readJson(response, 'ruian-geocode');
        const entries = readRuianSuggestionEntries(body);
        const addressPointEntries = entries.filter(isRuianAddressPoint);

        return addressPointEntries
          .map((entry, index) => toRuianSuggestion(entry, index, ruianRequest, attribution))
          .filter((suggestion) => suggestion !== undefined);
      };

      const suggestions = await fetchAddressPointSuggestions(request);
      const expansion = createRuianAddressNumberPrefixExpansion(request);

      if (expansion !== undefined) {
        const expandedSuggestions = await fetchAddressPointSuggestions(expansion.request);
        suggestions.push(
          ...expandedSuggestions.filter((suggestion) =>
            suggestionMatchesRuianAddressNumberPrefix(suggestion, expansion.numberPrefix),
          ),
        );
      }

      return {
        attribution,
        cachePolicy: liveProviderCachePolicy,
        suggestions: dedupeRuianSuggestions(
          sortRuianExpandedSuggestions(suggestions, expansion),
          normalizeSuggestLimit(request.limit ?? options.limit),
        ),
      };
    },
  };
};

const radarAttribution: SuggestionAttribution = {
  label: 'Radar',
  url: 'https://radar.com/',
};

const hereAttribution: SuggestionAttribution = {
  label: 'HERE',
  url: 'https://www.here.com/',
};

const nominatimAttribution: SuggestionAttribution = {
  label: 'OpenStreetMap Nominatim',
  license: 'ODbL',
  url: 'https://nominatim.openstreetmap.org/',
};

const ruianAttribution: SuggestionAttribution = {
  label: 'RÚIAN / ČÚZK',
  url: 'https://www.cuzk.gov.cz/',
};

const compactString = (value: unknown) =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

const compactNumber = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const firstString = (...values: unknown[]) => values.map(compactString).find(Boolean);

const joinParts = (...values: unknown[]) => {
  const joined = values
    .map(compactString)
    .filter((value) => value !== undefined)
    .join(' ');

  return joined === '' ? undefined : joined;
};

type AddressNumberParts = {
  houseNumber?: string;
  orientationNumber?: string;
};

const splitAddressNumber = (value: unknown): AddressNumberParts => {
  const normalized = compactString(value);

  if (normalized === undefined) {
    return {};
  }

  const [rawHouseNumber, rawOrientationNumber] = normalized.split('/');
  const houseNumber = compactString(rawHouseNumber);
  const orientationNumber = compactString(rawOrientationNumber);

  if (houseNumber === undefined) {
    return {};
  }

  return {
    houseNumber,
    ...(orientationNumber === undefined ? {} : { orientationNumber }),
  };
};

const readArray = (value: unknown): readonly Record<string, unknown>[] =>
  Array.isArray(value) ? value.filter(isRecord) : [];

const readJson = async (response: Response, providerId: string) => {
  if (!response.ok) {
    throw new SmartSuggestProviderHttpError(providerId, response.status);
  }

  return (await response.json()) as unknown;
};

const readMetadataNumber = (
  metadata: Record<string, string | number | boolean | null>,
  key: string,
  value: unknown,
) => {
  const numberValue = compactNumber(value);

  if (numberValue !== undefined) {
    metadata[key] = numberValue;
  }
};

const readMetadataString = (
  metadata: Record<string, string | number | boolean | null>,
  key: string,
  value: unknown,
) => {
  const stringValue = compactString(value);

  if (stringValue !== undefined) {
    metadata[key] = stringValue;
  }
};

const metadataOrUndefined = (metadata: Record<string, string | number | boolean | null>) =>
  Object.keys(metadata).length === 0 ? undefined : metadata;

const toCoordinateString = (value: string | undefined) => {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

const toHereCountryArea = (countryCode: SmartSuggestCountryCode | undefined) => {
  if (countryCode === undefined) {
    return undefined;
  }

  const alpha3ByAlpha2: Record<string, string> = {
    AT: 'AUT',
    CZ: 'CZE',
    DE: 'DEU',
    ES: 'ESP',
    FR: 'FRA',
    GB: 'GBR',
    HU: 'HUN',
    IT: 'ITA',
    PL: 'POL',
    SK: 'SVK',
    US: 'USA',
  };
  const normalized = countryCode.toUpperCase();
  const hereCountryCode = normalized.length === 2 ? alpha3ByAlpha2[normalized] : normalized;

  return hereCountryCode === undefined ? undefined : `countryCode:${hereCountryCode}`;
};

const readRadarAddresses = (body: unknown) =>
  isRecord(body) ? readArray(readRecordValue(body, 'addresses')) : [];

const labelFromRadar = (address: Record<string, unknown>) => {
  const label = firstString(
    address['formattedAddress'],
    address['placeLabel'],
    address['addressLabel'],
  );

  if (label !== undefined) {
    return label;
  }

  return (
    [
      joinParts(address['number'], address['street']),
      compactString(address['city']),
      compactString(address['stateCode']),
      compactString(address['countryCode']),
    ]
      .filter((value) => value !== undefined)
      .join(', ') || undefined
  );
};

const addressFromRadar = (address: Record<string, unknown>): AddressParts => {
  const street = compactString(address['street']);
  const addressNumber = splitAddressNumber(address['number']);
  const line1 = joinParts(street, address['number']);
  const line2 = firstString(address['neighborhood'], address['borough']);
  const city = firstString(address['city'], address['county']);
  const region = firstString(address['state'], address['stateCode']);
  const postalCode = compactString(address['postalCode']);
  const countryCode = toCountryCode(compactString(address['countryCode']));
  const parts: AddressParts = {};

  if (line1 !== undefined) {
    parts.line1 = line1;
  }
  if (street !== undefined) {
    parts.street = street;
  }
  if (addressNumber.houseNumber !== undefined) {
    parts.houseNumber = addressNumber.houseNumber;
  }
  if (addressNumber.orientationNumber !== undefined) {
    parts.orientationNumber = addressNumber.orientationNumber;
  }
  if (line2 !== undefined) {
    parts.line2 = line2;
  }
  if (city !== undefined) {
    parts.city = city;
  }
  if (region !== undefined) {
    parts.region = region;
  }
  if (postalCode !== undefined) {
    parts.postalCode = postalCode;
  }
  if (countryCode !== undefined) {
    parts.countryCode = countryCode;
  }

  return parts;
};

const metadataFromRadar = (address: Record<string, unknown>) => {
  const metadata: Record<string, string | number | boolean | null> = {};

  readMetadataNumber(metadata, 'latitude', address['latitude']);
  readMetadataNumber(metadata, 'longitude', address['longitude']);
  readMetadataNumber(metadata, 'distance', address['distance']);
  readMetadataString(metadata, 'layer', address['layer']);
  readMetadataString(metadata, 'placeLabel', address['placeLabel']);

  return metadataOrUndefined(metadata);
};

const toRadarSuggestion = (
  address: Record<string, unknown>,
  index: number,
  request: SmartSuggestRequest,
  attribution: SuggestionAttribution,
): SmartSuggestSuggestion | undefined => {
  const displayLabel = labelFromRadar(address);

  if (displayLabel === undefined) {
    return;
  }

  const idParts = [
    firstString(address['formattedAddress'], address['placeLabel'], address['addressLabel']),
    compactNumber(address['latitude']),
    compactNumber(address['longitude']),
    compactString(address['layer']),
  ].filter((value) => value !== undefined);

  const suggestion: SmartSuggestSuggestion = {
    address: addressFromRadar(address),
    attribution,
    confidence: 0.78,
    displayLabel,
    id: `radar-autocomplete:${idParts.length === 0 ? index : idParts.join('|')}`,
    kind: request.kind,
    source: {
      attribution,
      id: 'radar-autocomplete',
      kind: 'live-provider',
      name: 'Radar Autocomplete',
    },
  };
  const metadata = metadataFromRadar(address);

  if (metadata !== undefined) {
    suggestion.metadata = metadata;
  }

  return suggestion;
};

const toRadarUrl = (
  baseUrl: string,
  request: SmartSuggestRequest,
  options: Pick<RadarAutocompleteProviderOptions, 'countryCode' | 'layers' | 'limit' | 'near'>,
) => {
  const params = new URLSearchParams();
  params.set('query', request.query);
  params.set('limit', String(normalizeSuggestLimit(request.limit ?? options.limit)));

  const countryCode = request.countryCode ?? options.countryCode;
  const near = toCoordinateString(options.near);

  if (options.layers !== undefined) {
    params.set('layers', options.layers);
  }
  if (near !== undefined) {
    params.set('near', near);
  }
  if (countryCode !== undefined) {
    params.set('countryCode', countryCode);
  }

  return `${baseUrl.replaceAll(/\/+$/g, '')}/v1/search/autocomplete?${params.toString()}`;
};

export const createRadarAutocompleteProvider = (
  options: RadarAutocompleteProviderOptions,
): SmartSuggestProvider => {
  const fetchImpl = options.fetch ?? defaultFetch;
  const attribution = options.attribution ?? radarAttribution;
  const baseUrl = options.baseUrl ?? 'https://api.radar.io';

  return {
    cachePolicy: liveProviderCachePolicy,
    id: 'radar-autocomplete',
    name: 'Radar Autocomplete',
    supportedKinds: ['address', 'place'],
    suggest: async (request, context) => {
      const requestInit: RequestInit = {
        headers: { accept: 'application/json', authorization: options.apiKey },
        method: 'GET',
      };

      if (context.signal !== undefined) {
        requestInit.signal = context.signal;
      }

      const response = await fetchImpl(toRadarUrl(baseUrl, request, options), requestInit);
      const body = await readJson(response, 'radar-autocomplete');
      const suggestions = readRadarAddresses(body)
        .map((address, index) => toRadarSuggestion(address, index, request, attribution))
        .filter((suggestion) => suggestion !== undefined);

      return {
        attribution,
        cachePolicy: liveProviderCachePolicy,
        suggestions,
      };
    },
  };
};

const readHereItems = (body: unknown) =>
  isRecord(body) ? readArray(readRecordValue(body, 'items')) : [];

const addressFromHere = (address: Record<string, unknown> | undefined): AddressParts => {
  if (address === undefined) {
    return {};
  }

  const street = compactString(address['street']);
  const addressNumber = splitAddressNumber(address['houseNumber']);
  const line1 = joinParts(street, address['houseNumber']);
  const line2 = firstString(address['district'], address['subdistrict']);
  const city = firstString(address['city'], address['county']);
  const region = firstString(address['state'], address['stateCode']);
  const postalCode = compactString(address['postalCode']);
  const countryCode = toCountryCode(compactString(address['countryCode']));
  const parts: AddressParts = {};

  if (line1 !== undefined) {
    parts.line1 = line1;
  }
  if (street !== undefined) {
    parts.street = street;
  }
  if (addressNumber.houseNumber !== undefined) {
    parts.houseNumber = addressNumber.houseNumber;
  }
  if (addressNumber.orientationNumber !== undefined) {
    parts.orientationNumber = addressNumber.orientationNumber;
  }
  if (line2 !== undefined) {
    parts.line2 = line2;
  }
  if (city !== undefined) {
    parts.city = city;
  }
  if (region !== undefined) {
    parts.region = region;
  }
  if (postalCode !== undefined) {
    parts.postalCode = postalCode;
  }
  if (countryCode !== undefined) {
    parts.countryCode = countryCode;
  }

  return parts;
};

const metadataFromHere = (item: Record<string, unknown>) => {
  const metadata: Record<string, string | number | boolean | null> = {};
  const position = readOptionalRecord(item['position']);
  const scoring = readOptionalRecord(item['scoring']);

  readMetadataNumber(metadata, 'latitude', position?.['lat']);
  readMetadataNumber(metadata, 'longitude', position?.['lng']);
  readMetadataNumber(metadata, 'distance', item['distance']);
  readMetadataNumber(metadata, 'queryScore', scoring?.['queryScore']);
  readMetadataString(metadata, 'resultType', item['resultType']);

  const categories = readArray(item['categories']);
  const primaryCategory =
    categories.find((category) => category['primary'] === true) ?? categories[0];

  readMetadataString(metadata, 'categoryId', primaryCategory?.['id']);
  readMetadataString(metadata, 'categoryName', primaryCategory?.['name']);

  return metadataOrUndefined(metadata);
};

const toHereSuggestion = (
  item: Record<string, unknown>,
  index: number,
  request: SmartSuggestRequest,
  attribution: SuggestionAttribution,
): SmartSuggestSuggestion | undefined => {
  const address = readOptionalRecord(item['address']);
  const displayLabel = firstString(address?.['label'], item['title']);
  const sourceId = compactString(item['id']);

  if (displayLabel === undefined) {
    return;
  }

  const queryScore = compactNumber(readOptionalRecord(item['scoring'])?.['queryScore']);

  const suggestion: SmartSuggestSuggestion = {
    address: addressFromHere(address),
    attribution,
    confidence: queryScore ?? 0.76,
    displayLabel,
    id: `here-discover:${sourceId ?? index}`,
    kind: request.kind,
    source: {
      attribution,
      id: 'here-discover',
      kind: 'live-provider',
      name: 'HERE Discover',
    },
  };
  const metadata = metadataFromHere(item);

  if (metadata !== undefined) {
    suggestion.metadata = metadata;
  }

  return suggestion;
};

const toHereUrl = (
  baseUrl: string,
  apiKey: string,
  request: SmartSuggestRequest,
  options: Pick<HereDiscoverProviderOptions, 'at' | 'inArea' | 'language' | 'limit'>,
) => {
  const params = new URLSearchParams();
  params.set('q', request.query);
  params.set('apiKey', apiKey);
  params.set('limit', String(normalizeSuggestLimit(request.limit ?? options.limit)));

  const language = request.language ?? options.language;
  const inArea = toHereCountryArea(request.countryCode) ?? options.inArea;
  const at = toCoordinateString(options.at);

  if (language !== undefined) {
    params.set('lang', language);
  }
  if (inArea !== undefined) {
    params.set('in', inArea);
  }
  if (at !== undefined) {
    params.set('at', at);
  }

  return `${baseUrl.replaceAll(/\/+$/g, '')}/v1/discover?${params.toString()}`;
};

export const createHereDiscoverProvider = (
  options: HereDiscoverProviderOptions,
): SmartSuggestProvider => {
  const fetchImpl = options.fetch ?? defaultFetch;
  const attribution = options.attribution ?? hereAttribution;
  const baseUrl = options.baseUrl ?? 'https://discover.search.hereapi.com';

  return {
    cachePolicy: liveProviderCachePolicy,
    id: 'here-discover',
    name: 'HERE Discover',
    supportedKinds: ['address', 'place'],
    suggest: async (request, context) => {
      const requestInit: RequestInit = {
        headers: { accept: 'application/json' },
        method: 'GET',
      };

      if (context.signal !== undefined) {
        requestInit.signal = context.signal;
      }

      const response = await fetchImpl(
        toHereUrl(baseUrl, options.apiKey, request, options),
        requestInit,
      );
      const body = await readJson(response, 'here-discover');
      const suggestions = readHereItems(body)
        .map((item, index) => toHereSuggestion(item, index, request, attribution))
        .filter((suggestion) => suggestion !== undefined);

      return {
        attribution,
        cachePolicy: liveProviderCachePolicy,
        suggestions,
      };
    },
  };
};

const readNominatimResults = (body: unknown) => readArray(body);

const addressFromNominatim = (address: Record<string, unknown> | undefined): AddressParts => {
  if (address === undefined) {
    return {};
  }

  const street = compactString(address['road']);
  const addressNumber = splitAddressNumber(address['house_number']);
  const line1 = joinParts(street, address['house_number']) ?? street;
  const line2 = firstString(address['neighbourhood'], address['suburb']);
  const city = firstString(
    address['city'],
    address['town'],
    address['village'],
    address['hamlet'],
    address['municipality'],
    address['county'],
  );
  const region = firstString(
    address['state'],
    address['state_district'],
    address['region'],
    address['province'],
    address['county'],
  );
  const postalCode = compactString(address['postcode']);
  const countryCode = toCountryCode(compactString(address['country_code']));
  const parts: AddressParts = {};

  if (line1 !== undefined) {
    parts.line1 = line1;
  }
  if (street !== undefined) {
    parts.street = street;
  }
  if (addressNumber.houseNumber !== undefined) {
    parts.houseNumber = addressNumber.houseNumber;
  }
  if (addressNumber.orientationNumber !== undefined) {
    parts.orientationNumber = addressNumber.orientationNumber;
  }
  if (line2 !== undefined) {
    parts.line2 = line2;
  }
  if (city !== undefined) {
    parts.city = city;
  }
  if (region !== undefined) {
    parts.region = region;
  }
  if (postalCode !== undefined) {
    parts.postalCode = postalCode;
  }
  if (countryCode !== undefined) {
    parts.countryCode = countryCode;
  }

  return parts;
};

const metadataFromNominatim = (result: Record<string, unknown>) => {
  const metadata: Record<string, string | number | boolean | null> = {};

  readMetadataString(metadata, 'latitude', result['lat']);
  readMetadataString(metadata, 'longitude', result['lon']);
  readMetadataString(metadata, 'osmType', result['osm_type']);
  readMetadataString(metadata, 'osmId', result['osm_id']);
  readMetadataString(metadata, 'placeId', result['place_id']);
  readMetadataString(metadata, 'category', result['class']);
  readMetadataString(metadata, 'type', result['type']);

  return metadataOrUndefined(metadata);
};

const toNominatimSuggestion = (
  result: Record<string, unknown>,
  index: number,
  request: SmartSuggestRequest,
  attribution: SuggestionAttribution,
): SmartSuggestSuggestion | undefined => {
  const displayLabel = compactString(result['display_name']);
  const placeId =
    compactString(result['place_id']) ?? compactNumber(result['place_id'])?.toString();

  if (displayLabel === undefined) {
    return;
  }

  const suggestion: SmartSuggestSuggestion = {
    address: addressFromNominatim(readOptionalRecord(result['address'])),
    attribution,
    confidence: compactNumber(result['importance']) ?? 0.62,
    displayLabel,
    id: `nominatim:${placeId ?? index}`,
    kind: request.kind,
    source: {
      attribution,
      id: 'nominatim',
      kind: 'live-provider',
      name: 'Nominatim',
    },
  };
  const metadata = metadataFromNominatim(result);

  if (metadata !== undefined) {
    suggestion.metadata = metadata;
  }

  return suggestion;
};

const hasAddressNumberSignal = (address: AddressParts) =>
  address.houseNumber !== undefined || /\d/u.test(address.line1 ?? '');

const isCompleteAddressSuggestion = (suggestion: SmartSuggestSuggestion) =>
  suggestion.address !== undefined &&
  hasAddressNumberSignal(suggestion.address) &&
  (suggestion.address.street !== undefined || suggestion.address.line1 !== undefined);

const toNominatimUrl = (
  baseUrl: string,
  request: SmartSuggestRequest,
  options: Pick<NominatimProviderOptions, 'email' | 'limit'>,
) => {
  const params = new URLSearchParams();
  params.set('q', request.query);
  params.set('format', 'jsonv2');
  params.set('addressdetails', '1');
  params.set('limit', String(normalizeSuggestLimit(request.limit ?? options.limit)));

  if (request.countryCode !== undefined && request.countryCode.length === 2) {
    params.set('countrycodes', request.countryCode.toLowerCase());
  }
  if (options.email !== undefined) {
    params.set('email', options.email);
  }

  return `${baseUrl.replaceAll(/\/+$/g, '')}/search?${params.toString()}`;
};

export const createNominatimProvider = (
  options: NominatimProviderOptions,
): SmartSuggestProvider => {
  const fetchImpl = options.fetch ?? defaultFetch;
  const attribution = options.attribution ?? nominatimAttribution;
  const baseUrl = options.baseUrl ?? 'https://nominatim.openstreetmap.org';

  return {
    cachePolicy: liveProviderCachePolicy,
    id: 'nominatim',
    name: 'Nominatim',
    supportedKinds: ['address', 'place'],
    suggest: async (request, context) => {
      const headers: Record<string, string> = {
        accept: 'application/json',
        'user-agent': options.userAgent,
      };

      if (options.referer !== undefined) {
        headers['referer'] = options.referer;
      }
      if (request.language !== undefined) {
        headers['accept-language'] = request.language;
      }

      const requestInit: RequestInit = {
        headers,
        method: 'GET',
      };

      if (context.signal !== undefined) {
        requestInit.signal = context.signal;
      }

      const response = await fetchImpl(toNominatimUrl(baseUrl, request, options), requestInit);
      const body = await readJson(response, 'nominatim');
      const suggestions = readNominatimResults(body)
        .map((result, index) => toNominatimSuggestion(result, index, request, attribution))
        .filter((suggestion) => suggestion !== undefined)
        .filter((suggestion) => request.kind !== 'address' || isCompleteAddressSuggestion(suggestion));

      return {
        attribution,
        cachePolicy: liveProviderCachePolicy,
        suggestions,
      };
    },
  };
};

export const createSmartSuggestProviderRegistryFromConfig = (
  config: SmartSuggestProviderRuntimeConfig,
) => {
  const providers: SmartSuggestProvider[] = [];

  if (config.ruianGeocode !== undefined) {
    providers.push(createRuianGeocodeProvider(config.ruianGeocode));
  }
  if (config.mapyCz !== undefined) {
    providers.push(createMapyCzProvider(config.mapyCz));
  }
  if (config.radarAutocomplete !== undefined) {
    providers.push(createRadarAutocompleteProvider(config.radarAutocomplete));
  }
  if (config.hereDiscover !== undefined) {
    providers.push(createHereDiscoverProvider(config.hereDiscover));
  }
  if (config.nominatim !== undefined) {
    providers.push(createNominatimProvider(config.nominatim));
  }

  const registryOptions: SmartSuggestProviderRegistryOptions = { providers };

  if (config.circuitBreaker !== undefined) {
    registryOptions.circuitBreaker = config.circuitBreaker;
  }

  if (config.now !== undefined) {
    registryOptions.now = config.now;
  }

  if (config.onProviderEvent !== undefined) {
    registryOptions.onProviderEvent = config.onProviderEvent;
  }

  if (config.priority !== undefined) {
    registryOptions.priority = config.priority;
  }

  if (config.timeoutMs !== undefined) {
    registryOptions.timeoutMs = config.timeoutMs;
  }

  return createSmartSuggestProviderRegistry(registryOptions);
};

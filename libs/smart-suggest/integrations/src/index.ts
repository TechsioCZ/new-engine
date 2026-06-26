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
} from "@techsio/smart-suggest-core"

export type SmartSuggestProviderFetch = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>

export type SmartSuggestCircuitBreakerConfig = {
  failureThreshold: number
  openMs: number
}

export type SmartSuggestProviderRegistryOptions = {
  circuitBreaker?: SmartSuggestCircuitBreakerConfig
  now?: () => number
  onProviderEvent?: (event: ProviderEventSummary) => void
  priority?: readonly string[]
  providers: readonly SmartSuggestProvider[]
  timeoutMs?: number
}

export type SmartSuggestProviderRegistrySuggestContext = {
  requestId?: string
  signal?: AbortSignal
}

export type SmartSuggestProviderRegistryResult = {
  provider?: SmartSuggestProvider
  providerEvents: readonly ProviderEventSummary[]
  response: SmartSuggestResponse
}

export type SmartSuggestProviderRegistry = {
  suggest: (
    request: SmartSuggestRequest,
    context?: SmartSuggestProviderRegistrySuggestContext
  ) => Promise<SmartSuggestProviderRegistryResult>
}

export class SmartSuggestProviderTimeoutError extends Error {
  readonly providerId: string

  constructor(providerId: string) {
    super(`Smart Suggest provider "${providerId}" timed out.`)
    this.name = "SmartSuggestProviderTimeoutError"
    this.providerId = providerId
  }
}

export class SmartSuggestProviderHttpError extends Error {
  readonly providerId: string
  readonly status: number

  constructor(providerId: string, status: number) {
    super(`Smart Suggest provider "${providerId}" failed with ${status}.`)
    this.name = "SmartSuggestProviderHttpError"
    this.providerId = providerId
    this.status = status
  }
}

type CircuitState = {
  failureCount: number
  openedUntil?: number
}

type ProviderRunSuccess = {
  event: ProviderEventSummary
  result: SmartSuggestProviderResult
  status: "success"
}

type ProviderRunFailure = {
  event: ProviderEventSummary
  status: "failure"
}

type ProviderRunResult = ProviderRunFailure | ProviderRunSuccess

type ProviderRunOptions = {
  context: Required<
    Pick<SmartSuggestProviderRegistrySuggestContext, "requestId">
  > &
    Pick<SmartSuggestProviderRegistrySuggestContext, "signal">
  now: () => number
  provider: SmartSuggestProvider
  request: SmartSuggestRequest
  timeoutMs: number
}

const defaultCircuitBreaker: SmartSuggestCircuitBreakerConfig = {
  failureThreshold: 2,
  openMs: 30_000,
}

const liveProviderCachePolicy: ProviderCachePolicy = { kind: "none" }

const defaultFetch: SmartSuggestProviderFetch = (input, init) =>
  fetch(input, init)

const createRequestId = () =>
  globalThis.crypto?.randomUUID?.() ?? `smart-suggest-${Date.now()}`

const toCacheStatus = (cachePolicy: ProviderCachePolicy) =>
  cachePolicy.kind === "none" ? "disabled" : "miss"

const createProviderEvent = (
  providerId: string,
  status: ProviderEventSummary["status"],
  latencyMs: number,
  errorCode?: SmartSuggestErrorCode
) => {
  const event: ProviderEventSummary = {
    latencyMs: Math.max(0, Math.round(latencyMs)),
    providerId,
    status,
  }

  if (errorCode !== undefined) {
    event.errorCode = errorCode
  }

  return event
}

const sortProviders = (
  providers: readonly SmartSuggestProvider[],
  priority: readonly string[] | undefined,
  request: SmartSuggestRequest
) => {
  const supportedProviders = providers.filter((provider) =>
    provider.supportedKinds.includes(request.kind)
  )

  if (priority === undefined || priority.length === 0) {
    return supportedProviders
  }

  const priorityIndexes = new Map(
    priority.map((providerId, index) => [providerId, index])
  )

  return supportedProviders.toSorted((left, right) => {
    const leftIndex = priorityIndexes.get(left.id) ?? Number.MAX_SAFE_INTEGER
    const rightIndex = priorityIndexes.get(right.id) ?? Number.MAX_SAFE_INTEGER
    return leftIndex - rightIndex || left.id.localeCompare(right.id)
  })
}

const readCircuitState = (
  states: Map<string, CircuitState>,
  providerId: string
) => {
  const existingState = states.get(providerId)

  if (existingState !== undefined) {
    return existingState
  }

  const initialState: CircuitState = { failureCount: 0 }
  states.set(providerId, initialState)
  return initialState
}

const markProviderSuccess = (
  states: Map<string, CircuitState>,
  providerId: string
) => {
  states.set(providerId, { failureCount: 0 })
}

const markProviderFailure = (
  states: Map<string, CircuitState>,
  providerId: string,
  circuitBreaker: SmartSuggestCircuitBreakerConfig,
  now: () => number
) => {
  const state = readCircuitState(states, providerId)
  const failureCount = state.failureCount + 1
  const nextState: CircuitState = { failureCount }

  if (failureCount >= circuitBreaker.failureThreshold) {
    nextState.openedUntil = now() + circuitBreaker.openMs
  }

  states.set(providerId, nextState)
}

const isCircuitOpen = (
  states: Map<string, CircuitState>,
  providerId: string,
  now: () => number
) => {
  const openedUntil = readCircuitState(states, providerId).openedUntil
  return openedUntil !== undefined && openedUntil > now()
}

const createTimeoutSignal = (
  providerId: string,
  parentSignal: AbortSignal | undefined,
  timeoutMs: number
) => {
  const controller = new AbortController()
  const timeoutError = new SmartSuggestProviderTimeoutError(providerId)
  const timeout = setTimeout(() => {
    controller.abort(timeoutError)
  }, timeoutMs)
  const abortFromParent = () => {
    controller.abort(parentSignal?.reason)
  }

  if (parentSignal?.aborted === true) {
    abortFromParent()
  } else {
    parentSignal?.addEventListener("abort", abortFromParent, { once: true })
  }

  return {
    cleanup: () => {
      clearTimeout(timeout)
      parentSignal?.removeEventListener("abort", abortFromParent)
    },
    signal: controller.signal,
    timeoutError,
  }
}

const isTimeoutError = (error: unknown) =>
  error instanceof SmartSuggestProviderTimeoutError ||
  (error instanceof DOMException && error.name === "TimeoutError")

const runProvider = async (
  options: ProviderRunOptions
): Promise<ProviderRunResult> => {
  const { context, now, provider, request, timeoutMs } = options
  const startedAt = now()
  const timeoutSignal = createTimeoutSignal(
    provider.id,
    context.signal,
    timeoutMs
  )
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutSignal.signal.addEventListener(
      "abort",
      () => {
        if (timeoutSignal.signal.reason === timeoutSignal.timeoutError) {
          reject(timeoutSignal.timeoutError)
        }
      },
      { once: true }
    )
  })

  try {
    const result = await Promise.race([
      provider.suggest(request, {
        cachePolicy: provider.cachePolicy,
        requestId: context.requestId,
        signal: timeoutSignal.signal,
      }),
      timeoutPromise,
    ])

    return {
      event: createProviderEvent(provider.id, "success", now() - startedAt),
      result,
      status: "success",
    }
  } catch (error) {
    const errorCode: SmartSuggestErrorCode = isTimeoutError(error)
      ? "provider-timeout"
      : "provider-unavailable"

    return {
      event: createProviderEvent(
        provider.id,
        isTimeoutError(error) ? "timeout" : "error",
        now() - startedAt,
        errorCode
      ),
      status: "failure",
    }
  } finally {
    timeoutSignal.cleanup()
  }
}

const toProviderResponse = (
  requestId: string,
  result: SmartSuggestProviderResult,
  providerEvents: readonly ProviderEventSummary[]
): SmartSuggestResponse => ({
  cacheStatus: toCacheStatus(result.cachePolicy),
  providerEvents: [...providerEvents],
  requestId,
  suggestions: result.suggestions.map((suggestion) => ({
    ...suggestion,
    cacheStatus: toCacheStatus(result.cachePolicy),
  })),
})

export const createSmartSuggestProviderRegistry = (
  options: SmartSuggestProviderRegistryOptions
): SmartSuggestProviderRegistry => {
  const circuitBreaker = options.circuitBreaker ?? defaultCircuitBreaker
  const now = options.now ?? Date.now
  const states = new Map<string, CircuitState>()

  const emitEvent = (
    events: ProviderEventSummary[],
    event: ProviderEventSummary
  ) => {
    events.push(event)
    options.onProviderEvent?.(event)
  }

  return {
    suggest: async (request, context = {}) => {
      const requestId = context.requestId ?? createRequestId()
      const providerEvents: ProviderEventSummary[] = []

      for (const provider of sortProviders(
        options.providers,
        options.priority,
        request
      )) {
        if (isCircuitOpen(states, provider.id, now)) {
          emitEvent(
            providerEvents,
            createProviderEvent(
              provider.id,
              "skipped",
              0,
              "provider-unavailable"
            )
          )
          continue
        }

        const providerResult = await runProvider({
          context: { requestId, signal: context.signal },
          now,
          provider,
          request,
          timeoutMs: options.timeoutMs ?? 1500,
        })
        emitEvent(providerEvents, providerResult.event)

        if (providerResult.status === "success") {
          markProviderSuccess(states, provider.id)

          return {
            provider,
            providerEvents,
            response: toProviderResponse(
              requestId,
              providerResult.result,
              providerEvents
            ),
          }
        }

        markProviderFailure(states, provider.id, circuitBreaker, now)
      }

      return {
        providerEvents,
        response: {
          cacheStatus: "disabled",
          providerEvents,
          requestId,
          suggestions: [],
        },
      }
    },
  }
}

export type MapyCzProviderOptions = {
  apiKey: string
  attribution?: SuggestionAttribution
  endpointUrl?: string
  fetch?: SmartSuggestProviderFetch
  language?: string
  limit?: number
}

export type SmartSuggestProviderRuntimeConfig = {
  circuitBreaker?: SmartSuggestCircuitBreakerConfig
  mapyCz?: MapyCzProviderOptions
  now?: () => number
  onProviderEvent?: (event: ProviderEventSummary) => void
  priority?: readonly string[]
  timeoutMs?: number
}

type MapyRegionalEntry = {
  isoCode?: unknown
  name?: unknown
  type?: unknown
}

type MapySuggestionEntity = {
  id?: unknown
  label?: unknown
  location?: unknown
  name?: unknown
  position?: unknown
  regionalStructure?: unknown
  type?: unknown
  zip?: unknown
}

const mapyAttribution: SuggestionAttribution = {
  label: "Mapy.cz",
  url: "https://developer.mapy.com/",
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)

const optionalString = (value: unknown) =>
  typeof value === "string" && value.trim() !== "" ? value : undefined

const optionalNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined

const readMapyEntities = (body: unknown): readonly MapySuggestionEntity[] => {
  if (Array.isArray(body)) {
    return body.filter(isRecord)
  }

  if (!isRecord(body)) {
    return []
  }

  const candidates = [body.items, body.results, body.suggestions, body.data]
  const firstArray = candidates.find(Array.isArray)
  return firstArray?.filter(isRecord) ?? []
}

const readRegionalStructure = (
  entity: MapySuggestionEntity
): readonly MapyRegionalEntry[] =>
  Array.isArray(entity.regionalStructure)
    ? entity.regionalStructure.filter(isRecord)
    : []

const findRegionalName = (
  regionalStructure: readonly MapyRegionalEntry[],
  type: string
) =>
  optionalString(regionalStructure.find((entry) => entry.type === type)?.name)

const findRegionalIsoCode = (regionalStructure: readonly MapyRegionalEntry[]) =>
  toCountryCode(
    optionalString(
      regionalStructure.find((entry) => entry.isoCode !== undefined)?.isoCode
    )
  )

const toCountryCode = (value: string | undefined) => {
  const normalized = value?.trim().toUpperCase()
  return normalized === "" || normalized === undefined
    ? undefined
    : (normalized as SmartSuggestCountryCode)
}

const readPositionMetadata = (position: unknown) => {
  if (!isRecord(position)) {
    return {}
  }

  const latitude = optionalNumber(position.lat)
  const longitude = optionalNumber(position.lon ?? position.lng)

  return {
    ...(latitude === undefined ? {} : { latitude }),
    ...(longitude === undefined ? {} : { longitude }),
  }
}

const toMapyAddressParts = (
  entity: MapySuggestionEntity,
  request: SmartSuggestRequest
): AddressParts => {
  const regionalStructure = readRegionalStructure(entity)
  const city =
    findRegionalName(regionalStructure, "municipality") ??
    findRegionalName(regionalStructure, "municipality_part")
  const countryCode =
    findRegionalIsoCode(regionalStructure) ?? request.countryCode
  const address: AddressParts = {
    city,
    countryCode,
    line1: optionalString(entity.name) ?? optionalString(entity.label),
    postalCode: optionalString(entity.zip),
    region: findRegionalName(regionalStructure, "regional_region"),
  }

  return Object.fromEntries(
    Object.entries(address).filter(([, value]) => value !== undefined)
  ) as AddressParts
}

const toDisplayLabel = (entity: MapySuggestionEntity, address: AddressParts) =>
  [
    optionalString(entity.label) ?? optionalString(entity.name),
    address.postalCode,
    address.city,
    address.countryCode,
  ]
    .filter((value) => value !== undefined && value.trim() !== "")
    .join(", ")

const toMapySuggestion = (
  entity: MapySuggestionEntity,
  index: number,
  request: SmartSuggestRequest,
  attribution: SuggestionAttribution
): SmartSuggestSuggestion | undefined => {
  const address = toMapyAddressParts(entity, request)
  const displayLabel = toDisplayLabel(entity, address)

  if (displayLabel === "") {
    return
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
      id: "mapy-cz",
      kind: "live-provider",
      name: "Mapy.cz",
    },
  }
}

const toMapyUrl = (
  endpointUrl: string,
  apiKey: string,
  request: SmartSuggestRequest,
  options: Pick<MapyCzProviderOptions, "language" | "limit">
) => {
  const params = new URLSearchParams()
  params.set("apikey", apiKey)
  params.set("query", request.query)
  params.set("lang", request.language ?? options.language ?? "cs")
  params.set(
    "limit",
    String(normalizeSuggestLimit(request.limit ?? options.limit))
  )
  params.set(
    "type",
    request.kind === "address" ? "regional.address" : "regional"
  )

  if (request.countryCode !== undefined) {
    params.set("locality", request.countryCode.toLowerCase())
  }

  return `${endpointUrl}?${params.toString()}`
}

export const createMapyCzProvider = (
  options: MapyCzProviderOptions
): SmartSuggestProvider => {
  const fetchImpl = options.fetch ?? defaultFetch
  const endpointUrl = options.endpointUrl ?? "https://api.mapy.com/v1/suggest"
  const attribution = options.attribution ?? mapyAttribution

  return {
    cachePolicy: liveProviderCachePolicy,
    id: "mapy-cz",
    name: "Mapy.cz",
    supportedKinds: ["address", "place"],
    suggest: async (request, context) => {
      const response = await fetchImpl(
        toMapyUrl(endpointUrl, options.apiKey, request, options),
        {
          headers: { accept: "application/json" },
          method: "GET",
          signal: context.signal,
        }
      )

      if (!response.ok) {
        throw new SmartSuggestProviderHttpError("mapy-cz", response.status)
      }

      const body = (await response.json()) as unknown
      const suggestions = readMapyEntities(body)
        .map((entity, index) =>
          toMapySuggestion(entity, index, request, attribution)
        )
        .filter((suggestion) => suggestion !== undefined)

      return {
        attribution,
        cachePolicy: liveProviderCachePolicy,
        suggestions,
      }
    },
  }
}

export const createSmartSuggestProviderRegistryFromConfig = (
  config: SmartSuggestProviderRuntimeConfig
) => {
  const providers: SmartSuggestProvider[] = []

  if (config.mapyCz !== undefined) {
    providers.push(createMapyCzProvider(config.mapyCz))
  }

  return createSmartSuggestProviderRegistry({
    circuitBreaker: config.circuitBreaker,
    now: config.now,
    onProviderEvent: config.onProviderEvent,
    priority: config.priority,
    providers,
    timeoutMs: config.timeoutMs,
  })
}

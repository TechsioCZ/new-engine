export type SmartSuggestKind = "address" | "place" | "postal"

export type SmartSuggestCacheStatus =
  | "disabled"
  | "hit"
  | "miss"
  | "stale"
  | "written"

export type ProviderCachePolicy =
  | {
      kind: "none"
    }
  | {
      kind: "ttl"
      ttlSeconds: number
    }
  | {
      kind: "permanent"
    }

export type SmartSuggestCountryCode = Uppercase<string>

export type SmartSuggestTenantContext = {
  tenantId?: string
  salesChannelId?: string
  cartId?: string
  sessionId?: string
}

export type SmartSuggestRequest = {
  query: string
  kind: SmartSuggestKind
  countryCode?: SmartSuggestCountryCode
  language?: string
  limit?: number
  tenant?: SmartSuggestTenantContext
}

export type AddressParts = {
  countryCode?: SmartSuggestCountryCode
  region?: string
  city?: string
  district?: string
  street?: string
  houseNumber?: string
  orientationNumber?: string
  postalCode?: string
  line1?: string
  line2?: string
}

export type SuggestionSourceKind = "owned-dataset" | "live-provider" | "cache"

export type SuggestionAttribution = {
  label: string
  url?: string
  license?: string
}

export type SuggestionSource = {
  id: string
  kind: SuggestionSourceKind
  name: string
  datasetVersion?: string
  attribution?: SuggestionAttribution
}

export type SmartSuggestSuggestion = {
  id: string
  kind: SmartSuggestKind
  displayLabel: string
  searchLabel?: string
  address?: AddressParts
  source: SuggestionSource
  confidence: number
  cacheStatus?: SmartSuggestCacheStatus
  attribution?: SuggestionAttribution
  metadata?: Record<string, string | number | boolean | null>
}

export type SmartSuggestResponse = {
  requestId: string
  suggestions: SmartSuggestSuggestion[]
  cacheStatus: SmartSuggestCacheStatus
  providerEvents?: ProviderEventSummary[]
}

export type SmartSuggestAcceptEvent = {
  requestId: string
  suggestionId: string
  acceptedAt: string
  tenant?: SmartSuggestTenantContext
  source: SuggestionSource
}

export type SmartSuggestErrorCode =
  | "bad-request"
  | "validation-error"
  | "provider-timeout"
  | "provider-unavailable"
  | "cache-policy-violation"
  | "storage-unavailable"
  | "not-found"
  | "internal-error"

export type SmartSuggestError = {
  code: SmartSuggestErrorCode
  message: string
  field?: string
  retryable?: boolean
}

export type ProviderEventSummary = {
  providerId: string
  status: "success" | "timeout" | "error" | "skipped"
  latencyMs?: number
  errorCode?: SmartSuggestErrorCode
}

export type SmartSuggestProviderContext = {
  requestId: string
  signal?: AbortSignal
  cachePolicy: ProviderCachePolicy
}

export type SmartSuggestProviderResult = {
  suggestions: SmartSuggestSuggestion[]
  cachePolicy: ProviderCachePolicy
  attribution?: SuggestionAttribution
}

export type SmartSuggestProvider = {
  id: string
  name: string
  supportedKinds: readonly SmartSuggestKind[]
  cachePolicy: ProviderCachePolicy
  suggest: (
    request: SmartSuggestRequest,
    context: SmartSuggestProviderContext
  ) => Promise<SmartSuggestProviderResult>
}

export type RankingInput = {
  request: SmartSuggestRequest
  candidates: readonly SmartSuggestSuggestion[]
}

export type RankingOutput = {
  suggestions: SmartSuggestSuggestion[]
  diagnostics?: readonly RankingDiagnostic[]
}

export type RankingDiagnostic = {
  suggestionId: string
  score: number
  reasons: readonly string[]
}

export const isSerializableSuggestion = (
  suggestion: SmartSuggestSuggestion
) => {
  try {
    JSON.stringify(suggestion)
    return true
  } catch {
    return false
  }
}

export const normalizeSuggestLimit = (limit: number | undefined) => {
  if (limit === undefined) {
    return 10
  }

  if (!Number.isFinite(limit)) {
    return 10
  }

  return Math.min(Math.max(Math.trunc(limit), 1), 20)
}

export const cachePolicyAllowsPersistentWrite = (policy: ProviderCachePolicy) =>
  policy.kind !== "none"

import { Schema } from "effect";
import type * as Effect from "effect/Effect";

export type SmartSuggestKind = "address" | "place" | "postal";

export type SmartSuggestCacheStatus = "disabled" | "hit" | "miss" | "stale" | "written";

export type SmartSuggestCacheLevelName =
  | "browserMemory"
  | "workerMemory"
  | "edgeCache"
  | "d1ReadThrough"
  | "ownedDb";

export type SmartSuggestCacheLevel = {
  enabled: boolean;
  status: SmartSuggestCacheStatus;
};

export type SmartSuggestCacheLevels = Record<SmartSuggestCacheLevelName, SmartSuggestCacheLevel>;

export type ProviderCachePolicy =
  | {
      kind: "none";
    }
  | {
      kind: "ttl";
      ttlSeconds: number;
    }
  | {
      kind: "permanent";
    };

export type SmartSuggestCountryCode = Uppercase<string>;

export type SmartSuggestCountryCodeListParseErrorReason = "empty-allowlist" | "malformed-token";

export type SmartSuggestCountryCodeListParseResult =
  | {
      ok: true;
      countryCodes: readonly SmartSuggestCountryCode[];
    }
  | {
      ok: false;
      invalidTokens: readonly string[];
      reason: SmartSuggestCountryCodeListParseErrorReason;
    };

export type SmartSuggestCountryScopeStatus = "allowlist" | "blocked" | "global" | "single";

export type SmartSuggestCountryScopeBlockReason =
  | "empty-allowlist"
  | "selected-country-not-allowed";

export type SmartSuggestCountryScope = {
  countryCode?: SmartSuggestCountryCode | undefined;
  countryCodes?: readonly SmartSuggestCountryCode[] | undefined;
  reason?: SmartSuggestCountryScopeBlockReason | undefined;
  status: SmartSuggestCountryScopeStatus;
};

export type SmartSuggestTenantContext = {
  tenantId?: string;
  salesChannelId?: string;
  cartId?: string;
  sessionId?: string;
};

export type SmartSuggestRequest = {
  query: string;
  kind: SmartSuggestKind;
  countryCode?: SmartSuggestCountryCode;
  countryCodes?: readonly SmartSuggestCountryCode[];
  countryScope?: SmartSuggestCountryScope;
  language?: string;
  limit?: number;
  tenant?: SmartSuggestTenantContext;
};

export type AddressParts = {
  countryCode?: SmartSuggestCountryCode;
  region?: string;
  city?: string;
  district?: string;
  street?: string;
  houseNumber?: string;
  orientationNumber?: string;
  postalCode?: string;
  line1?: string;
  line2?: string;
};

export type SuggestionSourceKind = "owned-dataset" | "live-provider" | "cache";

export type SuggestionAttribution = {
  label: string;
  url?: string;
  license?: string;
};

export type SuggestionSource = {
  id: string;
  kind: SuggestionSourceKind;
  name: string;
  datasetVersion?: string;
  attribution?: SuggestionAttribution;
};

export type SmartSuggestSuggestion = {
  id: string;
  kind: SmartSuggestKind;
  displayLabel: string;
  searchLabel?: string;
  address?: AddressParts;
  source: SuggestionSource;
  confidence: number;
  cacheStatus?: SmartSuggestCacheStatus;
  attribution?: SuggestionAttribution;
  metadata?: Record<string, string | number | boolean | null>;
};

export type SmartSuggestResponse = {
  requestId: string;
  suggestions: SmartSuggestSuggestion[];
  cacheStatus: SmartSuggestCacheStatus;
  cacheLevels?: SmartSuggestCacheLevels;
  countryScope?: SmartSuggestCountryScope;
  providerEvents?: ProviderEventSummary[];
};

export type SmartSuggestAcceptEvent = {
  requestId: string;
  suggestionId: string;
  acceptedAt: string;
  tenant?: SmartSuggestTenantContext;
  source: SuggestionSource;
};

export type SmartSuggestErrorCode =
  | "bad-request"
  | "validation-error"
  | "unauthorized"
  | "forbidden"
  | "rate-limit"
  | "provider-timeout"
  | "provider-unavailable"
  | "cache-policy-violation"
  | "storage-unavailable"
  | "not-found"
  | "internal-error";

export type SmartSuggestError = {
  code: SmartSuggestErrorCode;
  message: string;
  field?: string;
  retryable?: boolean;
};

export type ProviderEventSummary = {
  providerId: string;
  status: "success" | "timeout" | "error" | "skipped";
  latencyMs?: number;
  errorCode?: SmartSuggestErrorCode;
};

export type SmartSuggestProviderContext = {
  requestId: string;
  signal?: AbortSignal;
  cachePolicy: ProviderCachePolicy;
};

export type SmartSuggestProviderResult = {
  suggestions: SmartSuggestSuggestion[];
  cachePolicy: ProviderCachePolicy;
  attribution?: SuggestionAttribution;
};

const ProviderErrorBaseSchema = Schema.Struct({
  message: Schema.String,
  providerId: Schema.String,
});

export const ProviderErrorCauseSchema = Schema.Struct({
  message: Schema.String,
  name: Schema.optionalKey(Schema.String),
});

export type ProviderErrorCause = typeof ProviderErrorCauseSchema.Type;

export class ProviderTimeout extends Schema.TaggedErrorClass<ProviderTimeout>()(
  "ProviderTimeout",
  ProviderErrorBaseSchema,
) {}

export class ProviderHttpStatus extends Schema.TaggedErrorClass<ProviderHttpStatus>()(
  "ProviderHttpStatus",
  Schema.Struct({
    message: Schema.String,
    providerId: Schema.String,
    status: Schema.Number,
  }),
) {}

export class ProviderNetwork extends Schema.TaggedErrorClass<ProviderNetwork>()(
  "ProviderNetwork",
  Schema.Struct({
    cause: Schema.optionalKey(ProviderErrorCauseSchema),
    message: Schema.String,
    providerId: Schema.String,
  }),
) {}

export class ProviderDecode extends Schema.TaggedErrorClass<ProviderDecode>()(
  "ProviderDecode",
  Schema.Struct({
    cause: Schema.optionalKey(ProviderErrorCauseSchema),
    message: Schema.String,
    providerId: Schema.String,
  }),
) {}

export class ProviderAborted extends Schema.TaggedErrorClass<ProviderAborted>()(
  "ProviderAborted",
  Schema.Struct({
    cause: Schema.optionalKey(ProviderErrorCauseSchema),
    message: Schema.String,
    providerId: Schema.String,
  }),
) {}

export type SmartSuggestProviderError =
  | ProviderAborted
  | ProviderDecode
  | ProviderHttpStatus
  | ProviderNetwork
  | ProviderTimeout;

export type SmartSuggestProvider = {
  id: string;
  name: string;
  supportedKinds: readonly SmartSuggestKind[];
  cachePolicy: ProviderCachePolicy;
  suggest: (
    request: SmartSuggestRequest,
    context: SmartSuggestProviderContext,
  ) => Effect.Effect<SmartSuggestProviderResult, SmartSuggestProviderError, never>;
};

export type RankingInput = {
  request: SmartSuggestRequest;
  candidates: readonly SmartSuggestSuggestion[];
};

export type RankingOutput = {
  suggestions: SmartSuggestSuggestion[];
  diagnostics?: readonly RankingDiagnostic[];
};

export type RankingDiagnostic = {
  suggestionId: string;
  score: number;
  reasons: readonly string[];
};

export const isSerializableSuggestion = (suggestion: SmartSuggestSuggestion) => {
  try {
    JSON.stringify(suggestion);
    return true;
  } catch {
    return false;
  }
};

const smartSuggestCountryCodePattern = /^[A-Z]{2,3}$/u;

const alpha2ByAlpha3: Record<string, SmartSuggestCountryCode> = {
  AUT: "AT" as SmartSuggestCountryCode,
  CZE: "CZ" as SmartSuggestCountryCode,
  DEU: "DE" as SmartSuggestCountryCode,
  ESP: "ES" as SmartSuggestCountryCode,
  FRA: "FR" as SmartSuggestCountryCode,
  GBR: "GB" as SmartSuggestCountryCode,
  HUN: "HU" as SmartSuggestCountryCode,
  ITA: "IT" as SmartSuggestCountryCode,
  POL: "PL" as SmartSuggestCountryCode,
  SVK: "SK" as SmartSuggestCountryCode,
  USA: "US" as SmartSuggestCountryCode,
};

export const normalizeSmartSuggestCountryCode = (
  value: string | undefined,
): SmartSuggestCountryCode | undefined => {
  const normalizedCountryCode = value?.trim().toUpperCase();

  if (
    normalizedCountryCode === undefined ||
    normalizedCountryCode === "" ||
    !smartSuggestCountryCodePattern.test(normalizedCountryCode)
  ) {
    return;
  }

  return (
    alpha2ByAlpha3[normalizedCountryCode] ?? (normalizedCountryCode as SmartSuggestCountryCode)
  );
};

export const canonicalizeSmartSuggestCountryCodes = (
  countryCodes: readonly (SmartSuggestCountryCode | undefined)[] | undefined,
): readonly SmartSuggestCountryCode[] =>
  [
    ...new Set(
      (countryCodes ?? [])
        .map((countryCode) => normalizeSmartSuggestCountryCode(countryCode))
        .filter((countryCode): countryCode is SmartSuggestCountryCode => countryCode !== undefined),
    ),
  ].toSorted();

export const parseSmartSuggestCountryCodeList = (
  value: string | undefined,
): SmartSuggestCountryCodeListParseResult => {
  if (value === undefined) {
    return { countryCodes: [], ok: true };
  }

  const tokens = value.split(",");
  const trimmedTokens = tokens.map((token) => token.trim());
  const hasNonEmptyToken = trimmedTokens.some((token) => token !== "");

  if (!hasNonEmptyToken) {
    return { countryCodes: [], ok: true };
  }

  if (trimmedTokens.some((token) => token === "")) {
    return {
      invalidTokens: [""],
      ok: false,
      reason: "malformed-token",
    };
  }

  const invalidTokens = trimmedTokens.filter(
    (token) => normalizeSmartSuggestCountryCode(token) === undefined,
  );

  if (invalidTokens.length > 0) {
    return {
      invalidTokens,
      ok: false,
      reason: "malformed-token",
    };
  }

  return {
    countryCodes: canonicalizeSmartSuggestCountryCodes(
      trimmedTokens.map((token) => normalizeSmartSuggestCountryCode(token)),
    ),
    ok: true,
  };
};

export const resolveSmartSuggestCountryScope = ({
  countryCode,
  countryCodes,
}: {
  countryCode?: SmartSuggestCountryCode;
  countryCodes?: readonly SmartSuggestCountryCode[];
}): SmartSuggestCountryScope => {
  const selectedCountryCode = normalizeSmartSuggestCountryCode(countryCode);
  const canonicalCountryCodes = canonicalizeSmartSuggestCountryCodes(countryCodes);

  if (countryCodes !== undefined && canonicalCountryCodes.length === 0) {
    return {
      countryCode: selectedCountryCode,
      countryCodes: [],
      reason: "empty-allowlist",
      status: "blocked",
    };
  }

  if (
    selectedCountryCode !== undefined &&
    canonicalCountryCodes.length > 0 &&
    !canonicalCountryCodes.includes(selectedCountryCode)
  ) {
    return {
      countryCode: selectedCountryCode,
      countryCodes: canonicalCountryCodes,
      reason: "selected-country-not-allowed",
      status: "blocked",
    };
  }

  if (selectedCountryCode !== undefined) {
    return {
      countryCode: selectedCountryCode,
      countryCodes:
        canonicalCountryCodes.length > 0 ? canonicalCountryCodes : [selectedCountryCode],
      status: "single",
    };
  }

  if (canonicalCountryCodes.length === 1) {
    const [singleCountryCode] = canonicalCountryCodes;

    return {
      countryCode: singleCountryCode,
      countryCodes: canonicalCountryCodes,
      status: "single",
    };
  }

  if (canonicalCountryCodes.length > 1) {
    return {
      countryCodes: canonicalCountryCodes,
      status: "allowlist",
    };
  }

  return { status: "global" };
};

export const smartSuggestCountryScopeIdentity = ({
  countryCode,
  countryCodes,
}: {
  countryCode?: SmartSuggestCountryCode;
  countryCodes?: readonly SmartSuggestCountryCode[];
}) => {
  const selectedCountryCode = normalizeSmartSuggestCountryCode(countryCode);
  const canonicalCountryCodes = canonicalizeSmartSuggestCountryCodes(countryCodes);

  if (canonicalCountryCodes.length > 0) {
    return [
      selectedCountryCode === undefined ? "any" : selectedCountryCode,
      canonicalCountryCodes.join(","),
    ].join("|");
  }

  return selectedCountryCode ?? "global";
};

export const normalizeSuggestLimit = (limit: number | undefined) => {
  if (limit === undefined) {
    return 10;
  }

  if (Number.isNaN(limit)) {
    return 10;
  }

  return Math.min(Math.max(Math.trunc(limit), 1), 20);
};

export const cachePolicyAllowsPersistentWrite = (policy: ProviderCachePolicy) =>
  policy.kind !== "none";

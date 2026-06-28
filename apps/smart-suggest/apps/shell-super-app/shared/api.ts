import { Schema } from 'effect';
import { HttpApi, HttpApiEndpoint, HttpApiGroup } from 'effect/unstable/httpapi';
import {
  SmartSuggestBadRequestError as InternalSmartSuggestBadRequestError,
  SmartSuggestBadRequestErrorSchema as InternalSmartSuggestBadRequestErrorSchema,
} from './smart-suggest-api-errors/bad-request';
import {
  SmartSuggestCachePolicyViolationError as InternalSmartSuggestCachePolicyViolationError,
  SmartSuggestCachePolicyViolationErrorSchema as InternalSmartSuggestCachePolicyViolationErrorSchema,
} from './smart-suggest-api-errors/cache-policy-violation';
import {
  SmartSuggestInternalError as InternalSmartSuggestInternalError,
  SmartSuggestInternalErrorSchema as InternalSmartSuggestInternalErrorSchema,
} from './smart-suggest-api-errors/internal-error';
import {
  SmartSuggestNotFoundError as InternalSmartSuggestNotFoundError,
  SmartSuggestNotFoundErrorSchema as InternalSmartSuggestNotFoundErrorSchema,
} from './smart-suggest-api-errors/not-found';
import {
  SmartSuggestBadRequestErrorBodySchema as InternalSmartSuggestBadRequestErrorBodySchema,
  SmartSuggestBadRequestErrorPayloadSchema as InternalSmartSuggestBadRequestErrorPayloadSchema,
  SmartSuggestCachePolicyViolationErrorBodySchema as InternalSmartSuggestCachePolicyViolationErrorBodySchema,
  SmartSuggestCachePolicyViolationErrorPayloadSchema as InternalSmartSuggestCachePolicyViolationErrorPayloadSchema,
  SmartSuggestErrorBodySchema as InternalSmartSuggestErrorBodySchema,
  SmartSuggestErrorCodeSchema as InternalSmartSuggestErrorCodeSchema,
  SmartSuggestErrorFieldSchema as InternalSmartSuggestErrorFieldSchema,
  SmartSuggestErrorMessageSchema as InternalSmartSuggestErrorMessageSchema,
  SmartSuggestErrorPayloadSchema as InternalSmartSuggestErrorPayloadSchema,
  SmartSuggestInternalErrorBodySchema as InternalSmartSuggestInternalErrorBodySchema,
  SmartSuggestInternalErrorPayloadSchema as InternalSmartSuggestInternalErrorPayloadSchema,
  SmartSuggestNotFoundErrorBodySchema as InternalSmartSuggestNotFoundErrorBodySchema,
  SmartSuggestNotFoundErrorPayloadSchema as InternalSmartSuggestNotFoundErrorPayloadSchema,
  SmartSuggestProviderTimeoutErrorBodySchema as InternalSmartSuggestProviderTimeoutErrorBodySchema,
  SmartSuggestProviderTimeoutErrorPayloadSchema as InternalSmartSuggestProviderTimeoutErrorPayloadSchema,
  SmartSuggestProviderUnavailableErrorBodySchema as InternalSmartSuggestProviderUnavailableErrorBodySchema,
  SmartSuggestProviderUnavailableErrorPayloadSchema as InternalSmartSuggestProviderUnavailableErrorPayloadSchema,
  SmartSuggestStorageUnavailableErrorBodySchema as InternalSmartSuggestStorageUnavailableErrorBodySchema,
  SmartSuggestStorageUnavailableErrorPayloadSchema as InternalSmartSuggestStorageUnavailableErrorPayloadSchema,
  SmartSuggestValidationErrorBodySchema as InternalSmartSuggestValidationErrorBodySchema,
  SmartSuggestValidationErrorPayloadSchema as InternalSmartSuggestValidationErrorPayloadSchema,
} from './smart-suggest-api-errors/payloads';
import {
  SmartSuggestProviderTimeoutError as InternalSmartSuggestProviderTimeoutError,
  SmartSuggestProviderTimeoutErrorSchema as InternalSmartSuggestProviderTimeoutErrorSchema,
} from './smart-suggest-api-errors/provider-timeout';
import {
  SmartSuggestProviderUnavailableError as InternalSmartSuggestProviderUnavailableError,
  SmartSuggestProviderUnavailableErrorSchema as InternalSmartSuggestProviderUnavailableErrorSchema,
} from './smart-suggest-api-errors/provider-unavailable';
import {
  SmartSuggestStorageUnavailableError as InternalSmartSuggestStorageUnavailableError,
  SmartSuggestStorageUnavailableErrorSchema as InternalSmartSuggestStorageUnavailableErrorSchema,
} from './smart-suggest-api-errors/storage-unavailable';
import {
  SmartSuggestValidationError as InternalSmartSuggestValidationError,
  SmartSuggestValidationErrorSchema as InternalSmartSuggestValidationErrorSchema,
} from './smart-suggest-api-errors/validation-error';

export const SmartSuggestBadRequestError = InternalSmartSuggestBadRequestError;
export const SmartSuggestBadRequestErrorBodySchema = InternalSmartSuggestBadRequestErrorBodySchema;
export const SmartSuggestBadRequestErrorPayloadSchema =
  InternalSmartSuggestBadRequestErrorPayloadSchema;
export const SmartSuggestBadRequestErrorSchema = InternalSmartSuggestBadRequestErrorSchema;

export const SmartSuggestCachePolicyViolationError = InternalSmartSuggestCachePolicyViolationError;
export const SmartSuggestCachePolicyViolationErrorBodySchema =
  InternalSmartSuggestCachePolicyViolationErrorBodySchema;
export const SmartSuggestCachePolicyViolationErrorPayloadSchema =
  InternalSmartSuggestCachePolicyViolationErrorPayloadSchema;
export const SmartSuggestCachePolicyViolationErrorSchema =
  InternalSmartSuggestCachePolicyViolationErrorSchema;

export const SmartSuggestErrorBodySchema = InternalSmartSuggestErrorBodySchema;
export const SmartSuggestErrorCodeSchema = InternalSmartSuggestErrorCodeSchema;
export const SmartSuggestErrorFieldSchema = InternalSmartSuggestErrorFieldSchema;
export const SmartSuggestErrorMessageSchema = InternalSmartSuggestErrorMessageSchema;
export const SmartSuggestErrorPayloadSchema = InternalSmartSuggestErrorPayloadSchema;

export const SmartSuggestInternalError = InternalSmartSuggestInternalError;
export const SmartSuggestInternalErrorBodySchema = InternalSmartSuggestInternalErrorBodySchema;
export const SmartSuggestInternalErrorPayloadSchema =
  InternalSmartSuggestInternalErrorPayloadSchema;
export const SmartSuggestInternalErrorSchema = InternalSmartSuggestInternalErrorSchema;

export const SmartSuggestNotFoundError = InternalSmartSuggestNotFoundError;
export const SmartSuggestNotFoundErrorBodySchema = InternalSmartSuggestNotFoundErrorBodySchema;
export const SmartSuggestNotFoundErrorPayloadSchema =
  InternalSmartSuggestNotFoundErrorPayloadSchema;
export const SmartSuggestNotFoundErrorSchema = InternalSmartSuggestNotFoundErrorSchema;

export const SmartSuggestProviderTimeoutError = InternalSmartSuggestProviderTimeoutError;
export const SmartSuggestProviderTimeoutErrorBodySchema =
  InternalSmartSuggestProviderTimeoutErrorBodySchema;
export const SmartSuggestProviderTimeoutErrorPayloadSchema =
  InternalSmartSuggestProviderTimeoutErrorPayloadSchema;
export const SmartSuggestProviderTimeoutErrorSchema =
  InternalSmartSuggestProviderTimeoutErrorSchema;

export const SmartSuggestProviderUnavailableError = InternalSmartSuggestProviderUnavailableError;
export const SmartSuggestProviderUnavailableErrorBodySchema =
  InternalSmartSuggestProviderUnavailableErrorBodySchema;
export const SmartSuggestProviderUnavailableErrorPayloadSchema =
  InternalSmartSuggestProviderUnavailableErrorPayloadSchema;
export const SmartSuggestProviderUnavailableErrorSchema =
  InternalSmartSuggestProviderUnavailableErrorSchema;

export const SmartSuggestStorageUnavailableError = InternalSmartSuggestStorageUnavailableError;
export const SmartSuggestStorageUnavailableErrorBodySchema =
  InternalSmartSuggestStorageUnavailableErrorBodySchema;
export const SmartSuggestStorageUnavailableErrorPayloadSchema =
  InternalSmartSuggestStorageUnavailableErrorPayloadSchema;
export const SmartSuggestStorageUnavailableErrorSchema =
  InternalSmartSuggestStorageUnavailableErrorSchema;

export const SmartSuggestValidationError = InternalSmartSuggestValidationError;
export const SmartSuggestValidationErrorBodySchema = InternalSmartSuggestValidationErrorBodySchema;
export const SmartSuggestValidationErrorPayloadSchema =
  InternalSmartSuggestValidationErrorPayloadSchema;
export const SmartSuggestValidationErrorSchema = InternalSmartSuggestValidationErrorSchema;

export type SmartSuggestBadRequestError = InstanceType<typeof SmartSuggestBadRequestError>;
export type SmartSuggestCachePolicyViolationError = InstanceType<
  typeof SmartSuggestCachePolicyViolationError
>;
export type SmartSuggestInternalError = InstanceType<typeof SmartSuggestInternalError>;
export type SmartSuggestNotFoundError = InstanceType<typeof SmartSuggestNotFoundError>;
export type SmartSuggestProviderTimeoutError = InstanceType<
  typeof SmartSuggestProviderTimeoutError
>;
export type SmartSuggestProviderUnavailableError = InstanceType<
  typeof SmartSuggestProviderUnavailableError
>;
export type SmartSuggestStorageUnavailableError = InstanceType<
  typeof SmartSuggestStorageUnavailableError
>;
export type SmartSuggestValidationError = InstanceType<typeof SmartSuggestValidationError>;

export const SmartSuggestEndpointErrors = [
  SmartSuggestBadRequestErrorSchema,
  SmartSuggestValidationErrorSchema,
  SmartSuggestProviderTimeoutErrorSchema,
  SmartSuggestProviderUnavailableErrorSchema,
  SmartSuggestCachePolicyViolationErrorSchema,
  SmartSuggestStorageUnavailableErrorSchema,
  SmartSuggestNotFoundErrorSchema,
  SmartSuggestInternalErrorSchema,
] as const;

const smartSuggestCountryCodePattern = /^[A-Z]{2,3}$/u;
const smartSuggestIsoDateTimePattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/u;
const smartSuggestIsoDatePattern = /^\d{4}-\d{2}-\d{2}$/u;

const nonBlankString = (fieldName: string) =>
  Schema.makeFilter<string>((value) =>
    value.trim().length > 0 ? undefined : `Expected a non-blank ${fieldName}.`,
  );

const integerFilter = (fieldName: string) =>
  Schema.makeFilter<number>((value) =>
    Number.isInteger(value) ? undefined : `Expected an integer ${fieldName}.`,
  );

export const SmartSuggestNonBlankStringSchema = Schema.String.check(nonBlankString('string'));

export const SmartSuggestIdSchema = Schema.String.check(
  nonBlankString('identifier'),
  Schema.isMaxLength(256),
);

export const SmartSuggestShortTextSchema = Schema.String.check(
  nonBlankString('text'),
  Schema.isMaxLength(512),
);

export const SmartSuggestLongTextSchema = Schema.String.check(
  nonBlankString('text'),
  Schema.isMaxLength(2048),
);

export const SmartSuggestOptionalTextSchema = Schema.String.check(Schema.isMaxLength(2048));

export const SmartSuggestIsoDateTimeStringSchema = Schema.String.check(
  Schema.isPattern(smartSuggestIsoDateTimePattern),
);

export const SmartSuggestIsoDateStringSchema = Schema.String.check(
  Schema.isPattern(smartSuggestIsoDatePattern),
);

export const SmartSuggestNonNegativeNumberSchema = Schema.Finite.check(
  Schema.isGreaterThanOrEqualTo(0),
);

export const SmartSuggestNonNegativeIntSchema = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0));

export const SmartSuggestKindSchema = Schema.Literals(['address', 'place', 'postal']);

export const SmartSuggestCacheStatusSchema = Schema.Literals([
  'disabled',
  'hit',
  'miss',
  'stale',
  'written',
]);

export const SmartSuggestCacheLevelNameSchema = Schema.Literals([
  'browserMemory',
  'workerMemory',
  'edgeCache',
  'd1ReadThrough',
  'ownedDb',
]);

export const SuggestionSourceKindSchema = Schema.Literals([
  'owned-dataset',
  'live-provider',
  'cache',
]);

export const ProviderEventStatusSchema = Schema.Literals([
  'success',
  'timeout',
  'error',
  'skipped',
]);

export const PostalValidationStatusSchema = Schema.Union([
  Schema.Boolean,
  Schema.Literal('unknown'),
]);

export const PhoneNumberTypeSchema = Schema.Literals([
  'PREMIUM_RATE',
  'TOLL_FREE',
  'SHARED_COST',
  'VOIP',
  'PERSONAL_NUMBER',
  'PAGER',
  'UAN',
  'VOICEMAIL',
  'FIXED_LINE_OR_MOBILE',
  'FIXED_LINE',
  'MOBILE',
]);

const isSmartSuggestCountryCode = (value: string): value is Uppercase<string> =>
  smartSuggestCountryCodePattern.test(value);

export const SmartSuggestCountryCodeSchema = Schema.String.pipe(
  Schema.check(Schema.isPattern(smartSuggestCountryCodePattern)),
  Schema.refine(isSmartSuggestCountryCode, {
    identifier: 'SmartSuggestCountryCode',
    message: 'Expected an uppercase ISO alpha-2 or alpha-3 country code.',
  }),
);

export const SmartSuggestMetadataValueSchema = Schema.Union([
  Schema.String,
  Schema.Finite,
  Schema.Boolean,
  Schema.Null,
]);

export const SmartSuggestMetadataSchema = Schema.Record(
  Schema.String,
  SmartSuggestMetadataValueSchema,
);

export const SmartSuggestTenantContextSchema = Schema.Struct({
  cartId: Schema.optionalKey(SmartSuggestIdSchema),
  salesChannelId: Schema.optionalKey(SmartSuggestIdSchema),
  sessionId: Schema.optionalKey(SmartSuggestIdSchema),
  tenantId: Schema.optionalKey(SmartSuggestIdSchema),
});

export const AddressPartsSchema = Schema.Struct({
  city: Schema.optionalKey(SmartSuggestOptionalTextSchema),
  countryCode: Schema.optionalKey(SmartSuggestCountryCodeSchema),
  district: Schema.optionalKey(SmartSuggestOptionalTextSchema),
  houseNumber: Schema.optionalKey(SmartSuggestOptionalTextSchema),
  line1: Schema.optionalKey(SmartSuggestOptionalTextSchema),
  line2: Schema.optionalKey(SmartSuggestOptionalTextSchema),
  orientationNumber: Schema.optionalKey(SmartSuggestOptionalTextSchema),
  postalCode: Schema.optionalKey(SmartSuggestOptionalTextSchema),
  region: Schema.optionalKey(SmartSuggestOptionalTextSchema),
  street: Schema.optionalKey(SmartSuggestOptionalTextSchema),
});

export const SuggestionAttributionSchema = Schema.Struct({
  label: SmartSuggestShortTextSchema,
  license: Schema.optionalKey(SmartSuggestOptionalTextSchema),
  url: Schema.optionalKey(SmartSuggestOptionalTextSchema),
});

export const SuggestionSourceSchema = Schema.Struct({
  attribution: Schema.optionalKey(SuggestionAttributionSchema),
  datasetVersion: Schema.optionalKey(SmartSuggestIdSchema),
  id: SmartSuggestIdSchema,
  kind: SuggestionSourceKindSchema,
  name: SmartSuggestShortTextSchema,
});

export const SmartSuggestSuggestionSchema = Schema.Struct({
  address: Schema.optionalKey(AddressPartsSchema),
  attribution: Schema.optionalKey(SuggestionAttributionSchema),
  cacheStatus: Schema.optionalKey(SmartSuggestCacheStatusSchema),
  confidence: Schema.Finite.check(Schema.isGreaterThanOrEqualTo(0), Schema.isLessThanOrEqualTo(1)),
  displayLabel: SmartSuggestLongTextSchema,
  id: SmartSuggestIdSchema,
  kind: SmartSuggestKindSchema,
  metadata: Schema.optionalKey(SmartSuggestMetadataSchema),
  searchLabel: Schema.optionalKey(SmartSuggestOptionalTextSchema),
  source: SuggestionSourceSchema,
});

export const SmartSuggestCacheLevelSchema = Schema.Struct({
  enabled: Schema.Boolean,
  status: SmartSuggestCacheStatusSchema,
});

export const SmartSuggestCacheLevelsSchema = Schema.Struct({
  browserMemory: SmartSuggestCacheLevelSchema,
  d1ReadThrough: SmartSuggestCacheLevelSchema,
  edgeCache: SmartSuggestCacheLevelSchema,
  ownedDb: SmartSuggestCacheLevelSchema,
  workerMemory: SmartSuggestCacheLevelSchema,
});

export const ProviderEventSummarySchema = Schema.Struct({
  errorCode: Schema.optionalKey(SmartSuggestErrorCodeSchema),
  latencyMs: Schema.optionalKey(SmartSuggestNonNegativeNumberSchema),
  providerId: SmartSuggestIdSchema,
  status: ProviderEventStatusSchema,
});

export const SmartSuggestResponseSchema = Schema.Struct({
  cacheLevels: Schema.optionalKey(SmartSuggestCacheLevelsSchema),
  cacheStatus: SmartSuggestCacheStatusSchema,
  providerEvents: Schema.optionalKey(Schema.mutable(Schema.Array(ProviderEventSummarySchema))),
  requestId: SmartSuggestIdSchema,
  suggestions: Schema.mutable(Schema.Array(SmartSuggestSuggestionSchema)),
});

export const SmartSuggestAcceptEventSchema = Schema.Struct({
  acceptedAt: Schema.optionalKey(SmartSuggestIsoDateTimeStringSchema),
  requestId: SmartSuggestIdSchema,
  source: SuggestionSourceSchema,
  suggestionId: SmartSuggestIdSchema,
  tenant: Schema.optionalKey(SmartSuggestTenantContextSchema),
});

export const SmartSuggestAcceptResponseSchema = Schema.Struct({
  accepted: Schema.Literal(true),
});

export const ValidationIssueSchema = Schema.Struct({
  code: SmartSuggestIdSchema,
  field: SmartSuggestIdSchema,
  message: SmartSuggestLongTextSchema,
});

export const PhoneValidationRequestSchema = Schema.Struct({
  allowedCountries: Schema.optionalKey(Schema.Array(SmartSuggestCountryCodeSchema)),
  defaultCountry: Schema.optionalKey(SmartSuggestCountryCodeSchema),
  rawInput: SmartSuggestOptionalTextSchema,
  requireCountryMatch: Schema.optionalKey(Schema.Boolean),
  requireMobile: Schema.optionalKey(Schema.Boolean),
});

export const PhoneValidationResultSchema = Schema.Struct({
  callingCode: Schema.optionalKey(SmartSuggestIdSchema),
  detectedCountry: Schema.optionalKey(SmartSuggestCountryCodeSchema),
  displayValue: SmartSuggestOptionalTextSchema,
  e164: Schema.optionalKey(SmartSuggestIdSchema),
  errors: Schema.mutable(Schema.Array(ValidationIssueSchema)),
  isPossible: Schema.Boolean,
  isValid: Schema.Boolean,
  nationalNumber: Schema.optionalKey(SmartSuggestIdSchema),
  rawInput: SmartSuggestOptionalTextSchema,
  type: Schema.optionalKey(PhoneNumberTypeSchema),
});

export const PostalInputHintsSchema = Schema.Struct({
  autoComplete: Schema.Literal('postal-code'),
  inputMode: Schema.Literals(['numeric', 'text']),
});

export const PostalValidationRequestSchema = Schema.Struct({
  countryCode: SmartSuggestCountryCodeSchema,
  rawInput: SmartSuggestOptionalTextSchema,
});

export const PostalValidationResultSchema = Schema.Struct({
  countryCode: SmartSuggestCountryCodeSchema,
  displayValue: SmartSuggestOptionalTextSchema,
  errors: Schema.mutable(Schema.Array(ValidationIssueSchema)),
  inputHints: PostalInputHintsSchema,
  isValid: PostalValidationStatusSchema,
  normalizedValue: SmartSuggestOptionalTextSchema,
  rawInput: SmartSuggestOptionalTextSchema,
});

export const SmartSuggestHealthStorageSchema = Schema.Struct({
  checkedAt: SmartSuggestIsoDateTimeStringSchema,
  error: Schema.optionalKey(SmartSuggestOptionalTextSchema),
  ok: Schema.Boolean,
});

export const SmartSuggestHealthResponseSchema = Schema.Struct({
  buildId: SmartSuggestIdSchema,
  db: SmartSuggestHealthStorageSchema,
  deployProfile: SmartSuggestIdSchema,
  environment: SmartSuggestIdSchema,
  service: Schema.Literal('smart-suggest'),
  timestamp: SmartSuggestIsoDateTimeStringSchema,
  version: SmartSuggestIdSchema,
});

export const SmartSuggestStatusImportKindSchema = Schema.Literals(['baseline', 'delta', 'manual']);

export const SmartSuggestStatusImportRunStatusSchema = Schema.Literals([
  'completed',
  'failed',
  'running',
]);

export const SmartSuggestStatusImportRunSummarySchema = Schema.Struct({
  atomEntryId: Schema.optionalKey(SmartSuggestIdSchema),
  checksumSha256: Schema.optionalKey(SmartSuggestIdSchema),
  completedAt: Schema.optionalKey(SmartSuggestIsoDateTimeStringSchema),
  errorSummary: Schema.optionalKey(SmartSuggestOptionalTextSchema),
  failedRows: SmartSuggestNonNegativeIntSchema,
  id: SmartSuggestIdSchema,
  importKind: Schema.optionalKey(SmartSuggestStatusImportKindSchema),
  insertedRows: SmartSuggestNonNegativeIntSchema,
  shardCountryCode: SmartSuggestCountryCodeSchema,
  skippedRows: SmartSuggestNonNegativeIntSchema,
  sourceFeedId: Schema.optionalKey(SmartSuggestIdSchema),
  sourceGeneratedAt: Schema.optionalKey(SmartSuggestIsoDateTimeStringSchema),
  sourceId: SmartSuggestIdSchema,
  sourceUri: Schema.optionalKey(SmartSuggestOptionalTextSchema),
  sourceValidAt: Schema.optionalKey(
    Schema.Union([SmartSuggestIsoDateStringSchema, SmartSuggestIsoDateTimeStringSchema]),
  ),
  sourceVersion: Schema.optionalKey(SmartSuggestIdSchema),
  startedAt: SmartSuggestIsoDateTimeStringSchema,
  status: SmartSuggestStatusImportRunStatusSchema,
  tombstonedRows: SmartSuggestNonNegativeIntSchema,
  totalRows: SmartSuggestNonNegativeIntSchema,
  upsertedRows: SmartSuggestNonNegativeIntSchema,
});

export const SmartSuggestStatusFreshnessRunSchema = Schema.Struct({
  completedAt: Schema.optionalKey(SmartSuggestIsoDateTimeStringSchema),
  failedRows: SmartSuggestNonNegativeIntSchema,
  runId: SmartSuggestIdSchema,
  sourceFeedId: Schema.optionalKey(SmartSuggestIdSchema),
  sourceValidAt: Schema.optionalKey(
    Schema.Union([SmartSuggestIsoDateStringSchema, SmartSuggestIsoDateTimeStringSchema]),
  ),
  sourceVersion: Schema.optionalKey(SmartSuggestIdSchema),
  status: Schema.Literal('completed'),
  tombstonedRows: SmartSuggestNonNegativeIntSchema,
  totalRows: SmartSuggestNonNegativeIntSchema,
  upsertedRows: SmartSuggestNonNegativeIntSchema,
});

export const SmartSuggestStatusRowCountsSchema = Schema.Struct({
  failedRows: SmartSuggestNonNegativeIntSchema,
  skippedRows: SmartSuggestNonNegativeIntSchema,
  tombstonedRows: SmartSuggestNonNegativeIntSchema,
  totalRows: SmartSuggestNonNegativeIntSchema,
  upsertedRows: SmartSuggestNonNegativeIntSchema,
});

export const SmartSuggestStatusFreshnessSlaSchema = Schema.Struct({
  ageHours: Schema.optionalKey(SmartSuggestNonNegativeNumberSchema),
  maxDeltaAgeHours: SmartSuggestNonNegativeNumberSchema,
  measuredAt: SmartSuggestIsoDateTimeStringSchema,
  status: Schema.Literals(['fresh', 'stale', 'unknown']),
});

export const SmartSuggestStatusImportsSchema = Schema.Struct({
  freshness: Schema.Struct({
    latestBaseline: Schema.optionalKey(SmartSuggestStatusFreshnessRunSchema),
    latestDelta: Schema.optionalKey(SmartSuggestStatusFreshnessRunSchema),
    rowCounts: SmartSuggestStatusRowCountsSchema,
    sla: SmartSuggestStatusFreshnessSlaSchema,
  }),
  recentRuns: Schema.mutable(Schema.Array(SmartSuggestStatusImportRunSummarySchema)),
});

export const SmartSuggestStatusMetricsSchema = Schema.Struct({
  accept: Schema.Struct({
    total: SmartSuggestNonNegativeIntSchema,
  }),
  providerEvents: Schema.Struct({
    error: SmartSuggestNonNegativeIntSchema,
    skipped: SmartSuggestNonNegativeIntSchema,
    success: SmartSuggestNonNegativeIntSchema,
    timeout: SmartSuggestNonNegativeIntSchema,
  }),
  suggest: Schema.Struct({
    averageLatencyMs: SmartSuggestNonNegativeNumberSchema,
    cacheHitRate: SmartSuggestNonNegativeNumberSchema.check(Schema.isLessThanOrEqualTo(1)),
    cacheStatus: Schema.Struct({
      disabled: SmartSuggestNonNegativeIntSchema,
      hit: SmartSuggestNonNegativeIntSchema,
      miss: SmartSuggestNonNegativeIntSchema,
      stale: SmartSuggestNonNegativeIntSchema,
      written: SmartSuggestNonNegativeIntSchema,
    }),
    errors: SmartSuggestNonNegativeIntSchema,
    ownedSuccess: SmartSuggestNonNegativeIntSchema,
    providerFallback: SmartSuggestNonNegativeIntSchema,
    total: SmartSuggestNonNegativeIntSchema,
  }),
});

export const SmartSuggestShardStateSchema = Schema.Literals(['active', 'disabled', 'standby']);

export const SmartSuggestShardRegionKindSchema = Schema.Literals([
  'country',
  'municipality',
  'postal-prefix',
  'vusc',
]);

export const SmartSuggestStatusShardSummarySchema = Schema.Struct({
  bindingName: SmartSuggestIdSchema,
  countryCode: SmartSuggestCountryCodeSchema,
  estimatedSizeBytes: Schema.optionalKey(SmartSuggestNonNegativeIntSchema),
  importVersion: Schema.optionalKey(SmartSuggestIdSchema),
  lastImportCompletedAt: Schema.optionalKey(SmartSuggestIsoDateTimeStringSchema),
  regionCode: SmartSuggestIdSchema,
  regionKind: SmartSuggestShardRegionKindSchema,
  regionName: SmartSuggestShortTextSchema,
  rowCount: SmartSuggestNonNegativeIntSchema,
  shardId: SmartSuggestIdSchema,
  sourceFreshnessAt: Schema.optionalKey(
    Schema.Union([SmartSuggestIsoDateStringSchema, SmartSuggestIsoDateTimeStringSchema]),
  ),
  state: SmartSuggestShardStateSchema,
});

export const SmartSuggestStatusShardSizeGuardSchema = Schema.Struct({
  blockBytes: SmartSuggestNonNegativeIntSchema,
  status: Schema.Literals(['blocked', 'ok', 'warning']),
  warnBytes: SmartSuggestNonNegativeIntSchema,
});

export const SmartSuggestStatusShardsSchema = Schema.Struct({
  activeCount: SmartSuggestNonNegativeIntSchema,
  disabledCount: SmartSuggestNonNegativeIntSchema,
  maxEstimatedSizeBytes: SmartSuggestNonNegativeIntSchema,
  maxPhysicalShardEstimatedSizeBytes: SmartSuggestNonNegativeIntSchema,
  physicalShardCount: SmartSuggestNonNegativeIntSchema,
  rowCount: SmartSuggestNonNegativeIntSchema,
  shards: Schema.mutable(Schema.Array(SmartSuggestStatusShardSummarySchema)),
  sizeGuard: SmartSuggestStatusShardSizeGuardSchema,
  standbyCount: SmartSuggestNonNegativeIntSchema,
  totalCount: SmartSuggestNonNegativeIntSchema,
});

export const SmartSuggestStatusSourcePolicySchema = Schema.Struct({
  providerSources: Schema.Struct({
    durableRetentionAllowed: Schema.mutable(Schema.Array(SmartSuggestIdSchema)),
    noDurableRetention: Schema.mutable(Schema.Array(SmartSuggestIdSchema)),
    permanentCacheAllowed: Schema.mutable(Schema.Array(SmartSuggestIdSchema)),
    ttlCacheOnly: Schema.mutable(
      Schema.Array(
        Schema.Struct({
          maxTtlDays: SmartSuggestNonNegativeNumberSchema,
          sourceId: SmartSuggestIdSchema,
        }),
      ),
    ),
  }),
  rawQueryStorage: Schema.Literal('disabled'),
});

export const SmartSuggestStatusSourceProvenanceSchema = Schema.Struct({
  authoritativeSources: Schema.mutable(
    Schema.Array(
      Schema.Struct({
        attribution: Schema.optionalKey(SuggestionAttributionSchema),
        datasetVersion: Schema.optionalKey(SmartSuggestIdSchema),
        modificationNoteSha256Present: Schema.Boolean,
        present: Schema.Boolean,
        sourceId: SmartSuggestIdSchema,
        sourceKind: Schema.Union([SuggestionSourceKindSchema, Schema.Null]),
      }),
    ),
  ),
});

export const SmartSuggestStatusResponseSchema = Schema.Struct({
  db: Schema.NullOr(SmartSuggestHealthStorageSchema),
  imports: SmartSuggestStatusImportsSchema,
  metrics: SmartSuggestStatusMetricsSchema,
  service: Schema.Literal('smart-suggest'),
  shards: SmartSuggestStatusShardsSchema,
  sourcePolicy: SmartSuggestStatusSourcePolicySchema,
  sourceProvenance: SmartSuggestStatusSourceProvenanceSchema,
  timestamp: SmartSuggestIsoDateTimeStringSchema,
});

export const SmartSuggestLimitSchema = Schema.FiniteFromString.check(
  integerFilter('limit'),
  Schema.isGreaterThanOrEqualTo(1),
  Schema.isLessThanOrEqualTo(20),
);

export const SmartSuggestQueryTextSchema = Schema.String.check(
  nonBlankString('suggest query'),
  Schema.isMaxLength(512),
);

const SmartSuggestQueryStructSchema = Schema.Struct({
  cartId: Schema.optionalKey(SmartSuggestIdSchema),
  countryCode: Schema.optionalKey(SmartSuggestCountryCodeSchema),
  kind: SmartSuggestKindSchema,
  language: Schema.optionalKey(
    Schema.String.check(nonBlankString('language'), Schema.isMaxLength(16)),
  ),
  limit: Schema.optionalKey(SmartSuggestLimitSchema),
  q: Schema.optionalKey(SmartSuggestQueryTextSchema),
  query: Schema.optionalKey(SmartSuggestQueryTextSchema),
  salesChannelId: Schema.optionalKey(SmartSuggestIdSchema),
  sessionId: Schema.optionalKey(SmartSuggestIdSchema),
  tenantId: Schema.optionalKey(SmartSuggestIdSchema),
});

type SmartSuggestQueryStruct = typeof SmartSuggestQueryStructSchema.Type;

const requireConsistentSuggestQueryAlias = Schema.makeFilter<SmartSuggestQueryStruct>((query) => {
  const shortAlias = query.q?.trim();
  const longAlias = query.query?.trim();

  if (shortAlias === undefined && longAlias === undefined) {
    return [
      { issue: 'Expected q or query.', path: ['q'] },
      { issue: 'Expected q or query.', path: ['query'] },
    ];
  }

  if (shortAlias !== undefined && longAlias !== undefined && shortAlias !== longAlias) {
    return { issue: 'Expected query to match q.', path: ['query'] };
  }

  return true;
});

export const SmartSuggestQuerySchema = SmartSuggestQueryStructSchema.check(
  requireConsistentSuggestQueryAlias,
);

export const SmartSuggestApiGroup = HttpApiGroup.make('smartSuggest', {
  topLevel: true,
}).add(
  HttpApiEndpoint.get('getHealth', '/v1/health', {
    error: SmartSuggestEndpointErrors,
    success: SmartSuggestHealthResponseSchema,
  }),
  HttpApiEndpoint.get('getStatus', '/v1/status', {
    error: SmartSuggestEndpointErrors,
    success: SmartSuggestStatusResponseSchema,
  }),
  HttpApiEndpoint.get('suggest', '/v1/suggest', {
    error: SmartSuggestEndpointErrors,
    query: SmartSuggestQuerySchema,
    success: SmartSuggestResponseSchema,
  }),
  HttpApiEndpoint.post('accept', '/v1/accept', {
    error: SmartSuggestEndpointErrors,
    payload: SmartSuggestAcceptEventSchema,
    success: SmartSuggestAcceptResponseSchema,
  }),
  HttpApiEndpoint.post('validatePhone', '/v1/validate/phone', {
    error: SmartSuggestEndpointErrors,
    payload: PhoneValidationRequestSchema,
    success: PhoneValidationResultSchema,
  }),
  HttpApiEndpoint.post('validatePostal', '/v1/validate/postal', {
    error: SmartSuggestEndpointErrors,
    payload: PostalValidationRequestSchema,
    success: PostalValidationResultSchema,
  }),
);

export const SmartSuggestHttpApi = HttpApi.make('SmartSuggestHttpApi').add(SmartSuggestApiGroup);

export type SmartSuggestKind = typeof SmartSuggestKindSchema.Type;
export type SmartSuggestCacheStatus = typeof SmartSuggestCacheStatusSchema.Type;
export type SmartSuggestCacheLevelName = typeof SmartSuggestCacheLevelNameSchema.Type;
export type SmartSuggestErrorCode = typeof SmartSuggestErrorCodeSchema.Type;
export type SuggestionSourceKind = typeof SuggestionSourceKindSchema.Type;
export type ProviderEventStatus = typeof ProviderEventStatusSchema.Type;
export type PostalValidationStatus = typeof PostalValidationStatusSchema.Type;
export type PhoneNumberType = typeof PhoneNumberTypeSchema.Type;
export type SmartSuggestCountryCode = typeof SmartSuggestCountryCodeSchema.Type;
export type SmartSuggestMetadataValue = typeof SmartSuggestMetadataValueSchema.Type;
export type SmartSuggestMetadata = typeof SmartSuggestMetadataSchema.Type;
export type SmartSuggestTenantContext = typeof SmartSuggestTenantContextSchema.Type;
export type AddressParts = typeof AddressPartsSchema.Type;
export type SuggestionAttribution = typeof SuggestionAttributionSchema.Type;
export type SuggestionSource = typeof SuggestionSourceSchema.Type;
export type SmartSuggestSuggestion = typeof SmartSuggestSuggestionSchema.Type;
export type SmartSuggestCacheLevel = typeof SmartSuggestCacheLevelSchema.Type;
export type SmartSuggestCacheLevels = typeof SmartSuggestCacheLevelsSchema.Type;
export type ProviderEventSummary = typeof ProviderEventSummarySchema.Type;
export type SmartSuggestResponse = typeof SmartSuggestResponseSchema.Type;
export type SmartSuggestAcceptEvent = typeof SmartSuggestAcceptEventSchema.Type;
export type SmartSuggestAcceptResponse = typeof SmartSuggestAcceptResponseSchema.Type;
export type ValidationIssue = typeof ValidationIssueSchema.Type;
export type PhoneValidationRequest = typeof PhoneValidationRequestSchema.Type;
export type PhoneValidationResult = typeof PhoneValidationResultSchema.Type;
export type PostalInputHints = typeof PostalInputHintsSchema.Type;
export type PostalValidationRequest = typeof PostalValidationRequestSchema.Type;
export type PostalValidationResult = typeof PostalValidationResultSchema.Type;
export type SmartSuggestErrorPayload = typeof SmartSuggestErrorPayloadSchema.Type;
export type SmartSuggestErrorBody = typeof SmartSuggestErrorBodySchema.Type;
export type SmartSuggestHealthStorage = typeof SmartSuggestHealthStorageSchema.Type;
export type SmartSuggestHealthResponse = typeof SmartSuggestHealthResponseSchema.Type;
export type SmartSuggestStatusResponse = typeof SmartSuggestStatusResponseSchema.Type;
export type SmartSuggestQuery = typeof SmartSuggestQuerySchema.Type;

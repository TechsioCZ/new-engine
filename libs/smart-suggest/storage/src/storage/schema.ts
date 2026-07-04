import type { AddressParts, ProviderCachePolicy, SmartSuggestCacheStatus, SmartSuggestCountryCode, SmartSuggestErrorCode, SmartSuggestKind, SmartSuggestSuggestion, SmartSuggestTenantContext, SuggestionAttribution, SuggestionSourceKind } from "@techsio/smart-suggest-core";
import { canonicalizeSmartSuggestCountryCodes, normalizeSmartSuggestCountryCode, normalizeSuggestLimit, smartSuggestCountryScopeIdentity } from "@techsio/smart-suggest-core";
import { createPrefixTokens, extractPostalCodeCandidates, normalizeSearchText, rankAddressCandidates, tokenizeAddressText } from "@techsio/smart-suggest-indexing";
import { sql } from "drizzle-orm/sql";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { Effect, Schema } from "effect";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { readonly [key: string]: JsonValue };

export type StorageHealth = {
  ok: boolean;
  checkedAt: string;
  error?: string;
};

export type TenantRecord = {
  id: string;
  name: string;
  status: "active" | "disabled";
  allowedOrigins: readonly string[];
  providerPriority: readonly string[];
  countryConfig: Record<string, JsonValue>;
  createdAt: string;
  updatedAt: string;
};

export type ApiKeyRecord = {
  id: string;
  tenantId: string;
  keyHash: string;
  label: string;
  status: "active" | "revoked";
  createdAt: string;
  revokedAt?: string;
};

export type DataSourceRecord = {
  id: string;
  sourceKind: SuggestionSourceKind;
  name: string;
  countryCode: SmartSuggestCountryCode;
  region?: string;
  datasetVersion?: string;
  attribution: SuggestionAttribution;
  cachePolicy: ProviderCachePolicy;
  modificationNoteSha256?: string;
  createdAt: string;
  updatedAt: string;
};

export type ImportRunStatus = "completed" | "failed" | "running";

export type AddressImportKind = "baseline" | "delta" | "manual";

export type AddressReplicationStatus = "active" | "invalid" | "tombstoned";

export type SmartSuggestShardState = "active" | "disabled" | "standby";

export type SmartSuggestShardRegionKind = "country" | "municipality" | "postal-prefix" | "vusc";

export type ImportRunRecord = {
  id: string;
  sourceId: string;
  status: ImportRunStatus;
  shardCountryCode: SmartSuggestCountryCode;
  atomEntryId?: string;
  startedAt: string;
  completedAt?: string;
  checksumSha256?: string;
  importKind?: AddressImportKind;
  sourceFeedId?: string;
  sourceGeneratedAt?: string;
  sourceUri?: string;
  sourceValidAt?: string;
  sourceVersion?: string;
  totalRows: number;
  insertedRows: number;
  skippedRows: number;
  tombstonedRows: number;
  upsertedRows: number;
  failedRows: number;
  errorSummary?: string;
};

export type SmartSuggestShardMetadataRecord = {
  shardId: string;
  countryCode: SmartSuggestCountryCode;
  regionKind: SmartSuggestShardRegionKind;
  regionCode: string;
  regionName: string;
  postalPrefixes: readonly string[];
  municipalityCodes: readonly string[];
  municipalityHints: readonly string[];
  bindingName: string;
  importVersion?: string;
  state: SmartSuggestShardState;
  rowCount: number;
  estimatedSizeBytes?: number;
  sourceFreshnessAt?: string;
  lastImportCompletedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type SmartSuggestShardMetadataUpsertInput = {
  shardId: string;
  countryCode: SmartSuggestCountryCode;
  regionKind: SmartSuggestShardRegionKind;
  regionCode: string;
  regionName: string;
  postalPrefixes?: readonly string[];
  municipalityCodes?: readonly string[];
  municipalityHints?: readonly string[];
  bindingName: string;
  importVersion?: string;
  state: SmartSuggestShardState;
  rowCount?: number;
  estimatedSizeBytes?: number;
  sourceFreshnessAt?: string;
  lastImportCompletedAt?: string;
};

export type SmartSuggestShardMetadataListInput = {
  countryCode?: SmartSuggestCountryCode;
  state?: SmartSuggestShardState;
};

export type SmartSuggestShardMetadataResolveInput = {
  countryCode: SmartSuggestCountryCode;
  regionCode?: string;
  postalCode?: string;
  municipalityCode?: string;
  municipalityHint?: string;
  states?: readonly SmartSuggestShardState[];
};

export type AddressRecordRuianIdentifiers = {
  addressPlaceCode: string;
  stableAddressId?: string;
  buildingObjectCode?: string;
  districtCode?: string;
  municipalityCode?: string;
  municipalityDistrictCode?: string;
  municipalityPartCode?: string;
  postalCode?: string;
  regionCode?: string;
  streetCode?: string;
};

export type AddressRecordSourceLineage = {
  sourceId: string;
  sourceRowId: string;
  atomEntryId?: string;
  checksumSha256?: string;
  datasetVersion?: string;
  fileKind?: string;
  feedId?: string;
  lastImportRunId?: string;
  previousAtomEntryId?: string;
  sourceGeneratedAt?: string;
  sourceRecordId?: string;
  sourceRecordType?: string;
  sourceUri?: string;
  sourceValidAt?: string;
  sourceVersion?: string;
  snapshotUri?: string;
};

export type AddressRecordVisibility = {
  searchVisible: boolean;
  replicationStatus: AddressReplicationStatus;
  changeProposalGlobalId?: string;
  invalid?: boolean;
  reason?: string;
  sourceStatus?: string;
  transactionId?: string;
  validFrom?: string;
  validTo?: string;
};

export type AddressRecordRanking = {
  addressCount?: number;
};

export type AddressRecord = {
  id: string;
  sourceId: string;
  countryCode: SmartSuggestCountryCode;
  parts: AddressParts;
  displayLabel: string;
  searchLabel: string;
  quality: number;
  replicationStatus: AddressReplicationStatus;
  searchVisible: boolean;
  latitude?: number;
  longitude?: number;
  attribution?: SuggestionAttribution;
  ruian?: AddressRecordRuianIdentifiers;
  sourceLineage?: AddressRecordSourceLineage;
  visibility?: AddressRecordVisibility;
  ranking?: AddressRecordRanking;
  createdAt: string;
  updatedAt: string;
};

export type AddressSearchRecordInput = Omit<
  AddressRecord,
  "createdAt" | "replicationStatus" | "searchVisible" | "updatedAt"
> & {
  replicationStatus?: AddressReplicationStatus;
  searchVisible?: boolean;
};

export type AddressTombstoneRecord = {
  id: string;
  sourceId: string;
  countryCode: SmartSuggestCountryCode;
  deletedAt?: string;
  reason?: string;
  ruian?: AddressRecordRuianIdentifiers;
  sourceLineage?: AddressRecordSourceLineage;
  createdAt: string;
  updatedAt: string;
};

export type AddressTombstoneRecordInput = Omit<AddressTombstoneRecord, "createdAt" | "updatedAt">;

export type AddressRecordFromSuggestionInput = {
  countryCode: SmartSuggestCountryCode;
  sourceId: string;
  suggestion: SmartSuggestSuggestion;
};

export type SuggestCacheRecord = {
  cacheKey: string;
  queryHash: string;
  kind: SmartSuggestKind;
  countryCode?: SmartSuggestCountryCode;
  countryCodes?: readonly SmartSuggestCountryCode[];
  tenantId?: string;
  language?: string;
  status: SmartSuggestCacheStatus;
  payload: readonly SmartSuggestSuggestion[];
  cachePolicy: ProviderCachePolicy;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type SuggestCacheWrite = Omit<SuggestCacheRecord, "createdAt" | "status" | "updatedAt"> & {
  status?: SmartSuggestCacheStatus;
};

export type ProviderEventRecord = {
  id: string;
  requestId: string;
  providerId: string;
  tenantId?: string;
  status: "error" | "skipped" | "success" | "timeout";
  latencyMs?: number;
  errorCode?: SmartSuggestErrorCode;
  queryHash?: string;
  createdAt: string;
};

export type AcceptEventRecord = {
  id: string;
  requestId: string;
  suggestionId: string;
  acceptedAt: string;
  tenant?: SmartSuggestTenantContext;
  sourceId: string;
};

export type SuggestQueryHashInput = {
  query: string;
  kind: SmartSuggestKind;
  countryCode?: SmartSuggestCountryCode;
  countryCodes?: readonly SmartSuggestCountryCode[];
  tenantId?: string;
  language?: string;
  limit?: number;
};

export type SuggestQueryHashOptions = {
  secret?: string;
};

export type SuggestCacheKeyInput = Omit<SuggestQueryHashInput, "query"> & {
  queryHash: string;
};

export type SmartSuggestStorageEffect<T> = Effect.Effect<T, SmartSuggestStorageError, never>;

export type SmartSuggestRepositories = {
  health: {
    check: () => SmartSuggestStorageEffect<StorageHealth>;
  };
  tenants: {
    upsertTenant: (
      input: Omit<TenantRecord, "createdAt" | "updatedAt">,
    ) => SmartSuggestStorageEffect<TenantRecord>;
    getTenant: (tenantId: string) => SmartSuggestStorageEffect<TenantRecord | undefined>;
  };
  apiKeys: {
    upsertApiKey: (
      input: Omit<ApiKeyRecord, "createdAt">,
    ) => SmartSuggestStorageEffect<ApiKeyRecord>;
    getApiKeyByHash: (keyHash: string) => SmartSuggestStorageEffect<ApiKeyRecord | undefined>;
    listApiKeysForTenant: (tenantId: string) => SmartSuggestStorageEffect<readonly ApiKeyRecord[]>;
  };
  dataSources: {
    registerDataSource: (
      input: Omit<DataSourceRecord, "createdAt" | "updatedAt">,
    ) => SmartSuggestStorageEffect<DataSourceRecord>;
    getDataSource: (sourceId: string) => SmartSuggestStorageEffect<DataSourceRecord | undefined>;
  };
  importRuns: {
    startImportRun: (
      input: Pick<ImportRunRecord, "id" | "shardCountryCode" | "sourceId"> &
        Partial<
          Pick<
            ImportRunRecord,
            | "atomEntryId"
            | "checksumSha256"
            | "importKind"
            | "sourceFeedId"
            | "sourceGeneratedAt"
            | "sourceUri"
            | "sourceValidAt"
            | "sourceVersion"
          >
        >,
    ) => SmartSuggestStorageEffect<ImportRunRecord>;
    finishImportRun: (
      input: Pick<
        ImportRunRecord,
        | "completedAt"
        | "errorSummary"
        | "failedRows"
        | "id"
        | "insertedRows"
        | "status"
        | "totalRows"
      > &
        Partial<Pick<ImportRunRecord, "skippedRows" | "tombstonedRows" | "upsertedRows">>,
    ) => SmartSuggestStorageEffect<ImportRunRecord>;
    getImportRun: (runId: string) => SmartSuggestStorageEffect<ImportRunRecord | undefined>;
    findLatestCompletedImportRun: (input: {
      importKinds: readonly AddressImportKind[];
      shardCountryCode: SmartSuggestCountryCode;
      sourceId: string;
    }) => SmartSuggestStorageEffect<ImportRunRecord | undefined>;
    listRecentImportRuns: (limit?: number) => SmartSuggestStorageEffect<readonly ImportRunRecord[]>;
  };
  shardRegistry: {
    upsertShardMetadata: (
      input: SmartSuggestShardMetadataUpsertInput,
    ) => SmartSuggestStorageEffect<SmartSuggestShardMetadataRecord>;
    listShardMetadata: (
      input?: SmartSuggestShardMetadataListInput,
    ) => SmartSuggestStorageEffect<readonly SmartSuggestShardMetadataRecord[]>;
    resolveShardMetadata: (
      input: SmartSuggestShardMetadataResolveInput,
    ) => SmartSuggestStorageEffect<readonly SmartSuggestShardMetadataRecord[]>;
  };
  addressRecords: {
    upsertAddressRecords: (
      records: readonly AddressSearchRecordInput[],
    ) => SmartSuggestStorageEffect<readonly AddressRecord[]>;
    listPostalLocalityAddressRecords: (input: {
      countryCode?: SmartSuggestCountryCode;
      postalCode: string;
    }) => SmartSuggestStorageEffect<readonly AddressRecord[]>;
    searchAddressRecords: (input: {
      countryCode?: SmartSuggestCountryCode;
      kind?: "address" | "place" | "postal";
      limit?: number;
      query: string;
    }) => SmartSuggestStorageEffect<readonly AddressRecord[]>;
    getAddressRecord: (recordId: string) => SmartSuggestStorageEffect<AddressRecord | undefined>;
  };
  addressTombstones: {
    upsertAddressTombstones: (
      tombstones: readonly AddressTombstoneRecordInput[],
    ) => SmartSuggestStorageEffect<readonly AddressTombstoneRecord[]>;
    listAddressTombstones: (
      limit?: number,
    ) => SmartSuggestStorageEffect<readonly AddressTombstoneRecord[]>;
  };
  suggestCache: {
    readSuggestCache: (
      cacheKey: string,
    ) => SmartSuggestStorageEffect<SuggestCacheRecord | undefined>;
    writeSuggestCache: (input: SuggestCacheWrite) => SmartSuggestStorageEffect<SuggestCacheRecord>;
  };
  providerEvents: {
    recordProviderEvent: (
      input: Omit<ProviderEventRecord, "createdAt">,
    ) => SmartSuggestStorageEffect<ProviderEventRecord>;
    listProviderEvents: (
      requestId: string,
    ) => SmartSuggestStorageEffect<readonly ProviderEventRecord[]>;
  };
  acceptEvents: {
    recordAcceptEvent: (input: AcceptEventRecord) => SmartSuggestStorageEffect<AcceptEventRecord>;
    listAcceptEvents: (
      requestId: string,
    ) => SmartSuggestStorageEffect<readonly AcceptEventRecord[]>;
  };
};

export type SmartSuggestArtifactFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export type SmartSuggestArtifactRepositoryOptions = {
  readonly allowIncomplete?: boolean;
  readonly fallback: SmartSuggestRepositories;
  readonly fetch?: SmartSuggestArtifactFetch;
  readonly manifestUrl: string;
  readonly maxAddressTokenPages?: number;
  readonly readFallbackAddressRecords?: boolean;
};

export const ArtifactCountryCodeSchema = Schema.String.check(Schema.isPattern(/^[A-Z]{2}$/u));
export const ArtifactIsoStringSchema = Schema.String.check(Schema.isMinLength(1));
export const ArtifactNonNegativeIntSchema = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0));
export const ArtifactNonNegativeNumberSchema = Schema.Finite.check(Schema.isGreaterThanOrEqualTo(0));

export const ArtifactProviderCachePolicySchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("none"),
  }),
  Schema.Struct({
    kind: Schema.Literal("permanent"),
  }),
  Schema.Struct({
    kind: Schema.Literal("ttl"),
    ttlSeconds: Schema.Int.check(Schema.isGreaterThan(0)),
  }),
]);

export const ArtifactAttributionSchema = Schema.Struct({
  label: Schema.NonEmptyString,
  license: Schema.optionalKey(Schema.NonEmptyString),
  url: Schema.optionalKey(Schema.NonEmptyString),
});

export const ArtifactAddressPartsSchema = Schema.Struct({
  city: Schema.optionalKey(Schema.String),
  countryCode: Schema.optionalKey(ArtifactCountryCodeSchema),
  district: Schema.optionalKey(Schema.String),
  houseNumber: Schema.optionalKey(Schema.String),
  line1: Schema.optionalKey(Schema.String),
  line2: Schema.optionalKey(Schema.String),
  orientationNumber: Schema.optionalKey(Schema.String),
  postalCode: Schema.optionalKey(Schema.String),
  region: Schema.optionalKey(Schema.String),
  street: Schema.optionalKey(Schema.String),
});

export const ArtifactDataSourceSchema = Schema.Struct({
  attribution: ArtifactAttributionSchema,
  cachePolicy: ArtifactProviderCachePolicySchema,
  countryCode: ArtifactCountryCodeSchema,
  createdAt: ArtifactIsoStringSchema,
  datasetVersion: Schema.optionalKey(Schema.NonEmptyString),
  id: Schema.NonEmptyString,
  modificationNoteSha256: Schema.optionalKey(Schema.NonEmptyString),
  name: Schema.NonEmptyString,
  region: Schema.optionalKey(Schema.String),
  sourceKind: Schema.Literals(["cache", "live-provider", "owned-dataset"]),
  updatedAt: ArtifactIsoStringSchema,
});

export const ArtifactImportRunSchema = Schema.Struct({
  atomEntryId: Schema.optionalKey(Schema.String),
  checksumSha256: Schema.optionalKey(Schema.String),
  completedAt: Schema.optionalKey(ArtifactIsoStringSchema),
  errorSummary: Schema.optionalKey(Schema.String),
  failedRows: ArtifactNonNegativeIntSchema,
  id: Schema.NonEmptyString,
  importKind: Schema.optionalKey(Schema.Literals(["baseline", "delta", "manual"])),
  insertedRows: ArtifactNonNegativeIntSchema,
  shardCountryCode: ArtifactCountryCodeSchema,
  skippedRows: ArtifactNonNegativeIntSchema,
  sourceFeedId: Schema.optionalKey(Schema.String),
  sourceGeneratedAt: Schema.optionalKey(Schema.String),
  sourceId: Schema.NonEmptyString,
  sourceUri: Schema.optionalKey(Schema.String),
  sourceValidAt: Schema.optionalKey(Schema.String),
  sourceVersion: Schema.optionalKey(Schema.String),
  startedAt: ArtifactIsoStringSchema,
  status: Schema.Literals(["completed", "failed", "running"]),
  tombstonedRows: ArtifactNonNegativeIntSchema,
  totalRows: ArtifactNonNegativeIntSchema,
  upsertedRows: ArtifactNonNegativeIntSchema,
});

export const ArtifactShardMetadataSchema = Schema.Struct({
  bindingName: Schema.NonEmptyString,
  countryCode: ArtifactCountryCodeSchema,
  createdAt: ArtifactIsoStringSchema,
  estimatedSizeBytes: Schema.optionalKey(ArtifactNonNegativeIntSchema),
  importVersion: Schema.optionalKey(Schema.String),
  lastImportCompletedAt: Schema.optionalKey(ArtifactIsoStringSchema),
  municipalityCodes: Schema.Array(Schema.String),
  municipalityHints: Schema.Array(Schema.String),
  postalPrefixes: Schema.Array(Schema.String),
  regionCode: Schema.NonEmptyString,
  regionKind: Schema.Literals(["country", "municipality", "postal-prefix", "vusc"]),
  regionName: Schema.NonEmptyString,
  rowCount: ArtifactNonNegativeIntSchema,
  shardId: Schema.NonEmptyString,
  sourceFreshnessAt: Schema.optionalKey(Schema.String),
  state: Schema.Literals(["active", "disabled", "standby"]),
  updatedAt: ArtifactIsoStringSchema,
});

export const ArtifactRuianIdentifiersSchema = Schema.Struct({
  addressPlaceCode: Schema.NonEmptyString,
  buildingObjectCode: Schema.optionalKey(Schema.String),
  districtCode: Schema.optionalKey(Schema.String),
  municipalityCode: Schema.optionalKey(Schema.String),
  municipalityDistrictCode: Schema.optionalKey(Schema.String),
  municipalityPartCode: Schema.optionalKey(Schema.String),
  postalCode: Schema.optionalKey(Schema.String),
  regionCode: Schema.optionalKey(Schema.String),
  stableAddressId: Schema.optionalKey(Schema.String),
  streetCode: Schema.optionalKey(Schema.String),
});

export const ArtifactSourceLineageSchema = Schema.Struct({
  atomEntryId: Schema.optionalKey(Schema.String),
  checksumSha256: Schema.optionalKey(Schema.String),
  datasetVersion: Schema.optionalKey(Schema.String),
  feedId: Schema.optionalKey(Schema.String),
  fileKind: Schema.optionalKey(Schema.String),
  lastImportRunId: Schema.optionalKey(Schema.String),
  previousAtomEntryId: Schema.optionalKey(Schema.String),
  snapshotUri: Schema.optionalKey(Schema.String),
  sourceGeneratedAt: Schema.optionalKey(Schema.String),
  sourceId: Schema.NonEmptyString,
  sourceRecordId: Schema.optionalKey(Schema.String),
  sourceRecordType: Schema.optionalKey(Schema.String),
  sourceRowId: Schema.NonEmptyString,
  sourceUri: Schema.optionalKey(Schema.String),
  sourceValidAt: Schema.optionalKey(Schema.String),
  sourceVersion: Schema.optionalKey(Schema.String),
});

export const ArtifactAddressVisibilitySchema = Schema.Struct({
  changeProposalGlobalId: Schema.optionalKey(Schema.String),
  invalid: Schema.optionalKey(Schema.Boolean),
  reason: Schema.optionalKey(Schema.String),
  replicationStatus: Schema.Literals(["active", "invalid", "tombstoned"]),
  searchVisible: Schema.Boolean,
  sourceStatus: Schema.optionalKey(Schema.String),
  transactionId: Schema.optionalKey(Schema.String),
  validFrom: Schema.optionalKey(Schema.String),
  validTo: Schema.optionalKey(Schema.String),
});

export const ArtifactAddressRankingSchema = Schema.Struct({
  addressCount: Schema.optionalKey(ArtifactNonNegativeIntSchema),
});

export const ArtifactAddressRecordSchema = Schema.Struct({
  attribution: Schema.optionalKey(ArtifactAttributionSchema),
  countryCode: ArtifactCountryCodeSchema,
  createdAt: ArtifactIsoStringSchema,
  displayLabel: Schema.NonEmptyString,
  id: Schema.NonEmptyString,
  latitude: Schema.optionalKey(Schema.Finite),
  longitude: Schema.optionalKey(Schema.Finite),
  parts: ArtifactAddressPartsSchema,
  quality: ArtifactNonNegativeNumberSchema,
  replicationStatus: Schema.Literals(["active", "invalid", "tombstoned"]),
  ruian: Schema.optionalKey(ArtifactRuianIdentifiersSchema),
  searchLabel: Schema.NonEmptyString,
  searchVisible: Schema.Boolean,
  sourceId: Schema.NonEmptyString,
  sourceLineage: Schema.optionalKey(ArtifactSourceLineageSchema),
  ranking: Schema.optionalKey(ArtifactAddressRankingSchema),
  updatedAt: ArtifactIsoStringSchema,
  visibility: Schema.optionalKey(ArtifactAddressVisibilitySchema),
});

export const ArtifactAddressRecordPrefixIndexSchema = Schema.Struct({
  complete: Schema.Boolean,
  maxPrefixLength: Schema.optionalKey(Schema.Int.check(Schema.isGreaterThan(0))),
  pathTemplate: Schema.NonEmptyString,
});

export const ArtifactAddressRecordIndexSchema = Schema.Struct({
  bucketCount: Schema.Int.check(Schema.isGreaterThan(0)),
  complete: Schema.Boolean,
  pathTemplate: Schema.NonEmptyString,
});

export const ArtifactAddressTokenIndexSchema = Schema.Struct({
  bucketCount: Schema.optionalKey(Schema.Int.check(Schema.isGreaterThan(0))),
  bucketManifestPathTemplate: Schema.optionalKey(Schema.NonEmptyString),
  bucketPagePathTemplate: Schema.optionalKey(Schema.NonEmptyString),
  bucketPathTemplate: Schema.optionalKey(Schema.NonEmptyString),
  complete: Schema.Boolean,
  manifestPathTemplate: Schema.NonEmptyString,
  maxFileSizeBytes: Schema.optionalKey(ArtifactNonNegativeIntSchema),
  maxPagesPerQuery: Schema.optionalKey(ArtifactNonNegativeIntSchema),
  maxTokenLength: Schema.Int.check(Schema.isGreaterThan(0)),
  minTokenLength: Schema.Int.check(Schema.isGreaterThan(0)),
  pagePathTemplate: Schema.NonEmptyString,
  pageSize: Schema.Int.check(Schema.isGreaterThan(0)),
});

export const SmartSuggestOwnedDataArtifactManifestSchema = Schema.Struct({
  dataset: Schema.Struct({
    complete: Schema.Boolean,
    countryCode: ArtifactCountryCodeSchema,
    estimatedSizeBytes: Schema.optionalKey(ArtifactNonNegativeIntSchema),
    importRun: ArtifactImportRunSchema,
    rowCount: ArtifactNonNegativeIntSchema,
    source: ArtifactDataSourceSchema,
  }),
  generatedAt: ArtifactIsoStringSchema,
  indexes: Schema.Struct({
    addressRecords: ArtifactAddressRecordIndexSchema,
    addressTokens: ArtifactAddressTokenIndexSchema,
    localityCities: ArtifactAddressRecordPrefixIndexSchema,
    postalLocalities: ArtifactAddressRecordPrefixIndexSchema,
    postalPrefixes: ArtifactAddressRecordPrefixIndexSchema,
  }),
  schemaVersion: Schema.Literal("smart-suggest-owned-artifacts/v1"),
  shards: Schema.Array(ArtifactShardMetadataSchema),
});

export const SmartSuggestOwnedDataArtifactAddressRecordsSchema = Schema.Struct({
  complete: Schema.Boolean,
  countryCode: ArtifactCountryCodeSchema,
  datasetVersion: Schema.optionalKey(Schema.String),
  query: Schema.Struct({
    kind: Schema.Literals([
      "address-record-bucket",
      "address-token",
      "locality-city-prefix",
      "postal-code",
      "postal-prefix",
    ]),
    value: Schema.NonEmptyString,
  }),
  records: Schema.Array(ArtifactAddressRecordSchema),
  schemaVersion: Schema.Literal("smart-suggest-address-records/v1"),
});

export const SmartSuggestOwnedDataArtifactAddressRecordIdsSchema = Schema.Struct({
  complete: Schema.Boolean,
  countryCode: ArtifactCountryCodeSchema,
  datasetVersion: Schema.optionalKey(Schema.String),
  query: Schema.Struct({
    kind: Schema.Literal("address-token"),
    value: Schema.NonEmptyString,
  }),
  recordIds: Schema.Array(Schema.NonEmptyString),
  schemaVersion: Schema.Literal("smart-suggest-address-record-ids/v1"),
});

export const ArtifactTokenBucketEntrySchema = Schema.Struct({
  recordCount: ArtifactNonNegativeIntSchema,
  recordIds: Schema.Array(Schema.NonEmptyString),
  records: Schema.optionalKey(Schema.Array(ArtifactAddressRecordSchema)),
});

export const SmartSuggestOwnedDataArtifactTokenBucketSchema = Schema.Struct({
  bucket: ArtifactNonNegativeIntSchema,
  complete: Schema.Boolean,
  countryCode: ArtifactCountryCodeSchema,
  datasetVersion: Schema.optionalKey(Schema.String),
  schemaVersion: Schema.Literal("smart-suggest-address-token-bucket/v1"),
  tokens: Schema.Record(Schema.NonEmptyString, ArtifactTokenBucketEntrySchema),
});

export const ArtifactTokenBucketPageReferenceSchema = Schema.Struct({
  page: ArtifactNonNegativeIntSchema,
  path: Schema.optionalKey(Schema.NonEmptyString),
  recordCount: ArtifactNonNegativeIntSchema,
  tokenCount: ArtifactNonNegativeIntSchema,
});

export const SmartSuggestOwnedDataArtifactTokenBucketManifestSchema = Schema.Struct({
  bucket: ArtifactNonNegativeIntSchema,
  complete: Schema.Boolean,
  countryCode: ArtifactCountryCodeSchema,
  datasetVersion: Schema.optionalKey(Schema.String),
  pageCount: ArtifactNonNegativeIntSchema,
  pages: Schema.Array(ArtifactTokenBucketPageReferenceSchema),
  schemaVersion: Schema.Literal("smart-suggest-address-token-bucket-manifest/v1"),
  tokens: Schema.Record(
    Schema.NonEmptyString,
    Schema.Struct({
      page: ArtifactNonNegativeIntSchema,
      recordCount: ArtifactNonNegativeIntSchema,
    }),
  ),
});

export const SmartSuggestOwnedDataArtifactTokenBucketPageSchema = Schema.Struct({
  bucket: ArtifactNonNegativeIntSchema,
  complete: Schema.Boolean,
  countryCode: ArtifactCountryCodeSchema,
  datasetVersion: Schema.optionalKey(Schema.String),
  page: ArtifactNonNegativeIntSchema,
  schemaVersion: Schema.Literal("smart-suggest-address-token-bucket-page/v1"),
  tokens: Schema.Record(Schema.NonEmptyString, ArtifactTokenBucketEntrySchema),
});

export const SmartSuggestOwnedDataArtifactTokenManifestSchema = Schema.Struct({
  complete: Schema.Boolean,
  countryCode: ArtifactCountryCodeSchema,
  datasetVersion: Schema.optionalKey(Schema.String),
  pageCount: ArtifactNonNegativeIntSchema,
  pages: Schema.Array(
    Schema.Struct({
      page: ArtifactNonNegativeIntSchema,
      path: Schema.optionalKey(Schema.NonEmptyString),
      recordCount: ArtifactNonNegativeIntSchema,
    }),
  ),
  recordCount: ArtifactNonNegativeIntSchema,
  schemaVersion: Schema.Literal("smart-suggest-address-token-manifest/v1"),
  token: Schema.NonEmptyString,
});

export type SmartSuggestOwnedDataArtifactManifest = Schema.Schema.Type<
  typeof SmartSuggestOwnedDataArtifactManifestSchema
>;
export type SmartSuggestOwnedDataArtifactAddressRecords = Schema.Schema.Type<
  typeof SmartSuggestOwnedDataArtifactAddressRecordsSchema
>;
export type SmartSuggestOwnedDataArtifactAddressRecordIds = Schema.Schema.Type<
  typeof SmartSuggestOwnedDataArtifactAddressRecordIdsSchema
>;
export type SmartSuggestOwnedDataArtifactTokenBucketEntry = Schema.Schema.Type<
  typeof ArtifactTokenBucketEntrySchema
>;
export type SmartSuggestOwnedDataArtifactTokenBucket = Schema.Schema.Type<
  typeof SmartSuggestOwnedDataArtifactTokenBucketSchema
>;
export type SmartSuggestOwnedDataArtifactTokenBucketManifest = Schema.Schema.Type<
  typeof SmartSuggestOwnedDataArtifactTokenBucketManifestSchema
>;
export type SmartSuggestOwnedDataArtifactTokenBucketPage = Schema.Schema.Type<
  typeof SmartSuggestOwnedDataArtifactTokenBucketPageSchema
>;
export type SmartSuggestOwnedDataArtifactTokenManifest = Schema.Schema.Type<
  typeof SmartSuggestOwnedDataArtifactTokenManifestSchema
>;

export const SmartSuggestStorageErrorCodeSchema = Schema.Literals([
  "cache-policy-violation",
  "import-run-conflict",
  "import-run-not-found",
  "storage-unavailable",
]);

export type SmartSuggestStorageErrorCode = Schema.Schema.Type<
  typeof SmartSuggestStorageErrorCodeSchema
>;

export class SmartSuggestStorageError extends Schema.TaggedErrorClass<SmartSuggestStorageError>()(
  "SmartSuggestStorageError",
  {
    code: SmartSuggestStorageErrorCodeSchema,
    message: Schema.String,
  },
) {
  constructor(code: SmartSuggestStorageErrorCode, message: string) {
    super({ code, message });
  }
}

export const rawSqlFailureDetailPattern = /Failed query:|params:/u;
export const addressSearchFtsUnavailableStorageMessage =
  "Smart Suggest address search FTS index unavailable.";
export const addressSearchFtsUnavailableDetailPattern =
  /smart_suggest_address_search_fts|no such table|no such module|no such tokenizer/iu;

export function sanitizeStorageErrorMessage(error: unknown): string {
  const message =
    error instanceof Error ? error.message : "Smart Suggest storage operation failed.";

  if (addressSearchFtsUnavailableDetailPattern.test(message)) {
    return addressSearchFtsUnavailableStorageMessage;
  }

  if (rawSqlFailureDetailPattern.test(message)) {
    return "Smart Suggest storage operation failed during D1 SQL execution.";
  }

  return message.length > 1_000 ? `${message.slice(0, 1_000)}...` : message;
}

export const toSmartSuggestStorageError = (error: unknown): SmartSuggestStorageError =>
  error instanceof SmartSuggestStorageError
    ? error
    : new SmartSuggestStorageError("storage-unavailable", sanitizeStorageErrorMessage(error));

export const storageEffect = <T>(compute: () => T): SmartSuggestStorageEffect<T> =>
  Effect.try({
    try: compute,
    catch: toSmartSuggestStorageError,
  });

export const importRunStatuses = ["completed", "failed", "running"] as const satisfies readonly ImportRunStatus[];
export const addressImportKinds = ["baseline", "delta", "manual"] as const satisfies readonly AddressImportKind[];
export const addressReplicationStatuses = [
  "active",
  "invalid",
  "tombstoned",
] as const satisfies readonly AddressReplicationStatus[];
export const smartSuggestKinds = ["address", "place", "postal"] as const satisfies readonly SmartSuggestKind[];
export const smartSuggestCacheStatuses = [
  "disabled",
  "hit",
  "miss",
  "stale",
  "written",
] as const satisfies readonly SmartSuggestCacheStatus[];
export const suggestionSourceKinds = [
  "live-provider",
  "owned-dataset",
] as const satisfies readonly SuggestionSourceKind[];
export const providerEventStatuses = [
  "error",
  "skipped",
  "success",
  "timeout",
] as const satisfies readonly ProviderEventRecord["status"][];
export const smartSuggestErrorCodes = [
  "bad-request",
  "cache-policy-violation",
  "forbidden",
  "internal-error",
  "not-found",
  "provider-timeout",
  "provider-unavailable",
  "rate-limit",
  "storage-unavailable",
  "unauthorized",
  "validation-error",
] as const satisfies readonly SmartSuggestErrorCode[];

export const asLiteral = <const TAllowed extends readonly [string, ...string[]]>(
  value: string,
  allowed: TAllowed,
  context: string,
): TAllowed[number] => {
  if ((allowed as readonly string[]).includes(value)) {
    return value as TAllowed[number];
  }

  throw new SmartSuggestStorageError(
    "storage-unavailable",
    `Invalid ${context} "${value}" in Smart Suggest storage; expected one of: ${allowed.join(", ")}.`,
  );
};

export const asCountryCode = (value: string, context: string): SmartSuggestCountryCode => {
  const countryCode = normalizeSmartSuggestCountryCode(value);

  if (countryCode !== undefined) {
    return countryCode;
  }

  throw new SmartSuggestStorageError(
    "storage-unavailable",
    `Invalid ${context} "${value}" in Smart Suggest storage; expected an ISO alpha-2 or alpha-3 country code.`,
  );
};

export type StartImportRunInput = Parameters<SmartSuggestRepositories["importRuns"]["startImportRun"]>[0];

export type ImportRunRestartFingerprint = {
  atomEntryId: string | undefined;
  checksumSha256: string | undefined;
  importKind: AddressImportKind;
  shardCountryCode: SmartSuggestCountryCode;
  sourceFeedId: string | undefined;
  sourceGeneratedAt: string | undefined;
  sourceId: string;
  sourceUri: string | undefined;
  sourceValidAt: string | undefined;
  sourceVersion: string | undefined;
};

export const importRunRestartFingerprintFields = [
  "atomEntryId",
  "checksumSha256",
  "importKind",
  "shardCountryCode",
  "sourceFeedId",
  "sourceGeneratedAt",
  "sourceId",
  "sourceUri",
  "sourceValidAt",
  "sourceVersion",
] as const;

export const toImportRunRestartFingerprint = (
  input: StartImportRunInput,
): ImportRunRestartFingerprint => ({
  atomEntryId: input.atomEntryId,
  checksumSha256: input.checksumSha256,
  importKind: input.importKind ?? "manual",
  shardCountryCode: input.shardCountryCode,
  sourceFeedId: input.sourceFeedId,
  sourceGeneratedAt: input.sourceGeneratedAt,
  sourceId: input.sourceId,
  sourceUri: input.sourceUri,
  sourceValidAt: input.sourceValidAt,
  sourceVersion: input.sourceVersion,
});

export const sequencedImportKinds = ["baseline", "delta"] as const satisfies readonly AddressImportKind[];

export const isSequencedImportKind = (
  importKind: AddressImportKind | undefined,
): importKind is (typeof sequencedImportKinds)[number] =>
  importKind === "baseline" || importKind === "delta";

export const assertImportRunRestartCompatible = (
  existing: ImportRunRecord,
  input: StartImportRunInput,
) => {
  const next = toImportRunRestartFingerprint(input);
  const mismatchedFields = importRunRestartFingerprintFields.filter(
    (field) => (existing[field] ?? null) !== (next[field] ?? null),
  );

  if (mismatchedFields.length === 0) {
    return;
  }

  throw new SmartSuggestStorageError(
    "import-run-conflict",
    `Import run ${
      existing.id
    } already exists with different source metadata: ${mismatchedFields.join(
      ", ",
    )}. Use the original snapshot metadata or a new run id.`,
  );
};

export const activeSequencedImportRunConflict = (
  input: StartImportRunInput,
  activeRun: ImportRunRecord | undefined,
) =>
  new SmartSuggestStorageError(
    "import-run-conflict",
    `Cannot start ${input.importKind ?? "manual"} import run ${input.id} for source ${
      input.sourceId
    } shard ${input.shardCountryCode}: ${
      activeRun === undefined ? "another baseline or delta import" : `import run ${activeRun.id}`
    } is already running. Finish or fail the active run before starting another sequenced import for the same source and shard.`,
  );

export const assertNoActiveSequencedImportRun = (
  input: StartImportRunInput,
  activeRun: ImportRunRecord | undefined,
) => {
  if (activeRun === undefined) {
    return;
  }

  throw activeSequencedImportRunConflict(input, activeRun);
};

export const collectErrorText = (
  value: unknown,
  seen = new Set<object>(),
  messages: string[] = [],
): readonly string[] => {
  if (typeof value === "string") {
    messages.push(value);
    return messages;
  }

  if (value instanceof Error) {
    messages.push(value.message);

    if (value.stack !== undefined) {
      messages.push(value.stack);
    }
  }

  if (value === null || typeof value !== "object" || seen.has(value)) {
    return messages;
  }

  seen.add(value);

  for (const nestedValue of Object.values(value)) {
    collectErrorText(nestedValue, seen, messages);
  }

  return messages;
};

export const isImportRunUniqueConstraintError = (error: unknown) =>
  collectErrorText(error).some((message) => importRunUniqueConstraintPattern.test(message));

export const smartSuggestTenants = sqliteTable("smart_suggest_tenants", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status").notNull().default("active"),
  allowedOriginsJson: text("allowed_origins_json").notNull().default("[]"),
  providerPriorityJson: text("provider_priority_json").notNull().default("[]"),
  countryConfigJson: text("country_config_json").notNull().default("{}"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const smartSuggestApiKeys = sqliteTable(
  "smart_suggest_api_keys",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => smartSuggestTenants.id, { onDelete: "cascade" }),
    keyHash: text("key_hash").notNull(),
    label: text("label").notNull(),
    status: text("status").notNull().default("active"),
    createdAt: text("created_at").notNull(),
    revokedAt: text("revoked_at"),
  },
  (table) => [
    index("smart_suggest_api_keys_tenant_idx").on(table.tenantId),
    uniqueIndex("smart_suggest_api_keys_hash_idx").on(table.keyHash),
  ],
);

export const smartSuggestDataSources = sqliteTable(
  "smart_suggest_data_sources",
  {
    id: text("id").primaryKey(),
    sourceKind: text("source_kind").notNull(),
    name: text("name").notNull(),
    countryCode: text("country_code").notNull(),
    region: text("region"),
    datasetVersion: text("dataset_version"),
    attributionLabel: text("attribution_label").notNull(),
    attributionUrl: text("attribution_url"),
    attributionLicense: text("attribution_license"),
    cachePolicyJson: text("cache_policy_json").notNull(),
    modificationNoteSha256: text("modification_note_sha256"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [index("smart_suggest_sources_country_idx").on(table.countryCode)],
);

export const smartSuggestImportRuns = sqliteTable(
  "smart_suggest_import_runs",
  {
    id: text("id").primaryKey(),
    sourceId: text("source_id")
      .notNull()
      .references(() => smartSuggestDataSources.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    shardCountryCode: text("shard_country_code").notNull(),
    importKind: text("import_kind"),
    sourceFeedId: text("source_feed_id"),
    sourceUri: text("source_uri"),
    sourceChecksumSha256: text("source_checksum_sha256"),
    sourceVersion: text("source_version"),
    sourceGeneratedAt: text("source_generated_at"),
    sourceValidAt: text("source_valid_at"),
    sourceAtomEntryId: text("source_atom_entry_id"),
    startedAt: text("started_at").notNull(),
    completedAt: text("completed_at"),
    totalRows: integer("total_rows").notNull().default(0),
    insertedRows: integer("inserted_rows").notNull().default(0),
    upsertedRows: integer("upserted_rows").notNull().default(0),
    tombstonedRows: integer("tombstoned_rows").notNull().default(0),
    skippedRows: integer("skipped_rows").notNull().default(0),
    failedRows: integer("failed_rows").notNull().default(0),
    errorSummary: text("error_summary"),
  },
  (table) => [
    index("smart_suggest_import_runs_source_idx").on(table.sourceId),
    index("smart_suggest_import_runs_shard_idx").on(table.shardCountryCode),
    uniqueIndex("smart_suggest_import_runs_active_source_shard_idx")
      .on(table.sourceId, table.shardCountryCode)
      .where(sql`${table.status} = 'running' AND ${table.importKind} IN ('baseline', 'delta')`),
  ],
);

export const smartSuggestShardRegistry = sqliteTable(
  "smart_suggest_shard_registry",
  {
    shardId: text("shard_id").primaryKey(),
    countryCode: text("country_code").notNull(),
    regionKind: text("region_kind").notNull(),
    regionCode: text("region_code").notNull(),
    regionName: text("region_name").notNull(),
    postalPrefixesJson: text("postal_prefixes_json").notNull().default("[]"),
    municipalityCodesJson: text("municipality_codes_json").notNull().default("[]"),
    municipalityHintsJson: text("municipality_hints_json").notNull().default("[]"),
    bindingName: text("binding_name").notNull(),
    importVersion: text("import_version"),
    state: text("state").notNull().default("standby"),
    rowCount: integer("row_count").notNull().default(0),
    estimatedSizeBytes: integer("estimated_size_bytes"),
    sourceFreshnessAt: text("source_freshness_at"),
    lastImportCompletedAt: text("last_import_completed_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("smart_suggest_shard_registry_binding_idx").on(table.bindingName),
    index("smart_suggest_shard_registry_country_state_idx").on(table.countryCode, table.state),
    index("smart_suggest_shard_registry_region_idx").on(
      table.countryCode,
      table.regionKind,
      table.regionCode,
    ),
    uniqueIndex("smart_suggest_shard_registry_active_region_idx")
      .on(table.countryCode, table.regionKind, table.regionCode)
      .where(sql`${table.state} = 'active'`),
    index("smart_suggest_shard_registry_region_state_idx").on(
      table.countryCode,
      table.regionKind,
      table.regionCode,
      table.state,
    ),
  ],
);

export const smartSuggestProviderEvents = sqliteTable(
  "smart_suggest_provider_events",
  {
    id: text("id").primaryKey(),
    requestId: text("request_id").notNull(),
    providerId: text("provider_id").notNull(),
    tenantId: text("tenant_id"),
    status: text("status").notNull(),
    latencyMs: integer("latency_ms"),
    errorCode: text("error_code"),
    queryHash: text("query_hash"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("smart_suggest_provider_events_request_idx").on(table.requestId),
    index("smart_suggest_provider_events_provider_idx").on(table.providerId),
    index("smart_suggest_provider_events_query_hash_idx").on(table.queryHash),
  ],
);

export const smartSuggestAcceptEvents = sqliteTable(
  "smart_suggest_accept_events",
  {
    id: text("id").primaryKey(),
    requestId: text("request_id").notNull(),
    suggestionId: text("suggestion_id").notNull(),
    acceptedAt: text("accepted_at").notNull(),
    tenantJson: text("tenant_json"),
    sourceId: text("source_id").notNull(),
  },
  (table) => [
    index("smart_suggest_accept_events_request_idx").on(table.requestId),
    index("smart_suggest_accept_events_source_idx").on(table.sourceId),
  ],
);

export const smartSuggestCacheEntries = sqliteTable(
  "smart_suggest_cache_entries",
  {
    cacheKey: text("cache_key").primaryKey(),
    queryHash: text("query_hash").notNull(),
    kind: text("kind").notNull(),
    countryCode: text("country_code"),
    tenantId: text("tenant_id"),
    language: text("language"),
    status: text("status").notNull(),
    payloadJson: text("payload_json").notNull(),
    cachePolicyJson: text("cache_policy_json").notNull(),
    expiresAt: text("expires_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("smart_suggest_cache_query_hash_idx").on(table.queryHash),
    index("smart_suggest_cache_tenant_country_idx").on(table.tenantId, table.countryCode),
  ],
);

export const smartSuggestAddressRecords = sqliteTable(
  "smart_suggest_address_records",
  {
    id: text("id").primaryKey(),
    sourceId: text("source_id")
      .notNull()
      .references(() => smartSuggestDataSources.id, { onDelete: "cascade" }),
    countryCode: text("country_code").notNull(),
    region: text("region"),
    city: text("city"),
    district: text("district"),
    street: text("street"),
    houseNumber: text("house_number"),
    orientationNumber: text("orientation_number"),
    postalCode: text("postal_code"),
    line1: text("line_1"),
    line2: text("line_2"),
    displayLabel: text("display_label").notNull(),
    searchLabel: text("search_label").notNull(),
    replicationStatus: text("replication_status").notNull().default("active"),
    searchVisible: integer("search_visible", { mode: "boolean" }).notNull().default(true),
    ruianAddressPlaceCode: text("ruian_address_place_code"),
    ruianBuildingObjectCode: text("ruian_building_object_code"),
    ruianDistrictCode: text("ruian_district_code"),
    ruianMunicipalityCode: text("ruian_municipality_code"),
    ruianMunicipalityDistrictCode: text("ruian_municipality_district_code"),
    ruianMunicipalityPartCode: text("ruian_municipality_part_code"),
    ruianPostalCode: text("ruian_postal_code"),
    ruianRegionCode: text("ruian_region_code"),
    ruianStreetCode: text("ruian_street_code"),
    sourceRecordType: text("source_record_type"),
    sourceRecordId: text("source_record_id"),
    sourceFeedId: text("source_feed_id"),
    sourceUri: text("source_uri"),
    sourceChecksumSha256: text("source_checksum_sha256"),
    sourceVersion: text("source_version"),
    sourceGeneratedAt: text("source_generated_at"),
    sourceValidAt: text("source_valid_at"),
    sourceAtomEntryId: text("source_atom_entry_id"),
    sourceFileKind: text("source_file_kind"),
    sourceValidFrom: text("source_valid_from"),
    sourceValidTo: text("source_valid_to"),
    sourceTransactionId: text("source_transaction_id"),
    sourceChangeProposalGlobalId: text("source_change_proposal_global_id"),
    sourceStatus: text("source_status"),
    sourceInvalid: integer("source_invalid", { mode: "boolean" }),
    invalidReason: text("invalid_reason"),
    lastImportRunId: text("last_import_run_id"),
    tombstonedAt: text("tombstoned_at"),
    tombstoneReason: text("tombstone_reason"),
    latitude: real("latitude"),
    longitude: real("longitude"),
    quality: real("quality").notNull().default(0),
    attributionJson: text("attribution_json"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("smart_suggest_address_country_postal_idx").on(table.countryCode, table.postalCode),
    index("smart_suggest_address_country_visible_idx").on(table.countryCode, table.searchVisible),
    uniqueIndex("smart_suggest_address_source_record_idx").on(
      table.sourceId,
      table.sourceRecordType,
      table.sourceRecordId,
    ),
    index("smart_suggest_address_ruian_address_place_idx").on(table.ruianAddressPlaceCode),
    index("smart_suggest_address_ruian_region_idx").on(table.ruianRegionCode),
    index("smart_suggest_address_source_idx").on(table.sourceId),
  ],
);

export const smartSuggestAddressTombstones = sqliteTable(
  "smart_suggest_address_tombstones",
  {
    id: text("id").primaryKey(),
    sourceId: text("source_id")
      .notNull()
      .references(() => smartSuggestDataSources.id, { onDelete: "cascade" }),
    countryCode: text("country_code").notNull(),
    deletedAt: text("deleted_at"),
    reason: text("reason"),
    ruianAddressPlaceCode: text("ruian_address_place_code"),
    ruianBuildingObjectCode: text("ruian_building_object_code"),
    ruianDistrictCode: text("ruian_district_code"),
    ruianMunicipalityCode: text("ruian_municipality_code"),
    ruianMunicipalityDistrictCode: text("ruian_municipality_district_code"),
    ruianMunicipalityPartCode: text("ruian_municipality_part_code"),
    ruianPostalCode: text("ruian_postal_code"),
    ruianRegionCode: text("ruian_region_code"),
    ruianStreetCode: text("ruian_street_code"),
    sourceRecordType: text("source_record_type"),
    sourceRecordId: text("source_record_id"),
    sourceFeedId: text("source_feed_id"),
    sourceUri: text("source_uri"),
    sourceChecksumSha256: text("source_checksum_sha256"),
    sourceVersion: text("source_version"),
    sourceGeneratedAt: text("source_generated_at"),
    sourceValidAt: text("source_valid_at"),
    sourceAtomEntryId: text("source_atom_entry_id"),
    sourceFileKind: text("source_file_kind"),
    lastImportRunId: text("last_import_run_id"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("smart_suggest_address_tombstones_source_idx").on(table.sourceId),
    index("smart_suggest_address_tombstones_ruian_idx").on(table.ruianAddressPlaceCode),
  ],
);

export const smartSuggestAddressSearchTokens = sqliteTable(
  "smart_suggest_address_search_tokens",
  {
    id: text("id").primaryKey(),
    recordId: text("record_id")
      .notNull()
      .references(() => smartSuggestAddressRecords.id, { onDelete: "cascade" }),
    countryCode: text("country_code").notNull(),
    token: text("token").notNull(),
    prefix: text("prefix").notNull(),
    weight: real("weight").notNull().default(1),
  },
  (table) => [
    index("smart_suggest_address_tokens_prefix_idx").on(table.countryCode, table.prefix),
    index("smart_suggest_address_tokens_record_idx").on(table.recordId),
  ],
);

export const smartSuggestSchema = {
  smartSuggestAcceptEvents,
  smartSuggestAddressRecords,
  smartSuggestAddressSearchTokens,
  smartSuggestAddressTombstones,
  smartSuggestApiKeys,
  smartSuggestCacheEntries,
  smartSuggestDataSources,
  smartSuggestImportRuns,
  smartSuggestProviderEvents,
  smartSuggestShardRegistry,
  smartSuggestTenants,
};

export const nowIso = () => new Date().toISOString();

export const normalizeQueryForHash = (input: SuggestQueryHashInput) =>
  [
    input.kind,
    smartSuggestCountryScopeIdentity(input),
    input.tenantId ?? "",
    input.language ?? "",
    input.limit === undefined ? "" : String(normalizeSuggestLimit(input.limit)),
    input.query.trim().toLowerCase().replaceAll(/\s+/g, " "),
  ].join("\u001f");

export const toHex = (bytes: ArrayBuffer) =>
  [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");

export const computeSuggestQueryHash = async (
  input: SuggestQueryHashInput,
  options: SuggestQueryHashOptions = {},
) => {
  const encoder = new TextEncoder();
  const normalizedQuery = encoder.encode(normalizeQueryForHash(input));
  const secret = options.secret?.trim();

  if (secret !== undefined && secret !== "") {
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { hash: "SHA-256", name: "HMAC" },
      false,
      ["sign"],
    );
    const signature = await crypto.subtle.sign("HMAC", key, normalizedQuery);

    return `hmac-sha256:${toHex(signature)}`;
  }

  const digest = await crypto.subtle.digest("SHA-256", normalizedQuery);

  return toHex(digest);
};

export const createSuggestQueryHashEffect = (
  input: SuggestQueryHashInput,
  options: SuggestQueryHashOptions = {},
): SmartSuggestStorageEffect<string> =>
  Effect.tryPromise({
    try: () => computeSuggestQueryHash(input, options),
    catch: toSmartSuggestStorageError,
  });

export const createSuggestCacheKey = (input: SuggestCacheKeyInput) =>
  [
    "smart-suggest",
    "v3-owned-sequence-prefix",
    input.kind,
    smartSuggestCountryScopeIdentity(input),
    input.tenantId ?? "public",
    input.language ?? "default",
    input.queryHash,
  ].join(":");

export const SEARCH_INDEX_PREFIX_OPTIONS = {
  maxLength: 16,
  minLength: 1,
} as const;
export const ADDRESS_SEARCH_PREFIX_MIN_QUERY_TOKEN_LENGTH = 3;
export const ADDRESS_SEARCH_FTS_MIN_TEXT_TOKEN_LENGTH = 3;
export const ARTIFACT_MAX_RECORD_ID_FANOUT_WITHOUT_PREVIEW = 256;
export const ARTIFACT_MAX_SEQUENCE_RECORD_ID_FANOUT_WITHOUT_PREVIEW = 1024;
export const ARTIFACT_SEQUENCE_RECORD_ID_PREFIX_READ_LIMIT = 16;
export const D1_ADDRESS_IMPORT_SUBCHUNK_SIZE = 10;
export const D1_TOKEN_INSERT_SUBCHUNK_SIZE = 1000;
export const numericTokenPattern = /^\d+$/u;
export const addressSearchFtsUnavailablePattern =
  /smart_suggest_address_search_fts|no such table|no such module|no such tokenizer|Smart Suggest address search FTS index unavailable/iu;
export const importRunUniqueConstraintPattern =
  /smart_suggest_import_runs_active_source_shard_idx|UNIQUE constraint failed/u;

export const chunkItems = <TItem>(items: readonly TItem[], chunkSize: number): TItem[][] => {
  const chunks: TItem[][] = [];

  for (let itemIndex = 0; itemIndex < items.length; itemIndex += chunkSize) {
    chunks.push(items.slice(itemIndex, itemIndex + chunkSize));
  }

  return chunks;
};

export type AddressSearchTokenInsert = typeof smartSuggestAddressSearchTokens.$inferInsert;

export const createAddressSearchTokenRows = (
  record: Pick<AddressRecord, "countryCode" | "id" | "searchLabel">,
): AddressSearchTokenInsert[] => {
  const rows: AddressSearchTokenInsert[] = [];
  const tokens = tokenizeAddressText(record.searchLabel);

  for (const token of tokens) {
    for (const prefix of createPrefixTokens([token], SEARCH_INDEX_PREFIX_OPTIONS)) {
      rows.push({
        countryCode: record.countryCode,
        id: `${record.id}\u001f${token}\u001f${prefix}`,
        prefix,
        recordId: record.id,
        token,
        weight: prefix === token ? 2 : 1,
      });
    }
  }

  return rows;
};

export const createQuerySearchPrefixes = (query: string) => {
  const queryTokens = new Set(tokenizeAddressText(query));

  for (const postalCode of extractPostalCodeCandidates(query)) {
    queryTokens.add(postalCode.value);

    for (const token of tokenizeAddressText(postalCode.displayValue)) {
      queryTokens.add(token);
    }
  }

  return [...queryTokens]
    .filter((token) => token.length >= ADDRESS_SEARCH_PREFIX_MIN_QUERY_TOKEN_LENGTH)
    .map((token) => token.slice(0, SEARCH_INDEX_PREFIX_OPTIONS.maxLength));
};

export const createAddressSearchFtsQuery = (query: string) => {
  const postalCodes = extractPostalCodeCandidates(query);
  const tokens = new Set(tokenizeAddressText(query));

  for (const postalCode of postalCodes) {
    tokens.add(postalCode.value);
  }

  const tokenList = [...tokens];
  const hasStrongTextToken = tokenList.some(
    (token) =>
      !numericTokenPattern.test(token) && token.length >= ADDRESS_SEARCH_FTS_MIN_TEXT_TOKEN_LENGTH,
  );
  const hasPostalSignal = postalCodes.length > 0;
  const ftsTokens = tokenList.filter((token) => {
    if (numericTokenPattern.test(token)) {
      return hasStrongTextToken || hasPostalSignal;
    }

    return token.length >= ADDRESS_SEARCH_FTS_MIN_TEXT_TOKEN_LENGTH;
  });

  return ftsTokens.length === 0 ? undefined : ftsTokens.map((token) => `${token}*`).join(" ");
};

export const normalizePostalCodeDigits = (value: string | undefined) => value?.replaceAll(/\D/g, "") ?? "";

export const formatFiveDigitPostalCode = (digits: string) => `${digits.slice(0, 3)} ${digits.slice(3)}`;

export const postalCodeLookupValues = (postalCode: string) => {
  const trimmed = postalCode.trim();
  const digits = normalizePostalCodeDigits(postalCode);
  const values = new Set<string>();

  if (trimmed.length > 0) {
    values.add(trimmed);
  }
  if (digits.length > 0) {
    values.add(digits);
  }
  if (digits.length === 5) {
    values.add(formatFiveDigitPostalCode(digits));
  }

  return [...values];
};

export const recordPostalCodeDigits = (record: AddressRecord) =>
  normalizePostalCodeDigits(record.parts.postalCode ?? record.ruian?.postalCode);

export const selectPostalLocalityAddressRecords = (
  records: readonly AddressRecord[],
  input: {
    countryCode?: SmartSuggestCountryCode;
    postalCode: string;
  },
) => {
  const targetPostalDigits = normalizePostalCodeDigits(input.postalCode);
  const bestByLocality = new Map<string, AddressRecord>();

  if (targetPostalDigits.length === 0) {
    return [];
  }

  for (const record of records) {
    const city = record.parts.city?.trim();

    if (
      record.replicationStatus !== "active" ||
      !record.searchVisible ||
      city === undefined ||
      city.length === 0 ||
      (input.countryCode !== undefined && record.countryCode !== input.countryCode) ||
      !recordPostalCodeDigits(record).startsWith(targetPostalDigits)
    ) {
      continue;
    }

    const localityCountryCode = record.parts.countryCode ?? record.countryCode;
    const key = [localityCountryCode, targetPostalDigits, normalizeSearchText(city)].join("|");
    const existing = bestByLocality.get(key);

    if (
      existing === undefined ||
      record.quality > existing.quality ||
      (record.quality === existing.quality &&
        record.displayLabel.localeCompare(existing.displayLabel) < 0)
    ) {
      bestByLocality.set(key, record);
    }
  }

  return [...bestByLocality.values()].toSorted((left, right) => {
    const leftCity = left.parts.city ?? "";
    const rightCity = right.parts.city ?? "";

    return (
      leftCity.localeCompare(rightCity) ||
      (left.parts.region ?? "").localeCompare(right.parts.region ?? "") ||
      right.quality - left.quality ||
      left.displayLabel.localeCompare(right.displayLabel)
    );
  });
};

export const hasAddressSearchPrefixToken = (query: string) => {
  return createQuerySearchPrefixes(query).length > 0;
};

export type RankedAddressRecordCandidate = AddressRecord & {
  confidence: number;
};

export const rankAddressRecordResults = (
  query: string,
  records: readonly AddressRecord[],
  limit: number,
) => {
  const candidates: RankedAddressRecordCandidate[] = records.map((record) => ({
    ...record,
    confidence: record.quality,
  }));

  return rankAddressCandidates<RankedAddressRecordCandidate>(query, candidates, { limit }).map(
    (result) => {
      const { candidate } = result;
      const { confidence: _confidence, ...record } = candidate;

      return record;
    },
  );
};

export const mergeUniqueAddressRecords = (records: readonly AddressRecord[]) => {
  const byRecordId = new Map<string, AddressRecord>();

  for (const record of records) {
    byRecordId.set(record.id, record);
  }

  return [...byRecordId.values()];
};

export const addressCountForRecord = (record: AddressRecord) => record.ranking?.addressCount ?? 0;

export const rankLocalityCityRecords = (limit: number, records: readonly AddressRecord[]) =>
  mergeUniqueAddressRecords(records)
    .toSorted(
      (left, right) =>
        addressCountForRecord(right) - addressCountForRecord(left) ||
        right.quality - left.quality ||
        (left.parts.city ?? left.displayLabel).localeCompare(
          right.parts.city ?? right.displayLabel,
          "cs-CZ",
        ) ||
        left.id.localeCompare(right.id, "cs-CZ"),
    )
    .slice(0, limit);

export const artifactFirstTokenPrefixForQuery = (query: string, maxLength = 64) => {
  const [token] = tokenizeAddressText(query);

  return token === undefined ? "" : token.slice(0, maxLength);
};

export const localityRecordMatchesQueryPrefix = (queryPrefix: string, record: AddressRecord) =>
  tokenizeAddressText(
    [record.parts.city, record.searchLabel, record.displayLabel]
      .filter((part) => part !== undefined)
      .join(" "),
  ).some((token) => token.startsWith(queryPrefix));


export const withTimestamps = <T extends { id: string }>(input: T, previous?: { createdAt: string }) => {
  const timestamp = nowIso();

  return {
    ...input,
    createdAt: previous?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
};

export const assertCachePolicyAllowsWrite = (policy: ProviderCachePolicy) => {
  if (policy.kind === "none") {
    throw new SmartSuggestStorageError(
      "cache-policy-violation",
      "Provider cache policy forbids persistent cache writes.",
    );
  }
};

export const readSuggestionMetadataNumber = (
  metadata: SmartSuggestSuggestion["metadata"],
  keys: readonly string[],
) => {
  if (metadata === undefined) {
    return;
  }

  for (const key of keys) {
    const value = metadata[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string") {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return;
};

export const normalizeSuggestionId = (value: string) =>
  normalizeSearchText(value).replaceAll(/\s+/g, "-").slice(0, 160);

export const createAddressRecordFromSuggestion = ({
  countryCode,
  sourceId,
  suggestion,
}: AddressRecordFromSuggestionInput): AddressSearchRecordInput => {
  const id = `live:${sourceId}:${normalizeSuggestionId(suggestion.id)}`;
  const record: AddressSearchRecordInput = {
    countryCode,
    displayLabel: suggestion.displayLabel,
    id,
    parts: {
      ...suggestion.address,
      countryCode: suggestion.address?.countryCode ?? countryCode,
    },
    quality: Math.max(0, Math.min(1, suggestion.confidence)),
    searchLabel: normalizeSearchText(suggestion.searchLabel ?? suggestion.displayLabel),
    sourceId,
  };
  const latitude = readSuggestionMetadataNumber(suggestion.metadata, ["latitude", "lat"]);
  const longitude = readSuggestionMetadataNumber(suggestion.metadata, ["longitude", "lng", "lon"]);

  if (latitude !== undefined) {
    record.latitude = latitude;
  }
  if (longitude !== undefined) {
    record.longitude = longitude;
  }
  if (suggestion.attribution !== undefined) {
    record.attribution = suggestion.attribution;
  }

  return record;
};

export const isCacheExpired = (record: SuggestCacheRecord) =>
  record.expiresAt !== undefined && Date.parse(record.expiresAt) <= Date.now();

export const parseJsonValue = <T>(value: string | null | undefined, fallback: T): T => {
  if (value === undefined || value === null || value.trim().length === 0) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

export const parseJsonRecord = (value: string | null | undefined): Record<string, JsonValue> => {
  const parsed = parseJsonValue<JsonValue>(value, {});

  return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
    ? (parsed as Record<string, JsonValue>)
    : {};
};

export const parseJsonStringArray = (value: string | null | undefined) => {
  const parsed = parseJsonValue<JsonValue>(value, []);

  return Array.isArray(parsed) && parsed.every((entry) => typeof entry === "string") ? parsed : [];
};

export const normalizeOptionalShardText = (value: string | undefined) => {
  const normalized = value?.trim();

  return normalized === undefined || normalized.length === 0 ? undefined : normalized;
};

export const normalizeShardPostalPrefix = (value: string) => value.replaceAll(/\D/gu, "");

export const uniqueSortedStrings = (values: Iterable<string>) =>
  [...new Set(values)].toSorted((left, right) => left.localeCompare(right));

export const normalizeShardPostalPrefixes = (values: readonly string[] = []) =>
  uniqueSortedStrings(
    values.map(normalizeShardPostalPrefix).filter((value) => value.length > 0),
  ).toSorted((left, right) => right.length - left.length);

export const normalizeShardMunicipalityCodes = (values: readonly string[] = []) =>
  uniqueSortedStrings(values.map((value) => value.trim()).filter((value) => value.length > 0));

export const normalizeShardMunicipalityHints = (values: readonly string[] = []) =>
  uniqueSortedStrings(
    values.map((value) => normalizeSearchText(value).trim()).filter((value) => value.length > 0),
  );

export const normalizeNonNegativeInteger = (value: number | undefined) =>
  value === undefined ? undefined : Math.max(0, Math.trunc(value));

export const normalizeShardRegionKind = (value: string): SmartSuggestShardRegionKind => {
  if (
    value === "country" ||
    value === "municipality" ||
    value === "postal-prefix" ||
    value === "vusc"
  ) {
    return value;
  }

  return "vusc";
};

export const normalizeShardState = (value: string): SmartSuggestShardState => {
  if (value === "disabled" || value === "standby") {
    return value;
  }

  return "active";
};

export const normalizeShardMetadataInput = (
  input: SmartSuggestShardMetadataUpsertInput,
  previous?: Pick<SmartSuggestShardMetadataRecord, "createdAt">,
): SmartSuggestShardMetadataRecord => {
  const timestamp = nowIso();
  const record: SmartSuggestShardMetadataRecord = {
    bindingName: input.bindingName.trim(),
    countryCode: input.countryCode,
    createdAt: previous?.createdAt ?? timestamp,
    municipalityCodes: normalizeShardMunicipalityCodes(input.municipalityCodes),
    municipalityHints: normalizeShardMunicipalityHints(input.municipalityHints),
    postalPrefixes: normalizeShardPostalPrefixes(input.postalPrefixes),
    regionCode: input.regionCode.trim(),
    regionKind: input.regionKind,
    regionName: input.regionName.trim(),
    rowCount: normalizeNonNegativeInteger(input.rowCount) ?? 0,
    shardId: input.shardId.trim(),
    state: input.state,
    updatedAt: timestamp,
  };
  const estimatedSizeBytes = normalizeNonNegativeInteger(input.estimatedSizeBytes);
  const importVersion = normalizeOptionalShardText(input.importVersion);
  const lastImportCompletedAt = normalizeOptionalShardText(input.lastImportCompletedAt);
  const sourceFreshnessAt = normalizeOptionalShardText(input.sourceFreshnessAt);

  if (estimatedSizeBytes !== undefined) {
    record.estimatedSizeBytes = estimatedSizeBytes;
  }
  if (importVersion !== undefined) {
    record.importVersion = importVersion;
  }
  if (lastImportCompletedAt !== undefined) {
    record.lastImportCompletedAt = lastImportCompletedAt;
  }
  if (sourceFreshnessAt !== undefined) {
    record.sourceFreshnessAt = sourceFreshnessAt;
  }

  return record;
};

export const toShardMetadataInsert = (record: SmartSuggestShardMetadataRecord) =>
  ({
    bindingName: record.bindingName,
    countryCode: record.countryCode,
    createdAt: record.createdAt,
    estimatedSizeBytes: record.estimatedSizeBytes ?? null,
    importVersion: record.importVersion ?? null,
    lastImportCompletedAt: record.lastImportCompletedAt ?? null,
    municipalityCodesJson: JSON.stringify(record.municipalityCodes),
    municipalityHintsJson: JSON.stringify(record.municipalityHints),
    postalPrefixesJson: JSON.stringify(record.postalPrefixes),
    regionCode: record.regionCode,
    regionKind: record.regionKind,
    regionName: record.regionName,
    rowCount: record.rowCount,
    shardId: record.shardId,
    sourceFreshnessAt: record.sourceFreshnessAt ?? null,
    state: record.state,
    updatedAt: record.updatedAt,
  }) satisfies typeof smartSuggestShardRegistry.$inferInsert;

export const toShardMetadataRecord = (
  row: typeof smartSuggestShardRegistry.$inferSelect,
): SmartSuggestShardMetadataRecord => {
  const record: SmartSuggestShardMetadataRecord = {
    bindingName: row.bindingName,
    countryCode: asCountryCode(row.countryCode, "shard registry country_code"),
    createdAt: row.createdAt,
    municipalityCodes: normalizeShardMunicipalityCodes(
      parseJsonStringArray(row.municipalityCodesJson),
    ),
    municipalityHints: normalizeShardMunicipalityHints(
      parseJsonStringArray(row.municipalityHintsJson),
    ),
    postalPrefixes: normalizeShardPostalPrefixes(parseJsonStringArray(row.postalPrefixesJson)),
    regionCode: row.regionCode,
    regionKind: normalizeShardRegionKind(row.regionKind),
    regionName: row.regionName,
    rowCount: row.rowCount,
    shardId: row.shardId,
    state: normalizeShardState(row.state),
    updatedAt: row.updatedAt,
  };

  if (row.estimatedSizeBytes !== null) {
    record.estimatedSizeBytes = row.estimatedSizeBytes;
  }
  if (row.importVersion !== null) {
    record.importVersion = row.importVersion;
  }
  if (row.lastImportCompletedAt !== null) {
    record.lastImportCompletedAt = row.lastImportCompletedAt;
  }
  if (row.sourceFreshnessAt !== null) {
    record.sourceFreshnessAt = row.sourceFreshnessAt;
  }

  return record;
};

export const normalizeShardResolveStates = (states: readonly SmartSuggestShardState[] | undefined) => [
  ...new Set(states ?? ["active"]),
];

export const scoreShardMetadataRoute = (
  record: SmartSuggestShardMetadataRecord,
  input: SmartSuggestShardMetadataResolveInput,
) => {
  const regionCode = input.regionCode?.trim();
  const municipalityCode = input.municipalityCode?.trim();
  const municipalityHint =
    input.municipalityHint === undefined
      ? undefined
      : normalizeSearchText(input.municipalityHint).trim();
  const postalCode =
    input.postalCode === undefined ? undefined : normalizeShardPostalPrefix(input.postalCode);
  let score = 0;

  if (regionCode !== undefined && record.regionCode === regionCode) {
    score = Math.max(score, 100);
  }
  if (municipalityCode !== undefined && record.municipalityCodes.includes(municipalityCode)) {
    score = Math.max(score, 80);
  }
  if (postalCode !== undefined && postalCode.length > 0) {
    const matchingPostalPrefix = record.postalPrefixes.find((prefix) =>
      postalCode.startsWith(prefix),
    );

    if (matchingPostalPrefix !== undefined) {
      score = Math.max(score, 60 + matchingPostalPrefix.length);
    }
  }
  if (
    municipalityHint !== undefined &&
    municipalityHint.length > 0 &&
    record.municipalityHints.includes(municipalityHint)
  ) {
    score = Math.max(score, 40);
  }
  if (
    score === 0 &&
    regionCode === undefined &&
    municipalityCode === undefined &&
    municipalityHint === undefined &&
    postalCode === undefined &&
    record.regionKind === "country"
  ) {
    score = 10;
  }

  return score;
};

export const resolveShardMetadataMatches = (
  records: readonly SmartSuggestShardMetadataRecord[],
  input: SmartSuggestShardMetadataResolveInput,
) => {
  const states = new Set(normalizeShardResolveStates(input.states));

  return records
    .filter((record) => record.countryCode === input.countryCode && states.has(record.state))
    .map((record) => ({
      record,
      score: scoreShardMetadataRoute(record, input),
    }))
    .filter((match) => match.score > 0)
    .toSorted(
      (left, right) =>
        right.score - left.score ||
        left.record.regionCode.localeCompare(right.record.regionCode) ||
        left.record.shardId.localeCompare(right.record.shardId),
    )
    .map((match) => match.record);
};

export const nullableNumber = (value: number | undefined) => value ?? null;

export const nullableText = (value: string | undefined) => value ?? null;

export const nullableBoolean = (value: boolean | undefined) => value ?? null;

export const normalizeReplicationStatus = (input: AddressSearchRecordInput): AddressReplicationStatus => {
  if (input.replicationStatus !== undefined) {
    return input.replicationStatus;
  }

  if (input.visibility?.replicationStatus !== undefined) {
    return input.visibility.replicationStatus;
  }

  if (input.visibility?.invalid === true) {
    return "invalid";
  }

  return "active";
};

export const normalizeSearchVisible = (input: AddressSearchRecordInput) =>
  input.searchVisible ??
  input.visibility?.searchVisible ??
  normalizeReplicationStatus(input) === "active";

export const sourceRecordTypeForLineage = (lineage: AddressRecordSourceLineage | undefined) =>
  lineage?.sourceRecordType ?? "address-place";

export const sourceRecordIdForRecord = (input: {
  id: string;
  ruian?: AddressRecordRuianIdentifiers;
  sourceLineage?: AddressRecordSourceLineage;
}) =>
  input.sourceLineage?.sourceRecordId ??
  input.ruian?.addressPlaceCode ??
  input.sourceLineage?.sourceRowId ??
  input.id;

export const toAddressRuianIdentifiers = (row: {
  ruianAddressPlaceCode: string | null;
  ruianBuildingObjectCode: string | null;
  ruianDistrictCode: string | null;
  ruianMunicipalityCode: string | null;
  ruianMunicipalityDistrictCode: string | null;
  ruianMunicipalityPartCode: string | null;
  ruianPostalCode: string | null;
  ruianRegionCode: string | null;
  ruianStreetCode: string | null;
}): AddressRecordRuianIdentifiers | undefined => {
  if (row.ruianAddressPlaceCode === null) {
    return;
  }

  const ruian: AddressRecordRuianIdentifiers = {
    addressPlaceCode: row.ruianAddressPlaceCode,
    stableAddressId: `ruian-cz:${row.ruianAddressPlaceCode}`,
  };

  if (row.ruianBuildingObjectCode !== null) {
    ruian.buildingObjectCode = row.ruianBuildingObjectCode;
  }
  if (row.ruianDistrictCode !== null) {
    ruian.districtCode = row.ruianDistrictCode;
  }
  if (row.ruianMunicipalityCode !== null) {
    ruian.municipalityCode = row.ruianMunicipalityCode;
  }
  if (row.ruianMunicipalityDistrictCode !== null) {
    ruian.municipalityDistrictCode = row.ruianMunicipalityDistrictCode;
  }
  if (row.ruianMunicipalityPartCode !== null) {
    ruian.municipalityPartCode = row.ruianMunicipalityPartCode;
  }
  if (row.ruianPostalCode !== null) {
    ruian.postalCode = row.ruianPostalCode;
  }
  if (row.ruianRegionCode !== null) {
    ruian.regionCode = row.ruianRegionCode;
  }
  if (row.ruianStreetCode !== null) {
    ruian.streetCode = row.ruianStreetCode;
  }

  return ruian;
};

export const toAddressSourceLineage = (row: {
  datasetVersion?: string | null;
  id?: string;
  lastImportRunId: string | null;
  sourceAtomEntryId: string | null;
  sourceChecksumSha256: string | null;
  sourceFeedId: string | null;
  sourceFileKind: string | null;
  sourceId: string;
  sourceRecordId: string | null;
  sourceRecordType: string | null;
  sourceGeneratedAt: string | null;
  sourceUri: string | null;
  sourceValidAt: string | null;
  sourceVersion: string | null;
}): AddressRecordSourceLineage | undefined => {
  const sourceRowId = row.sourceRecordId ?? row.id;

  if (sourceRowId === undefined) {
    return;
  }

  const lineage: AddressRecordSourceLineage = {
    sourceId: row.sourceId,
    sourceRowId,
  };

  if (row.sourceAtomEntryId !== null) {
    lineage.atomEntryId = row.sourceAtomEntryId;
  }
  if (row.sourceChecksumSha256 !== null) {
    lineage.checksumSha256 = row.sourceChecksumSha256;
  }
  if (row.datasetVersion !== undefined && row.datasetVersion !== null) {
    lineage.datasetVersion = row.datasetVersion;
  }
  if (row.sourceFileKind !== null) {
    lineage.fileKind = row.sourceFileKind;
  }
  if (row.sourceFeedId !== null) {
    lineage.feedId = row.sourceFeedId;
  }
  if (row.lastImportRunId !== null) {
    lineage.lastImportRunId = row.lastImportRunId;
  }
  if (row.sourceGeneratedAt !== null) {
    lineage.sourceGeneratedAt = row.sourceGeneratedAt;
  }
  if (row.sourceRecordId !== null) {
    lineage.sourceRecordId = row.sourceRecordId;
  }
  if (row.sourceRecordType !== null) {
    lineage.sourceRecordType = row.sourceRecordType;
  }
  if (row.sourceUri !== null) {
    lineage.sourceUri = row.sourceUri;
    lineage.snapshotUri = row.sourceUri;
  }
  if (row.sourceValidAt !== null) {
    lineage.sourceValidAt = row.sourceValidAt;
  }
  if (row.sourceVersion !== null) {
    lineage.sourceVersion = row.sourceVersion;
  }

  return lineage;
};

export const toAddressVisibility = (row: {
  invalidReason: string | null;
  replicationStatus: string;
  searchVisible: boolean;
  sourceChangeProposalGlobalId: string | null;
  sourceInvalid: boolean | null;
  sourceStatus: string | null;
  sourceTransactionId: string | null;
  sourceValidFrom: string | null;
  sourceValidTo: string | null;
}): AddressRecordVisibility => {
  const visibility: AddressRecordVisibility = {
    replicationStatus: asLiteral(
      row.replicationStatus,
      addressReplicationStatuses,
      "address visibility replication_status",
    ),
    searchVisible: row.searchVisible,
  };

  if (row.sourceChangeProposalGlobalId !== null) {
    visibility.changeProposalGlobalId = row.sourceChangeProposalGlobalId;
  }
  if (row.sourceInvalid !== null) {
    visibility.invalid = row.sourceInvalid;
  }
  if (row.invalidReason !== null) {
    visibility.reason = row.invalidReason;
  }
  if (row.sourceStatus !== null) {
    visibility.sourceStatus = row.sourceStatus;
  }
  if (row.sourceTransactionId !== null) {
    visibility.transactionId = row.sourceTransactionId;
  }
  if (row.sourceValidFrom !== null) {
    visibility.validFrom = row.sourceValidFrom;
  }
  if (row.sourceValidTo !== null) {
    visibility.validTo = row.sourceValidTo;
  }

  return visibility;
};

export const toAttribution = (row: {
  attributionLabel: string;
  attributionLicense: string | null;
  attributionUrl: string | null;
}): SuggestionAttribution => {
  const attribution: SuggestionAttribution = { label: row.attributionLabel };

  if (row.attributionLicense !== null) {
    attribution.license = row.attributionLicense;
  }
  if (row.attributionUrl !== null) {
    attribution.url = row.attributionUrl;
  }

  return attribution;
};

export const toDataSourceRecord = (row: typeof smartSuggestDataSources.$inferSelect): DataSourceRecord => {
  const record: DataSourceRecord = {
    attribution: toAttribution(row),
    cachePolicy: parseJsonValue<ProviderCachePolicy>(row.cachePolicyJson, {
      kind: "none",
    }),
    countryCode: asCountryCode(row.countryCode, "data source country_code"),
    createdAt: row.createdAt,
    id: row.id,
    name: row.name,
    sourceKind: asLiteral(row.sourceKind, suggestionSourceKinds, "data source source_kind"),
    updatedAt: row.updatedAt,
  };

  if (row.datasetVersion !== null) {
    record.datasetVersion = row.datasetVersion;
  }
  if (row.modificationNoteSha256 !== null) {
    record.modificationNoteSha256 = row.modificationNoteSha256;
  }
  if (row.region !== null) {
    record.region = row.region;
  }

  return record;
};

export const toTenantRecord = (row: typeof smartSuggestTenants.$inferSelect): TenantRecord => ({
  allowedOrigins: parseJsonStringArray(row.allowedOriginsJson),
  countryConfig: parseJsonRecord(row.countryConfigJson),
  createdAt: row.createdAt,
  id: row.id,
  name: row.name,
  providerPriority: parseJsonStringArray(row.providerPriorityJson),
  status: row.status === "disabled" ? "disabled" : "active",
  updatedAt: row.updatedAt,
});

export const toApiKeyRecord = (row: typeof smartSuggestApiKeys.$inferSelect): ApiKeyRecord => {
  const record: ApiKeyRecord = {
    createdAt: row.createdAt,
    id: row.id,
    keyHash: row.keyHash,
    label: row.label,
    status: row.status === "revoked" ? "revoked" : "active",
    tenantId: row.tenantId,
  };

  if (row.revokedAt !== null) {
    record.revokedAt = row.revokedAt;
  }

  return record;
};

export const toImportRunRecord = (row: typeof smartSuggestImportRuns.$inferSelect): ImportRunRecord => {
  const record: ImportRunRecord = {
    failedRows: row.failedRows,
    id: row.id,
    insertedRows: row.insertedRows,
    shardCountryCode: asCountryCode(row.shardCountryCode, "import run shard_country_code"),
    skippedRows: row.skippedRows,
    sourceId: row.sourceId,
    startedAt: row.startedAt,
    status: asLiteral(row.status, importRunStatuses, "import run status"),
    tombstonedRows: row.tombstonedRows,
    totalRows: row.totalRows,
    upsertedRows: row.upsertedRows,
  };

  if (row.sourceAtomEntryId !== null) {
    record.atomEntryId = row.sourceAtomEntryId;
  }
  if (row.sourceChecksumSha256 !== null) {
    record.checksumSha256 = row.sourceChecksumSha256;
  }
  if (row.completedAt !== null) {
    record.completedAt = row.completedAt;
  }
  if (row.errorSummary !== null) {
    record.errorSummary = row.errorSummary;
  }
  if (row.importKind !== null) {
    record.importKind = asLiteral(row.importKind, addressImportKinds, "import run import_kind");
  }
  if (row.sourceFeedId !== null) {
    record.sourceFeedId = row.sourceFeedId;
  }
  if (row.sourceGeneratedAt !== null) {
    record.sourceGeneratedAt = row.sourceGeneratedAt;
  }
  if (row.sourceUri !== null) {
    record.sourceUri = row.sourceUri;
  }
  if (row.sourceValidAt !== null) {
    record.sourceValidAt = row.sourceValidAt;
  }
  if (row.sourceVersion !== null) {
    record.sourceVersion = row.sourceVersion;
  }

  return record;
};

export const toAddressParts = (row: typeof smartSuggestAddressRecords.$inferSelect): AddressParts => {
  const parts: AddressParts = {
    countryCode: asCountryCode(row.countryCode, "address parts country_code"),
  };

  if (row.city !== null) {
    parts.city = row.city;
  }
  if (row.district !== null) {
    parts.district = row.district;
  }
  if (row.houseNumber !== null) {
    parts.houseNumber = row.houseNumber;
  }
  if (row.line1 !== null) {
    parts.line1 = row.line1;
  }
  if (row.line2 !== null) {
    parts.line2 = row.line2;
  }
  if (row.orientationNumber !== null) {
    parts.orientationNumber = row.orientationNumber;
  }
  if (row.postalCode !== null) {
    parts.postalCode = row.postalCode;
  }
  if (row.region !== null) {
    parts.region = row.region;
  }
  if (row.street !== null) {
    parts.street = row.street;
  }

  return parts;
};

export const toAddressRecord = (row: typeof smartSuggestAddressRecords.$inferSelect): AddressRecord => {
  const record: AddressRecord = {
    countryCode: asCountryCode(row.countryCode, "address record country_code"),
    createdAt: row.createdAt,
    displayLabel: row.displayLabel,
    id: row.id,
    parts: toAddressParts(row),
    quality: row.quality,
    replicationStatus: asLiteral(
      row.replicationStatus,
      addressReplicationStatuses,
      "address record replication_status",
    ),
    searchLabel: row.searchLabel,
    searchVisible: row.searchVisible,
    sourceId: row.sourceId,
    updatedAt: row.updatedAt,
  };

  if (row.attributionJson !== null) {
    const attribution = parseJsonValue<SuggestionAttribution | undefined>(
      row.attributionJson,
      undefined,
    );

    if (attribution !== undefined) {
      record.attribution = attribution;
    }
  }
  if (row.latitude !== null) {
    record.latitude = row.latitude;
  }
  if (row.longitude !== null) {
    record.longitude = row.longitude;
  }

  const ruian = toAddressRuianIdentifiers(row);
  const sourceLineage = toAddressSourceLineage(row);

  if (ruian !== undefined) {
    record.ruian = ruian;
  }
  if (sourceLineage !== undefined) {
    record.sourceLineage = sourceLineage;
  }
  record.visibility = toAddressVisibility(row);

  return record;
};

export const toAddressTombstoneRecord = (
  row: typeof smartSuggestAddressTombstones.$inferSelect,
): AddressTombstoneRecord => {
  const record: AddressTombstoneRecord = {
    countryCode: asCountryCode(row.countryCode, "address tombstone country_code"),
    createdAt: row.createdAt,
    id: row.id,
    sourceId: row.sourceId,
    updatedAt: row.updatedAt,
  };

  if (row.deletedAt !== null) {
    record.deletedAt = row.deletedAt;
  }
  if (row.reason !== null) {
    record.reason = row.reason;
  }

  const ruian = toAddressRuianIdentifiers(row);
  const sourceLineage = toAddressSourceLineage(row);

  if (ruian !== undefined) {
    record.ruian = ruian;
  }
  if (sourceLineage !== undefined) {
    record.sourceLineage = sourceLineage;
  }

  return record;
};

export type AddressRecordRow = typeof smartSuggestAddressRecords.$inferSelect;
export type AddressTombstoneRow = typeof smartSuggestAddressTombstones.$inferSelect;

export const nullableJson = (value: JsonValue | undefined) =>
  value === undefined ? null : JSON.stringify(value);

export const toStoredAddressTombstoneMetadata = (
  input: AddressSearchRecordInput,
  replicationStatus: AddressReplicationStatus,
) => ({
  tombstoneReason:
    replicationStatus === "tombstoned" ? nullableText(input.visibility?.reason) : null,
  tombstonedAt: replicationStatus === "tombstoned" ? nullableText(input.visibility?.validTo) : null,
});

export const toStoredRuianColumns = (ruian: AddressRecordRuianIdentifiers | undefined) => ({
  ruianAddressPlaceCode: nullableText(ruian?.addressPlaceCode),
  ruianBuildingObjectCode: nullableText(ruian?.buildingObjectCode),
  ruianDistrictCode: nullableText(ruian?.districtCode),
  ruianMunicipalityCode: nullableText(ruian?.municipalityCode),
  ruianMunicipalityDistrictCode: nullableText(ruian?.municipalityDistrictCode),
  ruianMunicipalityPartCode: nullableText(ruian?.municipalityPartCode),
  ruianPostalCode: nullableText(ruian?.postalCode),
  ruianRegionCode: nullableText(ruian?.regionCode),
  ruianStreetCode: nullableText(ruian?.streetCode),
});

export const toStoredSourceLineageColumns = (sourceLineage: AddressRecordSourceLineage | undefined) => ({
  lastImportRunId: nullableText(sourceLineage?.lastImportRunId),
  sourceAtomEntryId: nullableText(sourceLineage?.atomEntryId),
  sourceChecksumSha256: nullableText(sourceLineage?.checksumSha256),
  sourceFeedId: nullableText(sourceLineage?.feedId),
  sourceFileKind: nullableText(sourceLineage?.fileKind),
  sourceGeneratedAt: nullableText(sourceLineage?.sourceGeneratedAt),
  sourceUri: nullableText(sourceLineage?.sourceUri ?? sourceLineage?.snapshotUri),
  sourceValidAt: nullableText(sourceLineage?.sourceValidAt),
  sourceVersion: nullableText(sourceLineage?.sourceVersion),
});

export const toAddressRecordRow = (
  input: AddressSearchRecordInput,
  timestamp: string,
): AddressRecordRow => {
  const replicationStatus = normalizeReplicationStatus(input);
  const sourceLineage = input.sourceLineage;

  return {
    attributionJson: nullableJson(input.attribution),
    city: input.parts.city ?? null,
    countryCode: input.countryCode,
    createdAt: timestamp,
    displayLabel: input.displayLabel,
    district: input.parts.district ?? null,
    houseNumber: input.parts.houseNumber ?? null,
    id: input.id,
    invalidReason: nullableText(input.visibility?.reason),
    latitude: nullableNumber(input.latitude),
    line1: input.parts.line1 ?? null,
    line2: input.parts.line2 ?? null,
    longitude: nullableNumber(input.longitude),
    orientationNumber: input.parts.orientationNumber ?? null,
    postalCode: input.parts.postalCode ?? null,
    quality: input.quality,
    region: input.parts.region ?? null,
    replicationStatus,
    ...toStoredRuianColumns(input.ruian),
    searchLabel: input.searchLabel,
    searchVisible: normalizeSearchVisible(input),
    sourceChangeProposalGlobalId: nullableText(input.visibility?.changeProposalGlobalId),
    sourceId: input.sourceId,
    sourceInvalid: nullableBoolean(input.visibility?.invalid),
    sourceRecordId: sourceRecordIdForRecord(input),
    sourceRecordType: sourceRecordTypeForLineage(sourceLineage),
    sourceStatus: nullableText(input.visibility?.sourceStatus),
    sourceTransactionId: nullableText(input.visibility?.transactionId),
    ...toStoredSourceLineageColumns(sourceLineage),
    sourceValidFrom: nullableText(input.visibility?.validFrom),
    sourceValidTo: nullableText(input.visibility?.validTo),
    street: input.parts.street ?? null,
    ...toStoredAddressTombstoneMetadata(input, replicationStatus),
    updatedAt: timestamp,
  };
};

export const excludedColumn = (columnName: string) => sql.raw(`excluded.${columnName}`);

export const addressRecordExcludedUpdateSet = {
  attributionJson: excludedColumn("attribution_json"),
  city: excludedColumn("city"),
  countryCode: excludedColumn("country_code"),
  displayLabel: excludedColumn("display_label"),
  district: excludedColumn("district"),
  houseNumber: excludedColumn("house_number"),
  invalidReason: excludedColumn("invalid_reason"),
  lastImportRunId: excludedColumn("last_import_run_id"),
  latitude: excludedColumn("latitude"),
  line1: excludedColumn("line_1"),
  line2: excludedColumn("line_2"),
  longitude: excludedColumn("longitude"),
  orientationNumber: excludedColumn("orientation_number"),
  postalCode: excludedColumn("postal_code"),
  quality: excludedColumn("quality"),
  region: excludedColumn("region"),
  replicationStatus: excludedColumn("replication_status"),
  ruianAddressPlaceCode: excludedColumn("ruian_address_place_code"),
  ruianBuildingObjectCode: excludedColumn("ruian_building_object_code"),
  ruianDistrictCode: excludedColumn("ruian_district_code"),
  ruianMunicipalityCode: excludedColumn("ruian_municipality_code"),
  ruianMunicipalityDistrictCode: excludedColumn("ruian_municipality_district_code"),
  ruianMunicipalityPartCode: excludedColumn("ruian_municipality_part_code"),
  ruianPostalCode: excludedColumn("ruian_postal_code"),
  ruianRegionCode: excludedColumn("ruian_region_code"),
  ruianStreetCode: excludedColumn("ruian_street_code"),
  searchLabel: excludedColumn("search_label"),
  searchVisible: excludedColumn("search_visible"),
  sourceAtomEntryId: excludedColumn("source_atom_entry_id"),
  sourceChangeProposalGlobalId: excludedColumn("source_change_proposal_global_id"),
  sourceChecksumSha256: excludedColumn("source_checksum_sha256"),
  sourceFeedId: excludedColumn("source_feed_id"),
  sourceFileKind: excludedColumn("source_file_kind"),
  sourceGeneratedAt: excludedColumn("source_generated_at"),
  sourceId: excludedColumn("source_id"),
  sourceInvalid: excludedColumn("source_invalid"),
  sourceRecordId: excludedColumn("source_record_id"),
  sourceRecordType: excludedColumn("source_record_type"),
  sourceStatus: excludedColumn("source_status"),
  sourceTransactionId: excludedColumn("source_transaction_id"),
  sourceUri: excludedColumn("source_uri"),
  sourceValidAt: excludedColumn("source_valid_at"),
  sourceValidFrom: excludedColumn("source_valid_from"),
  sourceValidTo: excludedColumn("source_valid_to"),
  sourceVersion: excludedColumn("source_version"),
  street: excludedColumn("street"),
  tombstoneReason: excludedColumn("tombstone_reason"),
  tombstonedAt: excludedColumn("tombstoned_at"),
  updatedAt: excludedColumn("updated_at"),
};

export const toAddressTombstoneRow = (
  input: AddressTombstoneRecordInput,
  timestamp: string,
): AddressTombstoneRow => {
  const sourceLineage = input.sourceLineage;

  return {
    countryCode: input.countryCode,
    createdAt: timestamp,
    deletedAt: input.deletedAt ?? null,
    id: input.id,
    reason: input.reason ?? null,
    ...toStoredRuianColumns(input.ruian),
    sourceId: input.sourceId,
    sourceRecordId: sourceRecordIdForRecord(input),
    sourceRecordType: sourceRecordTypeForLineage(sourceLineage),
    ...toStoredSourceLineageColumns(sourceLineage),
    updatedAt: timestamp,
  };
};

export const toAddressTombstoneUpdateSet = (row: AddressTombstoneRow) => ({
  deletedAt: row.deletedAt,
  lastImportRunId: row.lastImportRunId,
  reason: row.reason,
  ruianAddressPlaceCode: row.ruianAddressPlaceCode,
  ruianBuildingObjectCode: row.ruianBuildingObjectCode,
  ruianDistrictCode: row.ruianDistrictCode,
  ruianMunicipalityCode: row.ruianMunicipalityCode,
  ruianMunicipalityDistrictCode: row.ruianMunicipalityDistrictCode,
  ruianMunicipalityPartCode: row.ruianMunicipalityPartCode,
  ruianPostalCode: row.ruianPostalCode,
  ruianRegionCode: row.ruianRegionCode,
  ruianStreetCode: row.ruianStreetCode,
  sourceAtomEntryId: row.sourceAtomEntryId,
  sourceChecksumSha256: row.sourceChecksumSha256,
  sourceFeedId: row.sourceFeedId,
  sourceFileKind: row.sourceFileKind,
  sourceGeneratedAt: row.sourceGeneratedAt,
  sourceRecordId: row.sourceRecordId,
  sourceRecordType: row.sourceRecordType,
  sourceUri: row.sourceUri,
  sourceValidAt: row.sourceValidAt,
  sourceVersion: row.sourceVersion,
  updatedAt: row.updatedAt,
});

export const countryCodesFromSuggestCacheKey = (cacheKey: string): readonly SmartSuggestCountryCode[] => {
  const [, version, , countryScope] = cacheKey.split(":");

  if (
    (version !== "v2" && version !== "v3-owned-sequence-prefix") ||
    countryScope === undefined ||
    countryScope === "global"
  ) {
    return [];
  }

  const [, allowlist] = countryScope.split("|");
  const scopeCountryCodes = allowlist === undefined ? [countryScope] : allowlist.split(",");

  return canonicalizeSmartSuggestCountryCodes(scopeCountryCodes.map(normalizeSmartSuggestCountryCode));
};

export const toSuggestCacheRecord = (
  row: typeof smartSuggestCacheEntries.$inferSelect,
): SuggestCacheRecord => {
  const record: SuggestCacheRecord = {
    cacheKey: row.cacheKey,
    cachePolicy: parseJsonValue<ProviderCachePolicy>(row.cachePolicyJson, {
      kind: "none",
    }),
    createdAt: row.createdAt,
    kind: asLiteral(row.kind, smartSuggestKinds, "suggest cache kind"),
    payload: parseJsonValue<SmartSuggestSuggestion[]>(row.payloadJson, []),
    queryHash: row.queryHash,
    status: asLiteral(row.status, smartSuggestCacheStatuses, "suggest cache status"),
    updatedAt: row.updatedAt,
  };

  if (row.countryCode !== null) {
    record.countryCode = asCountryCode(row.countryCode, "suggest cache country_code");
  }
  const countryCodes = countryCodesFromSuggestCacheKey(row.cacheKey);
  if (countryCodes.length > 0) {
    record.countryCodes = countryCodes;
  }
  if (row.expiresAt !== null) {
    record.expiresAt = row.expiresAt;
  }
  if (row.language !== null) {
    record.language = row.language;
  }
  if (row.tenantId !== null) {
    record.tenantId = row.tenantId;
  }

  return record;
};

export const toProviderEventRecord = (
  row: typeof smartSuggestProviderEvents.$inferSelect,
): ProviderEventRecord => {
  const record: ProviderEventRecord = {
    createdAt: row.createdAt,
    id: row.id,
    providerId: row.providerId,
    requestId: row.requestId,
    status: asLiteral(row.status, providerEventStatuses, "provider event status"),
  };

  if (row.errorCode !== null) {
    record.errorCode = asLiteral(row.errorCode, smartSuggestErrorCodes, "provider event error_code");
  }
  if (row.latencyMs !== null) {
    record.latencyMs = row.latencyMs;
  }
  if (row.queryHash !== null) {
    record.queryHash = row.queryHash;
  }
  if (row.tenantId !== null) {
    record.tenantId = row.tenantId;
  }

  return record;
};

export const toAcceptEventRecord = (
  row: typeof smartSuggestAcceptEvents.$inferSelect,
): AcceptEventRecord => {
  const record: AcceptEventRecord = {
    acceptedAt: row.acceptedAt,
    id: row.id,
    requestId: row.requestId,
    sourceId: row.sourceId,
    suggestionId: row.suggestionId,
  };

  if (row.tenantJson !== null) {
    const tenant = parseJsonValue<SmartSuggestTenantContext | undefined>(row.tenantJson, undefined);

    if (tenant !== undefined) {
      record.tenant = tenant;
    }
  }

  return record;
};

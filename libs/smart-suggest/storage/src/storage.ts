import { type D1ClientConfig, layer as d1ClientLayer } from "@effect/sql-d1/D1Client";
import type {
  AddressParts,
  ProviderCachePolicy,
  SmartSuggestCacheStatus,
  SmartSuggestCountryCode,
  SmartSuggestErrorCode,
  SmartSuggestKind,
  SmartSuggestSuggestion,
  SmartSuggestTenantContext,
  SuggestionAttribution,
  SuggestionSourceKind,
} from "@techsio/smart-suggest-core";
import { normalizeSuggestLimit } from "@techsio/smart-suggest-core";
import {
  createPrefixTokens,
  extractPostalCodeCandidates,
  normalizeSearchText,
  rankAddressCandidates,
  tokenizeAddressText,
} from "@techsio/smart-suggest-indexing";
import { and, desc, eq, inArray, like, or, sql } from "drizzle-orm/sql";
import { makeWithDefaults as makeD1DrizzleWithDefaults } from "drizzle-orm/effect-d1";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { Cause, Effect, Exit, Schema } from "effect";

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

const ArtifactCountryCodeSchema = Schema.String.check(Schema.isPattern(/^[A-Z]{2}$/u));
const ArtifactIsoStringSchema = Schema.String.check(Schema.isMinLength(1));
const ArtifactNonNegativeIntSchema = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0));
const ArtifactNonNegativeNumberSchema = Schema.Finite.check(Schema.isGreaterThanOrEqualTo(0));

const ArtifactProviderCachePolicySchema = Schema.Union([
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

const ArtifactAttributionSchema = Schema.Struct({
  label: Schema.NonEmptyString,
  license: Schema.optionalKey(Schema.NonEmptyString),
  url: Schema.optionalKey(Schema.NonEmptyString),
});

const ArtifactAddressPartsSchema = Schema.Struct({
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

const ArtifactDataSourceSchema = Schema.Struct({
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

const ArtifactImportRunSchema = Schema.Struct({
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

const ArtifactShardMetadataSchema = Schema.Struct({
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

const ArtifactRuianIdentifiersSchema = Schema.Struct({
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

const ArtifactSourceLineageSchema = Schema.Struct({
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

const ArtifactAddressVisibilitySchema = Schema.Struct({
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

const ArtifactAddressRecordSchema = Schema.Struct({
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
  updatedAt: ArtifactIsoStringSchema,
  visibility: Schema.optionalKey(ArtifactAddressVisibilitySchema),
});

const ArtifactPostalLocalityIndexSchema = Schema.Struct({
  complete: Schema.Boolean,
  pathTemplate: Schema.NonEmptyString,
});

const ArtifactAddressRecordIndexSchema = Schema.Struct({
  bucketCount: Schema.Int.check(Schema.isGreaterThan(0)),
  complete: Schema.Boolean,
  pathTemplate: Schema.NonEmptyString,
});

const ArtifactAddressTokenIndexSchema = Schema.Struct({
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
    postalLocalities: ArtifactPostalLocalityIndexSchema,
  }),
  schemaVersion: Schema.Literal("smart-suggest-owned-artifacts/v1"),
  shards: Schema.Array(ArtifactShardMetadataSchema),
});

export const SmartSuggestOwnedDataArtifactAddressRecordsSchema = Schema.Struct({
  complete: Schema.Boolean,
  countryCode: ArtifactCountryCodeSchema,
  datasetVersion: Schema.optionalKey(Schema.String),
  query: Schema.Struct({
    kind: Schema.Literals(["address-record-bucket", "address-token", "postal-code"]),
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

const ArtifactTokenBucketEntrySchema = Schema.Struct({
  recordCount: ArtifactNonNegativeIntSchema,
  recordIds: Schema.Array(Schema.NonEmptyString),
});

export const SmartSuggestOwnedDataArtifactTokenBucketSchema = Schema.Struct({
  bucket: ArtifactNonNegativeIntSchema,
  complete: Schema.Boolean,
  countryCode: ArtifactCountryCodeSchema,
  datasetVersion: Schema.optionalKey(Schema.String),
  schemaVersion: Schema.Literal("smart-suggest-address-token-bucket/v1"),
  tokens: Schema.Record(Schema.NonEmptyString, ArtifactTokenBucketEntrySchema),
});

const ArtifactTokenBucketPageReferenceSchema = Schema.Struct({
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

const rawSqlFailureDetailPattern = /Failed query:|params:/u;

function sanitizeStorageErrorMessage(error: unknown): string {
  const message =
    error instanceof Error ? error.message : "Smart Suggest storage operation failed.";

  if (rawSqlFailureDetailPattern.test(message)) {
    return "Smart Suggest storage operation failed during D1 SQL execution.";
  }

  return message.length > 1_000 ? `${message.slice(0, 1_000)}...` : message;
}

const toSmartSuggestStorageError = (error: unknown): SmartSuggestStorageError =>
  error instanceof SmartSuggestStorageError
    ? error
    : new SmartSuggestStorageError("storage-unavailable", sanitizeStorageErrorMessage(error));

const storageEffect = <T>(compute: () => T): SmartSuggestStorageEffect<T> =>
  Effect.try({
    try: compute,
    catch: toSmartSuggestStorageError,
  });

type StartImportRunInput = Parameters<SmartSuggestRepositories["importRuns"]["startImportRun"]>[0];

type ImportRunRestartFingerprint = {
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

const importRunRestartFingerprintFields = [
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

const toImportRunRestartFingerprint = (
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

const sequencedImportKinds = ["baseline", "delta"] as const satisfies readonly AddressImportKind[];

const isSequencedImportKind = (
  importKind: AddressImportKind | undefined,
): importKind is (typeof sequencedImportKinds)[number] =>
  importKind === "baseline" || importKind === "delta";

const assertImportRunRestartCompatible = (
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

const activeSequencedImportRunConflict = (
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

const assertNoActiveSequencedImportRun = (
  input: StartImportRunInput,
  activeRun: ImportRunRecord | undefined,
) => {
  if (activeRun === undefined) {
    return;
  }

  throw activeSequencedImportRunConflict(input, activeRun);
};

const collectErrorText = (
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

const isImportRunUniqueConstraintError = (error: unknown) =>
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

export type SmartSuggestD1Binding = D1ClientConfig["db"];

export type SmartSuggestD1SearchIndexMode = "fts-and-prefix" | "fts-only";

export type SmartSuggestD1RepositoryOptions = {
  readonly searchIndexMode?: SmartSuggestD1SearchIndexMode;
};

type SmartSuggestD1Operation<T> = Effect.Effect<T, unknown, never>;

const d1StorageOperation = <T>(
  operation: SmartSuggestD1Operation<T>,
): SmartSuggestStorageEffect<T> => Effect.mapError(operation, toSmartSuggestStorageError);

export const createSmartSuggestD1DatabaseEffect = (binding: SmartSuggestD1Binding) =>
  makeD1DrizzleWithDefaults({}).pipe(Effect.provide(d1ClientLayer({ db: binding })));

export type SmartSuggestD1Database = Effect.Success<
  ReturnType<typeof createSmartSuggestD1DatabaseEffect>
>;

const nowIso = () => new Date().toISOString();

const normalizeQueryForHash = (input: SuggestQueryHashInput) =>
  [
    input.kind,
    input.countryCode ?? "",
    input.tenantId ?? "",
    input.language ?? "",
    input.limit === undefined ? "" : String(normalizeSuggestLimit(input.limit)),
    input.query.trim().toLowerCase().replaceAll(/\s+/g, " "),
  ].join("\u001f");

const toHex = (bytes: ArrayBuffer) =>
  [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");

const computeSuggestQueryHash = async (
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
    "v1",
    input.kind,
    input.countryCode ?? "global",
    input.tenantId ?? "public",
    input.language ?? "default",
    input.queryHash,
  ].join(":");

const SEARCH_INDEX_PREFIX_OPTIONS = {
  maxLength: 16,
  minLength: 1,
} as const;
const ADDRESS_SEARCH_FTS_MIN_TEXT_TOKEN_LENGTH = 3;
const D1_ADDRESS_IMPORT_SUBCHUNK_SIZE = 10;
const D1_TOKEN_INSERT_SUBCHUNK_SIZE = 1000;
const numericTokenPattern = /^\d+$/u;
const addressSearchFtsUnavailablePattern =
  /smart_suggest_address_search_fts|no such table|no such module|no such tokenizer/iu;
const importRunUniqueConstraintPattern =
  /smart_suggest_import_runs_active_source_shard_idx|UNIQUE constraint failed/u;

const chunkItems = <TItem>(items: readonly TItem[], chunkSize: number): TItem[][] => {
  const chunks: TItem[][] = [];

  for (let itemIndex = 0; itemIndex < items.length; itemIndex += chunkSize) {
    chunks.push(items.slice(itemIndex, itemIndex + chunkSize));
  }

  return chunks;
};

type AddressSearchTokenInsert = typeof smartSuggestAddressSearchTokens.$inferInsert;

const createAddressSearchTokenRows = (
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

const createQuerySearchPrefixes = (query: string) => {
  const queryTokens = new Set(tokenizeAddressText(query));

  for (const postalCode of extractPostalCodeCandidates(query)) {
    queryTokens.add(postalCode.value);

    for (const token of tokenizeAddressText(postalCode.displayValue)) {
      queryTokens.add(token);
    }
  }

  return [...queryTokens].map((token) => token.slice(0, SEARCH_INDEX_PREFIX_OPTIONS.maxLength));
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

const normalizePostalCodeDigits = (value: string | undefined) => value?.replaceAll(/\D/g, "") ?? "";

const formatFiveDigitPostalCode = (digits: string) => `${digits.slice(0, 3)} ${digits.slice(3)}`;

const postalCodeLookupValues = (postalCode: string) => {
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

const recordPostalCodeDigits = (record: AddressRecord) =>
  normalizePostalCodeDigits(record.parts.postalCode ?? record.ruian?.postalCode);

const selectPostalLocalityAddressRecords = (
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
      recordPostalCodeDigits(record) !== targetPostalDigits
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

const hasAddressSearchPrefixToken = (query: string) => {
  const tokens = tokenizeAddressText(query);

  return (
    tokens.some((token) => token.length >= ADDRESS_SEARCH_FTS_MIN_TEXT_TOKEN_LENGTH) ||
    extractPostalCodeCandidates(query).length > 0
  );
};

type RankedAddressRecordCandidate = AddressRecord & {
  confidence: number;
};

const rankAddressRecordResults = (
  query: string,
  records: readonly AddressRecord[],
  limit: number,
) => {
  const candidates: RankedAddressRecordCandidate[] = records.map((record) => ({
    ...record,
    confidence: record.quality,
  }));

  return rankAddressCandidates(query, candidates, { limit }).map((result) => {
    const { candidate } = result;
    const { confidence: _confidence, ...record } = candidate;

    return record;
  });
};

const missingArtifactJsonBody = { _tag: "MissingArtifactJsonBody" } as const;

const defaultArtifactFetch: SmartSuggestArtifactFetch = (input, init) => fetch(input, init);

const artifactStorageError = (message: string) =>
  new SmartSuggestStorageError("storage-unavailable", message);

const artifactBaseUrl = (manifestUrl: string) => new URL(".", manifestUrl).toString();

const artifactReplacementValue = (replacements: Readonly<Record<string, string>>, key: string) =>
  encodeURIComponent(replacements[key] ?? "");

const renderArtifactPath = (template: string, replacements: Readonly<Record<string, string>>) =>
  template.replaceAll(/\{([a-zA-Z][a-zA-Z0-9]*)\}/gu, (_match, key: string) =>
    artifactReplacementValue(replacements, key),
  );

const artifactUrlForPath = (manifestUrl: string, artifactPath: string) =>
  new URL(artifactPath, artifactBaseUrl(manifestUrl)).toString();

const formatArtifactPageIndex = (page: number) => String(page).padStart(4, "0");

const formatArtifactBucket = (bucket: number) => String(bucket).padStart(4, "0");

const artifactHashModulus = 2_147_483_647;

const hashArtifactKey = (value: string) => {
  let hash = 0;

  for (const character of value) {
    hash = (Math.imul(hash, 131) + (character.codePointAt(0) ?? 0)) % artifactHashModulus;

    if (hash < 0) {
      hash += artifactHashModulus;
    }
  }

  return hash;
};

const artifactBucketForKey = (value: string, bucketCount: number) =>
  formatArtifactBucket(hashArtifactKey(value) % bucketCount);

const decodeArtifactJson = <TSchema extends Schema.Constraint>(schema: TSchema, body: unknown) =>
  Schema.decodeUnknownEffect(schema)(body).pipe(Effect.mapError(toSmartSuggestStorageError));

const fetchArtifactJson = <TSchema extends Schema.Constraint>({
  allowMissing,
  fetchImpl,
  schema,
  url,
}: {
  allowMissing: boolean;
  fetchImpl: SmartSuggestArtifactFetch;
  schema: TSchema;
  url: string;
}) =>
  Effect.tryPromise({
    catch: toSmartSuggestStorageError,
    try: (signal) =>
      fetchImpl(url, { signal }).then((response) => {
        if (allowMissing && response.status === 404) {
          return missingArtifactJsonBody;
        }
        if (!response.ok) {
          return Promise.reject(
            artifactStorageError(`Smart Suggest artifact ${url} failed with ${response.status}.`),
          );
        }

        return response.json() as Promise<unknown>;
      }),
  }).pipe(
    Effect.flatMap((body) =>
      body === missingArtifactJsonBody
        ? Effect.succeed(undefined)
        : decodeArtifactJson(schema, body),
    ),
  );

const toArtifactCountryCode = (value: string): SmartSuggestCountryCode =>
  value as SmartSuggestCountryCode;

const toArtifactAddressParts = (
  parts: Schema.Schema.Type<typeof ArtifactAddressPartsSchema>,
): AddressParts => {
  const addressParts: AddressParts = {};

  if (parts.city !== undefined) {
    addressParts.city = parts.city;
  }
  if (parts.countryCode !== undefined) {
    addressParts.countryCode = toArtifactCountryCode(parts.countryCode);
  }
  if (parts.district !== undefined) {
    addressParts.district = parts.district;
  }
  if (parts.houseNumber !== undefined) {
    addressParts.houseNumber = parts.houseNumber;
  }
  if (parts.line1 !== undefined) {
    addressParts.line1 = parts.line1;
  }
  if (parts.line2 !== undefined) {
    addressParts.line2 = parts.line2;
  }
  if (parts.orientationNumber !== undefined) {
    addressParts.orientationNumber = parts.orientationNumber;
  }
  if (parts.postalCode !== undefined) {
    addressParts.postalCode = parts.postalCode;
  }
  if (parts.region !== undefined) {
    addressParts.region = parts.region;
  }
  if (parts.street !== undefined) {
    addressParts.street = parts.street;
  }

  return addressParts;
};

const toArtifactDataSourceRecord = (
  source: SmartSuggestOwnedDataArtifactManifest["dataset"]["source"],
): DataSourceRecord => {
  const record: DataSourceRecord = {
    attribution: source.attribution,
    cachePolicy: source.cachePolicy,
    countryCode: toArtifactCountryCode(source.countryCode),
    createdAt: source.createdAt,
    id: source.id,
    name: source.name,
    sourceKind: source.sourceKind,
    updatedAt: source.updatedAt,
  };

  if (source.datasetVersion !== undefined) {
    record.datasetVersion = source.datasetVersion;
  }
  if (source.modificationNoteSha256 !== undefined) {
    record.modificationNoteSha256 = source.modificationNoteSha256;
  }
  if (source.region !== undefined) {
    record.region = source.region;
  }

  return record;
};

const toArtifactImportRunRecord = (
  run: SmartSuggestOwnedDataArtifactManifest["dataset"]["importRun"],
): ImportRunRecord => {
  const record: ImportRunRecord = {
    failedRows: run.failedRows,
    id: run.id,
    insertedRows: run.insertedRows,
    shardCountryCode: toArtifactCountryCode(run.shardCountryCode),
    skippedRows: run.skippedRows,
    sourceId: run.sourceId,
    startedAt: run.startedAt,
    status: run.status,
    tombstonedRows: run.tombstonedRows,
    totalRows: run.totalRows,
    upsertedRows: run.upsertedRows,
  };

  if (run.atomEntryId !== undefined) {
    record.atomEntryId = run.atomEntryId;
  }
  if (run.checksumSha256 !== undefined) {
    record.checksumSha256 = run.checksumSha256;
  }
  if (run.completedAt !== undefined) {
    record.completedAt = run.completedAt;
  }
  if (run.errorSummary !== undefined) {
    record.errorSummary = run.errorSummary;
  }
  if (run.importKind !== undefined) {
    record.importKind = run.importKind;
  }
  if (run.sourceFeedId !== undefined) {
    record.sourceFeedId = run.sourceFeedId;
  }
  if (run.sourceGeneratedAt !== undefined) {
    record.sourceGeneratedAt = run.sourceGeneratedAt;
  }
  if (run.sourceUri !== undefined) {
    record.sourceUri = run.sourceUri;
  }
  if (run.sourceValidAt !== undefined) {
    record.sourceValidAt = run.sourceValidAt;
  }
  if (run.sourceVersion !== undefined) {
    record.sourceVersion = run.sourceVersion;
  }

  return record;
};

const toArtifactShardMetadataRecord = (
  shard: SmartSuggestOwnedDataArtifactManifest["shards"][number],
): SmartSuggestShardMetadataRecord => {
  const record: SmartSuggestShardMetadataRecord = {
    bindingName: shard.bindingName,
    countryCode: toArtifactCountryCode(shard.countryCode),
    createdAt: shard.createdAt,
    municipalityCodes: shard.municipalityCodes,
    municipalityHints: shard.municipalityHints,
    postalPrefixes: shard.postalPrefixes,
    regionCode: shard.regionCode,
    regionKind: shard.regionKind,
    regionName: shard.regionName,
    rowCount: shard.rowCount,
    shardId: shard.shardId,
    state: shard.state,
    updatedAt: shard.updatedAt,
  };

  if (shard.estimatedSizeBytes !== undefined) {
    record.estimatedSizeBytes = shard.estimatedSizeBytes;
  }
  if (shard.importVersion !== undefined) {
    record.importVersion = shard.importVersion;
  }
  if (shard.lastImportCompletedAt !== undefined) {
    record.lastImportCompletedAt = shard.lastImportCompletedAt;
  }
  if (shard.sourceFreshnessAt !== undefined) {
    record.sourceFreshnessAt = shard.sourceFreshnessAt;
  }

  return record;
};

const toArtifactAddressRecord = (
  input: Schema.Schema.Type<typeof ArtifactAddressRecordSchema>,
): AddressRecord => {
  const record: AddressRecord = {
    countryCode: toArtifactCountryCode(input.countryCode),
    createdAt: input.createdAt,
    displayLabel: input.displayLabel,
    id: input.id,
    parts: toArtifactAddressParts(input.parts),
    quality: input.quality,
    replicationStatus: input.replicationStatus,
    searchLabel: input.searchLabel,
    searchVisible: input.searchVisible,
    sourceId: input.sourceId,
    updatedAt: input.updatedAt,
  };

  if (input.attribution !== undefined) {
    record.attribution = input.attribution;
  }
  if (input.latitude !== undefined) {
    record.latitude = input.latitude;
  }
  if (input.longitude !== undefined) {
    record.longitude = input.longitude;
  }
  if (input.ruian !== undefined) {
    record.ruian = input.ruian;
  }
  if (input.sourceLineage !== undefined) {
    record.sourceLineage = input.sourceLineage;
  }
  if (input.visibility !== undefined) {
    record.visibility = input.visibility;
  }

  return record;
};

const artifactManifestComplete = (
  manifest: SmartSuggestOwnedDataArtifactManifest,
  allowIncomplete: boolean,
) =>
  allowIncomplete ||
  (manifest.dataset.complete &&
    manifest.indexes.addressRecords.complete &&
    manifest.indexes.addressTokens.complete &&
    manifest.indexes.postalLocalities.complete);

const incompleteArtifactError = () =>
  artifactStorageError(
    "Smart Suggest owned-data artifact manifest is incomplete and cannot serve production traffic.",
  );

const mergeUniqueAddressRecords = (records: readonly AddressRecord[]) => {
  const byRecordId = new Map<string, AddressRecord>();

  for (const record of records) {
    byRecordId.set(record.id, record);
  }

  return [...byRecordId.values()];
};

const mergeRankedAddressRecords = (
  query: string,
  limit: number,
  records: readonly AddressRecord[],
) => rankAddressRecordResults(query, mergeUniqueAddressRecords(records), limit);

const artifactSequenceToken = (left: string, right: string) => `${left} ${right}`;

const artifactTokensForQuery = (
  query: string,
  index: SmartSuggestOwnedDataArtifactManifest["indexes"]["addressTokens"],
) => {
  const queryTokens = tokenizeAddressText(query);
  const singleTokens = new Set(queryTokens);
  const sequenceTokens = new Set<string>();

  for (let indexOfToken = 1; indexOfToken < queryTokens.length; indexOfToken += 1) {
    const left = queryTokens[indexOfToken - 1]?.slice(0, index.maxTokenLength);
    const right = queryTokens[indexOfToken]?.slice(0, index.maxTokenLength);

    if (
      left !== undefined &&
      right !== undefined &&
      left.length > 0 &&
      right.length >= index.minTokenLength
    ) {
      sequenceTokens.add(artifactSequenceToken(left, right));
    }
  }

  for (const postalCode of extractPostalCodeCandidates(query)) {
    singleTokens.add(postalCode.value);
  }

  const prioritizedSequenceTokens = [...sequenceTokens].toSorted(
    (left, right) => right.length - left.length || left.localeCompare(right),
  );
  const prioritizedSingleTokens = [...singleTokens]
    .map((token) => token.slice(0, index.maxTokenLength))
    .filter((token) => token.length >= index.minTokenLength)
    .toSorted((left, right) => right.length - left.length || left.localeCompare(right))
    .slice(0, 8);

  return [...prioritizedSequenceTokens, ...prioritizedSingleTokens].slice(0, 12);
};

const matchesArtifactCountry = (
  manifest: SmartSuggestOwnedDataArtifactManifest,
  countryCode: SmartSuggestCountryCode | undefined,
) =>
  countryCode === undefined || countryCode === toArtifactCountryCode(manifest.dataset.countryCode);

export const createArtifactSmartSuggestRepositories = ({
  allowIncomplete = false,
  fallback,
  fetch: fetchImpl = defaultArtifactFetch,
  manifestUrl,
  maxAddressTokenPages,
  readFallbackAddressRecords = false,
}: SmartSuggestArtifactRepositoryOptions): SmartSuggestRepositories => {
  let manifestCache: SmartSuggestOwnedDataArtifactManifest | undefined;
  const tokenManifestCache = new Map<
    string,
    SmartSuggestOwnedDataArtifactTokenManifest | undefined
  >();
  const tokenBucketCache = new Map<string, SmartSuggestOwnedDataArtifactTokenBucket | undefined>();
  const tokenBucketManifestCache = new Map<
    string,
    SmartSuggestOwnedDataArtifactTokenBucketManifest | undefined
  >();
  const tokenBucketPageCache = new Map<
    string,
    SmartSuggestOwnedDataArtifactTokenBucketPage | undefined
  >();
  const recordShardCache = new Map<string, readonly AddressRecord[]>();

  const readManifest = (): SmartSuggestStorageEffect<SmartSuggestOwnedDataArtifactManifest> => {
    if (manifestCache !== undefined) {
      return Effect.succeed(manifestCache);
    }

    return fetchArtifactJson({
      allowMissing: false,
      fetchImpl,
      schema: SmartSuggestOwnedDataArtifactManifestSchema,
      url: manifestUrl,
    }).pipe(
      Effect.flatMap((manifest) =>
        manifest === undefined
          ? Effect.fail(
              artifactStorageError("Smart Suggest owned-data artifact manifest is missing."),
            )
          : Effect.sync(() => {
              manifestCache = manifest;
              return manifest;
            }),
      ),
    );
  };

  const readCompleteManifest =
    (): SmartSuggestStorageEffect<SmartSuggestOwnedDataArtifactManifest> =>
      readManifest().pipe(
        Effect.flatMap((manifest) =>
          artifactManifestComplete(manifest, allowIncomplete)
            ? Effect.succeed(manifest)
            : Effect.fail(incompleteArtifactError()),
        ),
      );

  const readRecordShard = (
    manifest: SmartSuggestOwnedDataArtifactManifest,
    artifactPath: string,
  ): SmartSuggestStorageEffect<readonly AddressRecord[]> => {
    const url = artifactUrlForPath(manifestUrl, artifactPath);
    const cached = recordShardCache.get(url);

    if (cached !== undefined) {
      return Effect.succeed(cached);
    }

    return fetchArtifactJson({
      allowMissing: true,
      fetchImpl,
      schema: SmartSuggestOwnedDataArtifactAddressRecordsSchema,
      url,
    }).pipe(
      Effect.map((shard) => {
        const records =
          shard === undefined ||
          (!allowIncomplete && !shard.complete) ||
          shard.countryCode !== manifest.dataset.countryCode
            ? []
            : shard.records.map(toArtifactAddressRecord);

        recordShardCache.set(url, records);

        return records;
      }),
    );
  };

  const readCanonicalRecordShard = (
    manifest: SmartSuggestOwnedDataArtifactManifest,
    recordBucket: string,
  ) =>
    readRecordShard(
      manifest,
      renderArtifactPath(manifest.indexes.addressRecords.pathTemplate, {
        countryCode: manifest.dataset.countryCode,
        recordBucket,
      }),
    );

  const readAddressRecordsById = (
    manifest: SmartSuggestOwnedDataArtifactManifest,
    recordIds: readonly string[],
  ): SmartSuggestStorageEffect<readonly AddressRecord[]> => {
    const uniqueRecordIds = [...new Set(recordIds)];

    if (uniqueRecordIds.length === 0) {
      return Effect.succeed([]);
    }

    const idsByBucket = new Map<string, string[]>();

    for (const recordId of uniqueRecordIds) {
      const bucket = artifactBucketForKey(recordId, manifest.indexes.addressRecords.bucketCount);
      const ids = idsByBucket.get(bucket);

      if (ids === undefined) {
        idsByBucket.set(bucket, [recordId]);
      } else {
        ids.push(recordId);
      }
    }

    return Effect.gen(function* readAddressRecordsByIdProgram() {
      const recordsById = new Map<string, AddressRecord>();

      for (const [bucket, bucketRecordIds] of idsByBucket) {
        const bucketRecordIdSet = new Set(bucketRecordIds);
        const records = yield* readCanonicalRecordShard(manifest, bucket);

        for (const record of records) {
          if (bucketRecordIdSet.has(record.id)) {
            recordsById.set(record.id, record);
          }
        }
      }

      return uniqueRecordIds.flatMap((recordId) => {
        const record = recordsById.get(recordId);

        return record === undefined ? [] : [record];
      });
    });
  };

  const readTokenBucket = (
    manifest: SmartSuggestOwnedDataArtifactManifest,
    token: string,
  ): SmartSuggestStorageEffect<SmartSuggestOwnedDataArtifactTokenBucket | undefined> => {
    const { bucketCount, bucketPathTemplate } = manifest.indexes.addressTokens;

    if (bucketCount === undefined || bucketPathTemplate === undefined) {
      return Effect.succeed(undefined);
    }

    const tokenBucket = artifactBucketForKey(token, bucketCount);
    const cacheKey = `${manifest.dataset.countryCode}:${tokenBucket}`;

    if (tokenBucketCache.has(cacheKey)) {
      return Effect.succeed(tokenBucketCache.get(cacheKey));
    }

    const path = renderArtifactPath(bucketPathTemplate, {
      countryCode: manifest.dataset.countryCode,
      tokenBucket,
    });

    return fetchArtifactJson({
      allowMissing: true,
      fetchImpl,
      schema: SmartSuggestOwnedDataArtifactTokenBucketSchema,
      url: artifactUrlForPath(manifestUrl, path),
    }).pipe(
      Effect.map((bucket) => {
        const usableBucket =
          bucket === undefined ||
          bucket.countryCode !== manifest.dataset.countryCode ||
          bucket.bucket !== Number(tokenBucket) ||
          (!allowIncomplete && !bucket.complete)
            ? undefined
            : bucket;

        tokenBucketCache.set(cacheKey, usableBucket);

        return usableBucket;
      }),
    );
  };

  const readTokenBucketManifest = (
    manifest: SmartSuggestOwnedDataArtifactManifest,
    tokenBucket: string,
  ): SmartSuggestStorageEffect<SmartSuggestOwnedDataArtifactTokenBucketManifest | undefined> => {
    const { bucketManifestPathTemplate } = manifest.indexes.addressTokens;

    if (bucketManifestPathTemplate === undefined) {
      return Effect.succeed(undefined);
    }

    const cacheKey = `${manifest.dataset.countryCode}:${tokenBucket}`;

    if (tokenBucketManifestCache.has(cacheKey)) {
      return Effect.succeed(tokenBucketManifestCache.get(cacheKey));
    }

    const path = renderArtifactPath(bucketManifestPathTemplate, {
      countryCode: manifest.dataset.countryCode,
      tokenBucket,
    });

    return fetchArtifactJson({
      allowMissing: true,
      fetchImpl,
      schema: SmartSuggestOwnedDataArtifactTokenBucketManifestSchema,
      url: artifactUrlForPath(manifestUrl, path),
    }).pipe(
      Effect.map((bucketManifest) => {
        const usableManifest =
          bucketManifest === undefined ||
          bucketManifest.countryCode !== manifest.dataset.countryCode ||
          bucketManifest.bucket !== Number(tokenBucket) ||
          (!allowIncomplete && !bucketManifest.complete)
            ? undefined
            : bucketManifest;

        tokenBucketManifestCache.set(cacheKey, usableManifest);

        return usableManifest;
      }),
    );
  };

  const readTokenBucketPage = (
    manifest: SmartSuggestOwnedDataArtifactManifest,
    tokenBucketManifest: SmartSuggestOwnedDataArtifactTokenBucketManifest,
    pageReference: SmartSuggestOwnedDataArtifactTokenBucketManifest["pages"][number],
  ): SmartSuggestStorageEffect<SmartSuggestOwnedDataArtifactTokenBucketPage | undefined> => {
    const { bucketPagePathTemplate } = manifest.indexes.addressTokens;
    const tokenBucket = formatArtifactBucket(tokenBucketManifest.bucket);
    const pageKey = formatArtifactPageIndex(pageReference.page);
    const cacheKey = `${manifest.dataset.countryCode}:${tokenBucket}:${pageKey}`;

    if (tokenBucketPageCache.has(cacheKey)) {
      return Effect.succeed(tokenBucketPageCache.get(cacheKey));
    }

    if (pageReference.path === undefined && bucketPagePathTemplate === undefined) {
      return Effect.succeed(undefined);
    }

    const pagePath =
      pageReference.path ??
      renderArtifactPath(bucketPagePathTemplate ?? "", {
        countryCode: manifest.dataset.countryCode,
        page: pageKey,
        tokenBucket,
      });

    return fetchArtifactJson({
      allowMissing: true,
      fetchImpl,
      schema: SmartSuggestOwnedDataArtifactTokenBucketPageSchema,
      url: artifactUrlForPath(manifestUrl, pagePath),
    }).pipe(
      Effect.map((page) => {
        const usablePage =
          page === undefined ||
          page.countryCode !== manifest.dataset.countryCode ||
          page.bucket !== tokenBucketManifest.bucket ||
          page.page !== pageReference.page ||
          (!allowIncomplete && !page.complete)
            ? undefined
            : page;

        tokenBucketPageCache.set(cacheKey, usablePage);

        return usablePage;
      }),
    );
  };

  const readPagedTokenBucketCandidateIds = (
    manifest: SmartSuggestOwnedDataArtifactManifest,
    token: string,
    tokenBucket: string,
  ): SmartSuggestStorageEffect<readonly string[] | undefined> =>
    readTokenBucketManifest(manifest, tokenBucket).pipe(
      Effect.flatMap((bucketManifest) => {
        const tokenReference = bucketManifest?.tokens[token];

        if (bucketManifest === undefined || tokenReference === undefined) {
          return Effect.succeed(undefined);
        }

        const pageReference = bucketManifest.pages.find(
          (page) => page.page === tokenReference.page,
        );

        if (pageReference === undefined) {
          return Effect.succeed(undefined);
        }

        return readTokenBucketPage(manifest, bucketManifest, pageReference).pipe(
          Effect.map((page) => page?.tokens[token]?.recordIds),
        );
      }),
    );

  const readBucketedTokenCandidateIds = (
    manifest: SmartSuggestOwnedDataArtifactManifest,
    token: string,
  ): SmartSuggestStorageEffect<readonly string[] | undefined> =>
    readTokenBucket(manifest, token).pipe(
      Effect.flatMap((bucket) => {
        if (bucket !== undefined) {
          return Effect.succeed(bucket.tokens[token]?.recordIds);
        }

        const bucketCount = manifest.indexes.addressTokens.bucketCount;

        return bucketCount === undefined
          ? Effect.succeed(undefined)
          : readPagedTokenBucketCandidateIds(
              manifest,
              token,
              artifactBucketForKey(token, bucketCount),
            );
      }),
    );

  const readTokenManifest = (
    manifest: SmartSuggestOwnedDataArtifactManifest,
    token: string,
  ): SmartSuggestStorageEffect<SmartSuggestOwnedDataArtifactTokenManifest | undefined> => {
    const cacheKey = `${manifest.dataset.countryCode}:${token}`;

    if (tokenManifestCache.has(cacheKey)) {
      return Effect.succeed(tokenManifestCache.get(cacheKey));
    }

    const path = renderArtifactPath(manifest.indexes.addressTokens.manifestPathTemplate, {
      countryCode: manifest.dataset.countryCode,
      token,
    });

    return fetchArtifactJson({
      allowMissing: true,
      fetchImpl,
      schema: SmartSuggestOwnedDataArtifactTokenManifestSchema,
      url: artifactUrlForPath(manifestUrl, path),
    }).pipe(
      Effect.map((tokenManifest) => {
        const usableManifest =
          tokenManifest === undefined ||
          tokenManifest.countryCode !== manifest.dataset.countryCode ||
          tokenManifest.token !== token ||
          (!allowIncomplete && !tokenManifest.complete)
            ? undefined
            : tokenManifest;

        tokenManifestCache.set(cacheKey, usableManifest);

        return usableManifest;
      }),
    );
  };

  const readTokenPageRecords = (
    manifest: SmartSuggestOwnedDataArtifactManifest,
    tokenManifest: SmartSuggestOwnedDataArtifactTokenManifest,
    page: SmartSuggestOwnedDataArtifactTokenManifest["pages"][number],
  ) => {
    const pagePath =
      page.path ??
      renderArtifactPath(manifest.indexes.addressTokens.pagePathTemplate, {
        countryCode: manifest.dataset.countryCode,
        page: formatArtifactPageIndex(page.page),
        token: tokenManifest.token,
      });

    return readRecordShard(manifest, pagePath);
  };

  const readLegacyTokenCandidateIds = (
    manifest: SmartSuggestOwnedDataArtifactManifest,
    token: string,
  ): SmartSuggestStorageEffect<readonly string[] | undefined> =>
    readTokenManifest(manifest, token).pipe(
      Effect.flatMap((tokenManifest) => {
        if (tokenManifest === undefined || tokenManifest.recordCount <= 0) {
          return Effect.succeed(undefined);
        }

        const maxPages = Math.max(
          1,
          Math.min(
            tokenManifest.pageCount,
            maxAddressTokenPages ??
              manifest.indexes.addressTokens.maxPagesPerQuery ??
              tokenManifest.pageCount,
          ),
        );

        return Effect.gen(function* readLegacyTokenCandidateIdsProgram() {
          const ids: string[] = [];

          for (const page of tokenManifest.pages
            .toSorted((left, right) => left.page - right.page)
            .slice(0, maxPages)) {
            const records = yield* readTokenPageRecords(manifest, tokenManifest, page);

            ids.push(...records.map((record) => record.id));
          }

          return ids;
        });
      }),
    );

  const readTokenCandidateIds = (
    manifest: SmartSuggestOwnedDataArtifactManifest,
    token: string,
  ): SmartSuggestStorageEffect<readonly string[] | undefined> =>
    readBucketedTokenCandidateIds(manifest, token).pipe(
      Effect.flatMap((recordIds) =>
        recordIds === undefined
          ? readLegacyTokenCandidateIds(manifest, token)
          : Effect.succeed(recordIds),
      ),
    );

  const searchArtifactAddressRecords = ({
    countryCode,
    limit = 10,
    query,
  }: {
    countryCode?: SmartSuggestCountryCode;
    limit?: number;
    query: string;
  }): SmartSuggestStorageEffect<readonly AddressRecord[]> =>
    Effect.gen(function* searchArtifactAddressRecordsProgram() {
      const manifest = yield* readCompleteManifest();

      if (!matchesArtifactCountry(manifest, countryCode)) {
        return [];
      }

      const normalizedLimit = Math.max(1, Math.min(Math.trunc(limit), 50));

      if (!hasAddressSearchPrefixToken(query)) {
        return [];
      }

      const tokens = artifactTokensForQuery(query, manifest.indexes.addressTokens);

      if (tokens.length === 0) {
        return [];
      }

      let selected:
        | {
            recordIds: readonly string[];
            token: string;
          }
        | undefined;

      for (const token of tokens) {
        const recordIds = yield* readTokenCandidateIds(manifest, token);

        if (recordIds !== undefined && recordIds.length > 0) {
          selected = { recordIds, token };
          break;
        }
      }

      if (selected === undefined) {
        return [];
      }

      const pageBudget =
        maxAddressTokenPages ?? manifest.indexes.addressTokens.maxPagesPerQuery ?? undefined;
      const maxCandidateIds =
        pageBudget === undefined
          ? selected.recordIds.length
          : Math.max(1, pageBudget * manifest.indexes.addressTokens.pageSize);
      const records = yield* readAddressRecordsById(
        manifest,
        selected.recordIds.slice(0, maxCandidateIds),
      );

      return mergeRankedAddressRecords(query, normalizedLimit, records);
    });

  const listArtifactPostalLocalityAddressRecords = (input: {
    countryCode?: SmartSuggestCountryCode;
    postalCode: string;
  }): SmartSuggestStorageEffect<readonly AddressRecord[]> =>
    Effect.gen(function* listArtifactPostalLocalityAddressRecordsProgram() {
      const manifest = yield* readCompleteManifest();

      if (!matchesArtifactCountry(manifest, input.countryCode)) {
        return [];
      }

      const postalCode = normalizePostalCodeDigits(input.postalCode);

      if (postalCode.length === 0) {
        return [];
      }

      const path = renderArtifactPath(manifest.indexes.postalLocalities.pathTemplate, {
        countryCode: manifest.dataset.countryCode,
        postalCode,
      });
      const records = yield* readRecordShard(manifest, path);

      return selectPostalLocalityAddressRecords(records, input);
    });

  const fallbackAddressSearch = (
    input: Parameters<SmartSuggestRepositories["addressRecords"]["searchAddressRecords"]>[0],
  ) =>
    readFallbackAddressRecords
      ? fallback.addressRecords.searchAddressRecords(input)
      : Effect.succeed([]);

  const fallbackPostalLocalities = (
    input: Parameters<
      SmartSuggestRepositories["addressRecords"]["listPostalLocalityAddressRecords"]
    >[0],
  ) =>
    readFallbackAddressRecords
      ? fallback.addressRecords.listPostalLocalityAddressRecords(input)
      : Effect.succeed([]);

  const artifactDataSource = (
    sourceId: string,
  ): SmartSuggestStorageEffect<DataSourceRecord | undefined> =>
    readCompleteManifest().pipe(
      Effect.map((manifest) =>
        manifest.dataset.source.id === sourceId
          ? toArtifactDataSourceRecord(manifest.dataset.source)
          : undefined,
      ),
      Effect.catch(() => Effect.succeed(undefined)),
    );

  const artifactImportRuns = (): SmartSuggestStorageEffect<readonly ImportRunRecord[]> =>
    readCompleteManifest().pipe(
      Effect.map((manifest) => [toArtifactImportRunRecord(manifest.dataset.importRun)]),
      Effect.catch(() => Effect.succeed([])),
    );

  const artifactShardMetadata = (): SmartSuggestStorageEffect<
    readonly SmartSuggestShardMetadataRecord[]
  > =>
    readCompleteManifest().pipe(
      Effect.map((manifest) => manifest.shards.map(toArtifactShardMetadataRecord)),
      Effect.catch(() => Effect.succeed([])),
    );

  return {
    ...fallback,
    addressRecords: {
      ...fallback.addressRecords,
      listPostalLocalityAddressRecords: (input) =>
        Effect.gen(function* listPostalLocalityAddressRecordsProgram() {
          const [artifactRecords, fallbackRecords] = yield* Effect.all([
            listArtifactPostalLocalityAddressRecords(input).pipe(
              Effect.catch(() => Effect.succeed([])),
            ),
            fallbackPostalLocalities(input),
          ]);

          return selectPostalLocalityAddressRecords(
            mergeUniqueAddressRecords([...artifactRecords, ...fallbackRecords]),
            input,
          );
        }),
      searchAddressRecords: (input) =>
        Effect.gen(function* searchAddressRecordsProgram() {
          const normalizedLimit = Math.max(1, Math.min(Math.trunc(input.limit ?? 10), 50));
          const [artifactRecords, fallbackRecords] = yield* Effect.all([
            searchArtifactAddressRecords(input).pipe(Effect.catch(() => Effect.succeed([]))),
            fallbackAddressSearch(input),
          ]);

          return mergeRankedAddressRecords(input.query, normalizedLimit, [
            ...artifactRecords,
            ...fallbackRecords,
          ]);
        }),
    },
    dataSources: {
      ...fallback.dataSources,
      getDataSource: (sourceId) =>
        Effect.gen(function* getDataSourceProgram() {
          const source = yield* artifactDataSource(sourceId);

          return source ?? (yield* fallback.dataSources.getDataSource(sourceId));
        }),
    },
    health: {
      check: () =>
        Effect.gen(function* artifactHealthProgram() {
          const checkedAt = nowIso();
          const manifestExit = yield* Effect.exit(readCompleteManifest());

          if (Exit.isFailure(manifestExit)) {
            const error = Cause.squash(manifestExit.cause);

            return {
              checkedAt,
              error:
                error instanceof Error
                  ? sanitizeStorageErrorMessage(error)
                  : "Smart Suggest owned-data artifact manifest check failed.",
              ok: false,
            };
          }

          const fallbackHealth = yield* fallback.health
            .check()
            .pipe(Effect.catch(() => Effect.succeed({ checkedAt, ok: true })));

          return fallbackHealth.ok ? { checkedAt: nowIso(), ok: true } : fallbackHealth;
        }),
    },
    importRuns: {
      ...fallback.importRuns,
      findLatestCompletedImportRun: (input) =>
        Effect.gen(function* findLatestCompletedImportRunProgram() {
          const [artifactRun] = yield* artifactImportRuns();

          if (
            artifactRun !== undefined &&
            artifactRun.status === "completed" &&
            artifactRun.sourceId === input.sourceId &&
            artifactRun.shardCountryCode === input.shardCountryCode &&
            artifactRun.importKind !== undefined &&
            input.importKinds.includes(artifactRun.importKind)
          ) {
            return artifactRun;
          }

          return yield* fallback.importRuns.findLatestCompletedImportRun(input);
        }),
      listRecentImportRuns: (limit = 10) =>
        Effect.gen(function* listRecentImportRunsProgram() {
          const normalizedLimit = Math.max(1, Math.min(Math.trunc(limit), 50));
          const [artifactRuns, fallbackRuns] = yield* Effect.all([
            artifactImportRuns(),
            fallback.importRuns.listRecentImportRuns(normalizedLimit),
          ]);

          return [...artifactRuns, ...fallbackRuns]
            .toSorted((left, right) => right.startedAt.localeCompare(left.startedAt))
            .slice(0, normalizedLimit);
        }),
    },
    shardRegistry: {
      ...fallback.shardRegistry,
      listShardMetadata: (input = {}) =>
        Effect.gen(function* listShardMetadataProgram() {
          const [artifactShards, fallbackShards] = yield* Effect.all([
            artifactShardMetadata(),
            fallback.shardRegistry.listShardMetadata(input),
          ]);

          return [...artifactShards, ...fallbackShards].filter((record) => {
            if (input.countryCode !== undefined && record.countryCode !== input.countryCode) {
              return false;
            }

            return input.state === undefined || record.state === input.state;
          });
        }),
      resolveShardMetadata: (input) =>
        Effect.gen(function* resolveShardMetadataProgram() {
          const [artifactShards, fallbackShards] = yield* Effect.all([
            artifactShardMetadata(),
            fallback.shardRegistry.resolveShardMetadata(input),
          ]);

          return resolveShardMetadataMatches([...artifactShards, ...fallbackShards], input);
        }),
    },
  };
};

const withTimestamps = <T extends { id: string }>(input: T, previous?: { createdAt: string }) => {
  const timestamp = nowIso();

  return {
    ...input,
    createdAt: previous?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
};

const assertCachePolicyAllowsWrite = (policy: ProviderCachePolicy) => {
  if (policy.kind === "none") {
    throw new SmartSuggestStorageError(
      "cache-policy-violation",
      "Provider cache policy forbids persistent cache writes.",
    );
  }
};

const readSuggestionMetadataNumber = (
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

const normalizeSuggestionId = (value: string) =>
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

const isCacheExpired = (record: SuggestCacheRecord) =>
  record.expiresAt !== undefined && Date.parse(record.expiresAt) <= Date.now();

const parseJsonValue = <T>(value: string | null | undefined, fallback: T): T => {
  if (value === undefined || value === null || value.trim().length === 0) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const parseJsonRecord = (value: string | null | undefined): Record<string, JsonValue> => {
  const parsed = parseJsonValue<JsonValue>(value, {});

  return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
    ? (parsed as Record<string, JsonValue>)
    : {};
};

const parseJsonStringArray = (value: string | null | undefined) => {
  const parsed = parseJsonValue<JsonValue>(value, []);

  return Array.isArray(parsed) && parsed.every((entry) => typeof entry === "string") ? parsed : [];
};

const normalizeOptionalShardText = (value: string | undefined) => {
  const normalized = value?.trim();

  return normalized === undefined || normalized.length === 0 ? undefined : normalized;
};

const normalizeShardPostalPrefix = (value: string) => value.replaceAll(/\D/gu, "");

const uniqueSortedStrings = (values: Iterable<string>) =>
  [...new Set(values)].toSorted((left, right) => left.localeCompare(right));

const normalizeShardPostalPrefixes = (values: readonly string[] = []) =>
  uniqueSortedStrings(
    values.map(normalizeShardPostalPrefix).filter((value) => value.length > 0),
  ).toSorted((left, right) => right.length - left.length);

const normalizeShardMunicipalityCodes = (values: readonly string[] = []) =>
  uniqueSortedStrings(values.map((value) => value.trim()).filter((value) => value.length > 0));

const normalizeShardMunicipalityHints = (values: readonly string[] = []) =>
  uniqueSortedStrings(
    values.map((value) => normalizeSearchText(value).trim()).filter((value) => value.length > 0),
  );

const normalizeNonNegativeInteger = (value: number | undefined) =>
  value === undefined ? undefined : Math.max(0, Math.trunc(value));

const normalizeShardRegionKind = (value: string): SmartSuggestShardRegionKind => {
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

const normalizeShardState = (value: string): SmartSuggestShardState => {
  if (value === "disabled" || value === "standby") {
    return value;
  }

  return "active";
};

const normalizeShardMetadataInput = (
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

const toShardMetadataInsert = (record: SmartSuggestShardMetadataRecord) =>
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

const toShardMetadataRecord = (
  row: typeof smartSuggestShardRegistry.$inferSelect,
): SmartSuggestShardMetadataRecord => {
  const record: SmartSuggestShardMetadataRecord = {
    bindingName: row.bindingName,
    countryCode: row.countryCode as SmartSuggestCountryCode,
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

const normalizeShardResolveStates = (states: readonly SmartSuggestShardState[] | undefined) => [
  ...new Set(states ?? ["active"]),
];

const scoreShardMetadataRoute = (
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

const resolveShardMetadataMatches = (
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

const nullableNumber = (value: number | undefined) => value ?? null;

const nullableText = (value: string | undefined) => value ?? null;

const nullableBoolean = (value: boolean | undefined) => value ?? null;

const normalizeReplicationStatus = (input: AddressSearchRecordInput): AddressReplicationStatus => {
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

const normalizeSearchVisible = (input: AddressSearchRecordInput) =>
  input.searchVisible ??
  input.visibility?.searchVisible ??
  normalizeReplicationStatus(input) === "active";

const sourceRecordTypeForLineage = (lineage: AddressRecordSourceLineage | undefined) =>
  lineage?.sourceRecordType ?? "address-place";

const sourceRecordIdForRecord = (input: {
  id: string;
  ruian?: AddressRecordRuianIdentifiers;
  sourceLineage?: AddressRecordSourceLineage;
}) =>
  input.sourceLineage?.sourceRecordId ??
  input.ruian?.addressPlaceCode ??
  input.sourceLineage?.sourceRowId ??
  input.id;

const toAddressRuianIdentifiers = (row: {
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

const toAddressSourceLineage = (row: {
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

const toAddressVisibility = (row: {
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
    replicationStatus: row.replicationStatus as AddressReplicationStatus,
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

const toAttribution = (row: {
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

const toDataSourceRecord = (row: typeof smartSuggestDataSources.$inferSelect): DataSourceRecord => {
  const record: DataSourceRecord = {
    attribution: toAttribution(row),
    cachePolicy: parseJsonValue<ProviderCachePolicy>(row.cachePolicyJson, {
      kind: "none",
    }),
    countryCode: row.countryCode as SmartSuggestCountryCode,
    createdAt: row.createdAt,
    id: row.id,
    name: row.name,
    sourceKind: row.sourceKind as SuggestionSourceKind,
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

const toTenantRecord = (row: typeof smartSuggestTenants.$inferSelect): TenantRecord => ({
  allowedOrigins: parseJsonStringArray(row.allowedOriginsJson),
  countryConfig: parseJsonRecord(row.countryConfigJson),
  createdAt: row.createdAt,
  id: row.id,
  name: row.name,
  providerPriority: parseJsonStringArray(row.providerPriorityJson),
  status: row.status === "disabled" ? "disabled" : "active",
  updatedAt: row.updatedAt,
});

const toApiKeyRecord = (row: typeof smartSuggestApiKeys.$inferSelect): ApiKeyRecord => {
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

const toImportRunRecord = (row: typeof smartSuggestImportRuns.$inferSelect): ImportRunRecord => {
  const record: ImportRunRecord = {
    failedRows: row.failedRows,
    id: row.id,
    insertedRows: row.insertedRows,
    shardCountryCode: row.shardCountryCode as SmartSuggestCountryCode,
    skippedRows: row.skippedRows,
    sourceId: row.sourceId,
    startedAt: row.startedAt,
    status: row.status as ImportRunStatus,
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
    record.importKind = row.importKind as AddressImportKind;
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

const toAddressParts = (row: typeof smartSuggestAddressRecords.$inferSelect): AddressParts => {
  const parts: AddressParts = {
    countryCode: row.countryCode as SmartSuggestCountryCode,
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

const toAddressRecord = (row: typeof smartSuggestAddressRecords.$inferSelect): AddressRecord => {
  const record: AddressRecord = {
    countryCode: row.countryCode as SmartSuggestCountryCode,
    createdAt: row.createdAt,
    displayLabel: row.displayLabel,
    id: row.id,
    parts: toAddressParts(row),
    quality: row.quality,
    replicationStatus: row.replicationStatus as AddressReplicationStatus,
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

const toAddressTombstoneRecord = (
  row: typeof smartSuggestAddressTombstones.$inferSelect,
): AddressTombstoneRecord => {
  const record: AddressTombstoneRecord = {
    countryCode: row.countryCode as SmartSuggestCountryCode,
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

type AddressRecordRow = typeof smartSuggestAddressRecords.$inferSelect;
type AddressTombstoneRow = typeof smartSuggestAddressTombstones.$inferSelect;

const nullableJson = (value: JsonValue | undefined) =>
  value === undefined ? null : JSON.stringify(value);

const toStoredAddressTombstoneMetadata = (
  input: AddressSearchRecordInput,
  replicationStatus: AddressReplicationStatus,
) => ({
  tombstoneReason:
    replicationStatus === "tombstoned" ? nullableText(input.visibility?.reason) : null,
  tombstonedAt: replicationStatus === "tombstoned" ? nullableText(input.visibility?.validTo) : null,
});

const toStoredRuianColumns = (ruian: AddressRecordRuianIdentifiers | undefined) => ({
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

const toStoredSourceLineageColumns = (sourceLineage: AddressRecordSourceLineage | undefined) => ({
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

const toAddressRecordRow = (
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

const excludedColumn = (columnName: string) => sql.raw(`excluded.${columnName}`);

const addressRecordExcludedUpdateSet = {
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

const toAddressTombstoneRow = (
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

const toAddressTombstoneUpdateSet = (row: AddressTombstoneRow) => ({
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

const toSuggestCacheRecord = (
  row: typeof smartSuggestCacheEntries.$inferSelect,
): SuggestCacheRecord => {
  const record: SuggestCacheRecord = {
    cacheKey: row.cacheKey,
    cachePolicy: parseJsonValue<ProviderCachePolicy>(row.cachePolicyJson, {
      kind: "none",
    }),
    createdAt: row.createdAt,
    kind: row.kind as SmartSuggestKind,
    payload: parseJsonValue<SmartSuggestSuggestion[]>(row.payloadJson, []),
    queryHash: row.queryHash,
    status: row.status as SmartSuggestCacheStatus,
    updatedAt: row.updatedAt,
  };

  if (row.countryCode !== null) {
    record.countryCode = row.countryCode as SmartSuggestCountryCode;
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

const toProviderEventRecord = (
  row: typeof smartSuggestProviderEvents.$inferSelect,
): ProviderEventRecord => {
  const record: ProviderEventRecord = {
    createdAt: row.createdAt,
    id: row.id,
    providerId: row.providerId,
    requestId: row.requestId,
    status: row.status as ProviderEventRecord["status"],
  };

  if (row.errorCode !== null) {
    record.errorCode = row.errorCode as SmartSuggestErrorCode;
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

const toAcceptEventRecord = (
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

export const createD1SmartSuggestRepositories = (
  binding: SmartSuggestD1Binding,
  options: SmartSuggestD1RepositoryOptions = {},
): SmartSuggestRepositories => {
  const searchIndexMode = options.searchIndexMode ?? "fts-and-prefix";
  const writeAddressSearchTokens = searchIndexMode === "fts-and-prefix";
  let cachedD1DatabaseEffect: SmartSuggestD1Operation<SmartSuggestD1Database> | undefined;
  const acquireD1Database = (): SmartSuggestD1Operation<SmartSuggestD1Database> => {
    if (cachedD1DatabaseEffect !== undefined) {
      return cachedD1DatabaseEffect;
    }

    return Effect.cached(createSmartSuggestD1DatabaseEffect(binding)).pipe(
      Effect.flatMap((cached) => {
        cachedD1DatabaseEffect = cached;
        return cached;
      }),
    );
  };
  const withD1Database = <T>(
    operation: (db: SmartSuggestD1Database) => SmartSuggestD1Operation<T>,
  ): SmartSuggestStorageEffect<T> =>
    d1StorageOperation(acquireD1Database().pipe(Effect.flatMap(operation)));
  const isAddressSearchFtsUnavailable = (error: unknown) =>
    error instanceof Error && addressSearchFtsUnavailablePattern.test(error.message);
  const ignoreAddressSearchFtsUnavailable = <T>(
    operation: SmartSuggestStorageEffect<T>,
  ): SmartSuggestStorageEffect<T | undefined> =>
    Effect.catch(operation, (error) =>
      isAddressSearchFtsUnavailable(error) ? Effect.succeed(undefined) : Effect.fail(error),
    );
  const deleteAddressSearchFts = (recordId: string): SmartSuggestStorageEffect<void> =>
    ignoreAddressSearchFtsUnavailable(
      withD1Database((db) =>
        db.run(sql`delete from smart_suggest_address_search_fts where record_id = ${recordId}`),
      ),
    ).pipe(Effect.asVoid);
  const deleteAddressSearchFtsRecords = (
    recordIds: readonly string[],
  ): SmartSuggestStorageEffect<void> =>
    Effect.gen(function* () {
      for (const recordIdChunk of chunkItems(recordIds, D1_ADDRESS_IMPORT_SUBCHUNK_SIZE)) {
        if (recordIdChunk.length === 0) {
          continue;
        }

        yield* ignoreAddressSearchFtsUnavailable(
          withD1Database((db) =>
            db.run(sql`
              delete from smart_suggest_address_search_fts
              where record_id in (${sql.join(
                recordIdChunk.map((recordId) => sql`${recordId}`),
                sql`, `,
              )})
            `),
          ),
        );
      }
    });
  const insertAddressSearchFtsRecords = (
    records: readonly AddressSearchRecordInput[],
  ): SmartSuggestStorageEffect<void> =>
    Effect.gen(function* () {
      for (const recordChunk of chunkItems(records, D1_ADDRESS_IMPORT_SUBCHUNK_SIZE)) {
        if (recordChunk.length === 0) {
          continue;
        }

        yield* ignoreAddressSearchFtsUnavailable(
          withD1Database((db) =>
            db.run(sql`
              insert into smart_suggest_address_search_fts (
                record_id,
                country_code,
                display_label,
                search_label,
                street,
                city,
                district,
                postal_code,
                house_number,
                orientation_number
              )
              values ${sql.join(
                recordChunk.map(
                  (record) => sql`(
                    ${record.id},
                    ${record.countryCode},
                    ${record.displayLabel},
                    ${record.searchLabel},
                    ${record.parts.street ?? ""},
                    ${record.parts.city ?? ""},
                    ${record.parts.district ?? ""},
                    ${record.parts.postalCode ?? ""},
                    ${record.parts.houseNumber ?? ""},
                    ${record.parts.orientationNumber ?? ""}
                  )`,
                ),
                sql`, `,
              )}
            `),
          ),
        );
      }
    });
  const refreshAddressSearchTokensBatch = (
    allRecords: readonly AddressSearchRecordInput[],
    indexedRecords: readonly AddressSearchRecordInput[],
  ): SmartSuggestStorageEffect<void> =>
    Effect.gen(function* () {
      for (const recordChunk of chunkItems(allRecords, D1_ADDRESS_IMPORT_SUBCHUNK_SIZE)) {
        const recordIds = recordChunk.map((record) => record.id);

        if (recordIds.length === 0) {
          continue;
        }

        yield* withD1Database((db) =>
          db
            .delete(smartSuggestAddressSearchTokens)
            .where(inArray(smartSuggestAddressSearchTokens.recordId, recordIds)),
        );
      }

      if (!writeAddressSearchTokens) {
        return;
      }

      const tokenRows = indexedRecords.flatMap((record) => createAddressSearchTokenRows(record));

      for (const tokenChunk of chunkItems(tokenRows, D1_TOKEN_INSERT_SUBCHUNK_SIZE)) {
        if (tokenChunk.length > 0) {
          yield* withD1Database((db) =>
            db.insert(smartSuggestAddressSearchTokens).values(tokenChunk),
          );
        }
      }
    });
  const refreshAddressSearchIndexesBatch = (
    records: readonly AddressSearchRecordInput[],
  ): SmartSuggestStorageEffect<void> =>
    Effect.gen(function* () {
      const indexedRecords = records.filter(
        (record) =>
          normalizeSearchVisible(record) && normalizeReplicationStatus(record) === "active",
      );

      yield* deleteAddressSearchFtsRecords(records.map((record) => record.id));
      yield* insertAddressSearchFtsRecords(indexedRecords);
      yield* refreshAddressSearchTokensBatch(records, indexedRecords);
    });
  const upsertAddressRecordSubchunk = (
    records: readonly AddressSearchRecordInput[],
  ): SmartSuggestStorageEffect<readonly AddressRecord[]> =>
    Effect.gen(function* () {
      const timestamp = nowIso();
      const rows = records.map((input) => toAddressRecordRow(input, timestamp));
      const storedRows = yield* withD1Database((db) =>
        db
          .insert(smartSuggestAddressRecords)
          .values(rows)
          .onConflictDoUpdate({
            set: addressRecordExcludedUpdateSet,
            target: smartSuggestAddressRecords.id,
          })
          .returning(),
      );

      yield* refreshAddressSearchIndexesBatch(records);

      return (storedRows.length > 0 ? storedRows : rows).map(toAddressRecord);
    });
  const searchAddressSearchFts = ({
    countryCode,
    limit,
    query,
  }: {
    countryCode: SmartSuggestCountryCode | undefined;
    limit: number;
    query: string;
  }): SmartSuggestStorageEffect<readonly string[] | undefined> =>
    Effect.gen(function* () {
      const ftsQuery = createAddressSearchFtsQuery(query);

      if (ftsQuery === undefined) {
        return;
      }

      const rows =
        countryCode === undefined
          ? yield* ignoreAddressSearchFtsUnavailable(
              withD1Database((db) =>
                db.all<{ recordId: string }>(sql`
                  select record_id as recordId
                  from smart_suggest_address_search_fts
                  where smart_suggest_address_search_fts match ${ftsQuery}
                  order by rank
                  limit ${limit}
                `),
              ),
            )
          : yield* ignoreAddressSearchFtsUnavailable(
              withD1Database((db) =>
                db.all<{ recordId: string }>(sql`
                  select record_id as recordId
                  from smart_suggest_address_search_fts
                  where smart_suggest_address_search_fts match ${ftsQuery}
                    and country_code = ${countryCode}
                  order by rank
                  limit ${limit}
                `),
              ),
            );

      return rows?.map((row) => row.recordId);
    });
  const fetchAddressRecordsByIds = ({
    countryCode,
    recordIds,
  }: {
    countryCode: SmartSuggestCountryCode | undefined;
    recordIds: readonly string[];
  }) => {
    const recordFilters = [
      inArray(smartSuggestAddressRecords.id, recordIds),
      eq(smartSuggestAddressRecords.searchVisible, true),
      eq(smartSuggestAddressRecords.replicationStatus, "active"),
    ];

    if (countryCode !== undefined) {
      recordFilters.push(eq(smartSuggestAddressRecords.countryCode, countryCode));
    }

    return withD1Database((db) =>
      db
        .select()
        .from(smartSuggestAddressRecords)
        .where(and(...recordFilters))
        .limit(recordIds.length),
    );
  };
  const searchAddressRecordsByFts = ({
    countryCode,
    limit,
    query,
  }: {
    countryCode: SmartSuggestCountryCode | undefined;
    limit: number;
    query: string;
  }): SmartSuggestStorageEffect<readonly AddressRecord[] | undefined> =>
    Effect.gen(function* () {
      const indexedRecordLimit = Math.max(limit * 20, 50);
      const recordIds = yield* searchAddressSearchFts({
        countryCode,
        limit: indexedRecordLimit,
        query,
      });

      if (recordIds === undefined || recordIds.length === 0) {
        return;
      }

      const indexedRows = yield* fetchAddressRecordsByIds({
        countryCode,
        recordIds,
      });

      return rankAddressRecordResults(query, indexedRows.map(toAddressRecord), limit);
    });
  const searchAddressRecordsByTokens = ({
    countryCode,
    limit,
    query,
  }: {
    countryCode: SmartSuggestCountryCode | undefined;
    limit: number;
    query: string;
  }): SmartSuggestStorageEffect<readonly AddressRecord[] | undefined> =>
    Effect.gen(function* () {
      const prefixes = [...new Set(createQuerySearchPrefixes(query))];

      if (prefixes.length === 0) {
        return;
      }

      const indexedRecordLimit = Math.max(limit * 20, 50);
      const tokenFilters = [inArray(smartSuggestAddressSearchTokens.prefix, prefixes)];

      if (countryCode !== undefined) {
        tokenFilters.push(eq(smartSuggestAddressSearchTokens.countryCode, countryCode));
      }

      const tokenMatches = yield* withD1Database((db) =>
        db
          .select({ recordId: smartSuggestAddressSearchTokens.recordId })
          .from(smartSuggestAddressSearchTokens)
          .where(and(...tokenFilters))
          .limit(indexedRecordLimit),
      );
      const recordIds = [...new Set(tokenMatches.map((match) => match.recordId))];

      if (recordIds.length === 0) {
        return;
      }

      const indexedRows = yield* fetchAddressRecordsByIds({
        countryCode,
        recordIds,
      });

      return rankAddressRecordResults(query, indexedRows.map(toAddressRecord), limit);
    });
  const searchAddressRecordsByLabel = ({
    countryCode,
    limit,
    query,
  }: {
    countryCode: SmartSuggestCountryCode | undefined;
    limit: number;
    query: string;
  }): SmartSuggestStorageEffect<readonly AddressRecord[]> =>
    Effect.gen(function* () {
      const filters = [
        like(smartSuggestAddressRecords.searchLabel, `%${normalizeSearchText(query)}%`),
        eq(smartSuggestAddressRecords.searchVisible, true),
        eq(smartSuggestAddressRecords.replicationStatus, "active"),
      ];

      if (countryCode !== undefined) {
        filters.push(eq(smartSuggestAddressRecords.countryCode, countryCode));
      }

      const rows = yield* withD1Database((db) =>
        db
          .select()
          .from(smartSuggestAddressRecords)
          .where(and(...filters))
          .orderBy(desc(smartSuggestAddressRecords.quality))
          .limit(limit),
      );

      return rankAddressRecordResults(query, rows.map(toAddressRecord), limit);
    });
  const tombstoneRecordFilters = (tombstone: AddressTombstoneRecordInput) => {
    const filters = [eq(smartSuggestAddressRecords.id, tombstone.id)];

    if (tombstone.ruian?.addressPlaceCode !== undefined) {
      filters.push(
        eq(smartSuggestAddressRecords.ruianAddressPlaceCode, tombstone.ruian.addressPlaceCode),
      );
    }

    return filters.length === 1 ? filters[0] : or(...filters);
  };
  const toTombstonedAddressRecordUpdateSet = (
    tombstone: AddressTombstoneRecordInput,
    timestamp: string,
  ) => {
    const updateSet = {
      replicationStatus: "tombstoned",
      searchVisible: false,
      tombstoneReason: tombstone.reason ?? null,
      tombstonedAt: tombstone.deletedAt ?? timestamp,
      updatedAt: timestamp,
    };

    if (tombstone.sourceLineage !== undefined) {
      const recordIdentity: {
        id: string;
        ruian?: AddressRecordRuianIdentifiers;
        sourceLineage?: AddressRecordSourceLineage;
      } = {
        id: tombstone.id,
        sourceLineage: tombstone.sourceLineage,
      };

      if (tombstone.ruian !== undefined) {
        recordIdentity.ruian = tombstone.ruian;
      }

      Object.assign(updateSet, {
        sourceRecordId: sourceRecordIdForRecord(recordIdentity),
        sourceRecordType: sourceRecordTypeForLineage(tombstone.sourceLineage),
        ...toStoredSourceLineageColumns(tombstone.sourceLineage),
      });
    }

    if (tombstone.ruian !== undefined) {
      Object.assign(updateSet, toStoredRuianColumns(tombstone.ruian));
    }

    return updateSet;
  };
  const markAddressRecordTombstoned = (
    tombstone: AddressTombstoneRecordInput,
  ): SmartSuggestStorageEffect<void> =>
    Effect.gen(function* () {
      const matchedRows = yield* withD1Database((db) =>
        db
          .select({ id: smartSuggestAddressRecords.id })
          .from(smartSuggestAddressRecords)
          .where(tombstoneRecordFilters(tombstone)),
      );
      const matchedRecordIds = matchedRows.map((row) => row.id);

      if (matchedRecordIds.length === 0) {
        return;
      }

      const timestamp = nowIso();
      const updateSet = toTombstonedAddressRecordUpdateSet(tombstone, timestamp);

      yield* withD1Database((db) =>
        db
          .update(smartSuggestAddressRecords)
          .set(updateSet)
          .where(inArray(smartSuggestAddressRecords.id, matchedRecordIds)),
      );
      yield* withD1Database((db) =>
        db
          .delete(smartSuggestAddressSearchTokens)
          .where(inArray(smartSuggestAddressSearchTokens.recordId, matchedRecordIds)),
      );

      for (const recordId of matchedRecordIds) {
        yield* deleteAddressSearchFts(recordId);
      }
    });
  const listD1ShardMetadata = (
    input: SmartSuggestShardMetadataListInput = {},
  ): SmartSuggestStorageEffect<readonly SmartSuggestShardMetadataRecord[]> => {
    if (input.countryCode !== undefined && input.state !== undefined) {
      const countryCode = input.countryCode;
      const state = input.state;

      return withD1Database((db) =>
        db
          .select()
          .from(smartSuggestShardRegistry)
          .where(
            and(
              eq(smartSuggestShardRegistry.countryCode, countryCode),
              eq(smartSuggestShardRegistry.state, state),
            ),
          )
          .orderBy(desc(smartSuggestShardRegistry.updatedAt)),
      ).pipe(Effect.map((rows) => rows.map(toShardMetadataRecord)));
    }

    if (input.countryCode !== undefined) {
      const countryCode = input.countryCode;

      return withD1Database((db) =>
        db
          .select()
          .from(smartSuggestShardRegistry)
          .where(eq(smartSuggestShardRegistry.countryCode, countryCode))
          .orderBy(desc(smartSuggestShardRegistry.updatedAt)),
      ).pipe(Effect.map((rows) => rows.map(toShardMetadataRecord)));
    }

    if (input.state !== undefined) {
      const state = input.state;

      return withD1Database((db) =>
        db
          .select()
          .from(smartSuggestShardRegistry)
          .where(eq(smartSuggestShardRegistry.state, state))
          .orderBy(desc(smartSuggestShardRegistry.updatedAt)),
      ).pipe(Effect.map((rows) => rows.map(toShardMetadataRecord)));
    }

    return withD1Database((db) =>
      db
        .select()
        .from(smartSuggestShardRegistry)
        .orderBy(desc(smartSuggestShardRegistry.updatedAt)),
    ).pipe(Effect.map((rows) => rows.map(toShardMetadataRecord)));
  };
  const assertD1ImportRunRestartCompatible = (
    existing: typeof smartSuggestImportRuns.$inferSelect | undefined,
    input: StartImportRunInput,
  ): SmartSuggestStorageEffect<void> =>
    existing === undefined
      ? Effect.succeed(undefined)
      : storageEffect(() => assertImportRunRestartCompatible(toImportRunRecord(existing), input));
  const assertNoD1ActiveSequencedImportRun = (
    input: StartImportRunInput,
    importKind: AddressImportKind,
  ): SmartSuggestStorageEffect<void> => {
    if (!isSequencedImportKind(importKind)) {
      return Effect.succeed(undefined);
    }

    return Effect.gen(function* () {
      const activeRun = yield* withD1Database((db) =>
        db
          .select()
          .from(smartSuggestImportRuns)
          .where(
            and(
              eq(smartSuggestImportRuns.status, "running"),
              eq(smartSuggestImportRuns.sourceId, input.sourceId),
              eq(smartSuggestImportRuns.shardCountryCode, input.shardCountryCode),
              inArray(smartSuggestImportRuns.importKind, sequencedImportKinds),
            ),
          )
          .get(),
      );

      yield* storageEffect(() =>
        assertNoActiveSequencedImportRun(
          input,
          activeRun === undefined ? undefined : toImportRunRecord(activeRun),
        ),
      );
    });
  };
  const toD1ImportRunInsertRow = (input: StartImportRunInput, importKind: AddressImportKind) =>
    ({
      sourceAtomEntryId: input.atomEntryId ?? null,
      sourceChecksumSha256: input.checksumSha256 ?? null,
      completedAt: null,
      errorSummary: null,
      failedRows: 0,
      id: input.id,
      importKind,
      insertedRows: 0,
      skippedRows: 0,
      shardCountryCode: input.shardCountryCode,
      sourceFeedId: input.sourceFeedId ?? null,
      sourceGeneratedAt: input.sourceGeneratedAt ?? null,
      sourceId: input.sourceId,
      sourceUri: input.sourceUri ?? null,
      sourceValidAt: input.sourceValidAt ?? null,
      sourceVersion: input.sourceVersion ?? null,
      startedAt: nowIso(),
      status: "running",
      tombstonedRows: 0,
      totalRows: 0,
      upsertedRows: 0,
    }) satisfies typeof smartSuggestImportRuns.$inferInsert;
  const insertD1ImportRunRow = (
    input: StartImportRunInput,
    importKind: AddressImportKind,
    row: typeof smartSuggestImportRuns.$inferInsert,
  ) =>
    Effect.catch(
      withD1Database((db) =>
        db
          .insert(smartSuggestImportRuns)
          .values(row)
          .onConflictDoUpdate({
            set: {
              completedAt: row.completedAt,
              errorSummary: row.errorSummary,
              failedRows: row.failedRows,
              importKind: row.importKind,
              insertedRows: row.insertedRows,
              skippedRows: row.skippedRows,
              shardCountryCode: row.shardCountryCode,
              sourceAtomEntryId: row.sourceAtomEntryId,
              sourceChecksumSha256: row.sourceChecksumSha256,
              sourceFeedId: row.sourceFeedId,
              sourceGeneratedAt: row.sourceGeneratedAt,
              sourceId: row.sourceId,
              sourceUri: row.sourceUri,
              sourceValidAt: row.sourceValidAt,
              sourceVersion: row.sourceVersion,
              startedAt: row.startedAt,
              status: row.status,
              tombstonedRows: row.tombstonedRows,
              totalRows: row.totalRows,
              upsertedRows: row.upsertedRows,
            },
            target: smartSuggestImportRuns.id,
          })
          .returning(),
      ),
      (error) =>
        isSequencedImportKind(importKind) && isImportRunUniqueConstraintError(error)
          ? Effect.fail(activeSequencedImportRunConflict(input, undefined))
          : Effect.fail(error),
    );
  const toReadSuggestCacheRecord = (
    row: typeof smartSuggestCacheEntries.$inferSelect | undefined,
  ) => {
    if (row === undefined) {
      return;
    }

    const record = toSuggestCacheRecord(row);

    return isCacheExpired(record)
      ? { ...record, status: "stale" as const }
      : { ...record, status: "hit" as const };
  };

  return {
    health: {
      check: () =>
        Effect.gen(function* () {
          const checkedAt = nowIso();
          const result = yield* Effect.exit(withD1Database((db) => db.run(sql`select 1`)));

          if (Exit.isFailure(result)) {
            const error = Cause.squash(result.cause);

            return {
              checkedAt,
              error: error instanceof Error ? error.message : "D1 check failed.",
              ok: false,
            };
          }

          return { checkedAt: nowIso(), ok: true };
        }),
    },
    tenants: {
      upsertTenant: (input) =>
        Effect.gen(function* () {
          const timestamp = nowIso();
          const row = {
            allowedOriginsJson: JSON.stringify(input.allowedOrigins),
            countryConfigJson: JSON.stringify(input.countryConfig),
            createdAt: timestamp,
            id: input.id,
            name: input.name,
            providerPriorityJson: JSON.stringify(input.providerPriority),
            status: input.status,
            updatedAt: timestamp,
          } satisfies typeof smartSuggestTenants.$inferInsert;
          const [stored] = yield* withD1Database((db) =>
            db
              .insert(smartSuggestTenants)
              .values(row)
              .onConflictDoUpdate({
                set: {
                  allowedOriginsJson: row.allowedOriginsJson,
                  countryConfigJson: row.countryConfigJson,
                  name: row.name,
                  providerPriorityJson: row.providerPriorityJson,
                  status: row.status,
                  updatedAt: row.updatedAt,
                },
                target: smartSuggestTenants.id,
              })
              .returning(),
          );

          return toTenantRecord(stored ?? row);
        }),
      getTenant: (tenantId) =>
        withD1Database((db) =>
          db.select().from(smartSuggestTenants).where(eq(smartSuggestTenants.id, tenantId)).get(),
        ).pipe(Effect.map((row) => (row === undefined ? undefined : toTenantRecord(row)))),
    },
    apiKeys: {
      upsertApiKey: (input) =>
        Effect.gen(function* () {
          const row = {
            createdAt: nowIso(),
            id: input.id,
            keyHash: input.keyHash,
            label: input.label,
            revokedAt: input.revokedAt ?? null,
            status: input.status,
            tenantId: input.tenantId,
          } satisfies typeof smartSuggestApiKeys.$inferInsert;
          const [stored] = yield* withD1Database((db) =>
            db
              .insert(smartSuggestApiKeys)
              .values(row)
              .onConflictDoUpdate({
                set: {
                  keyHash: row.keyHash,
                  label: row.label,
                  revokedAt: row.revokedAt,
                  status: row.status,
                  tenantId: row.tenantId,
                },
                target: smartSuggestApiKeys.id,
              })
              .returning(),
          );

          return toApiKeyRecord(stored ?? row);
        }),
      getApiKeyByHash: (keyHash) =>
        withD1Database((db) =>
          db
            .select()
            .from(smartSuggestApiKeys)
            .where(eq(smartSuggestApiKeys.keyHash, keyHash))
            .get(),
        ).pipe(Effect.map((row) => (row === undefined ? undefined : toApiKeyRecord(row)))),
      listApiKeysForTenant: (tenantId) =>
        withD1Database((db) =>
          db.select().from(smartSuggestApiKeys).where(eq(smartSuggestApiKeys.tenantId, tenantId)),
        ).pipe(Effect.map((rows) => rows.map(toApiKeyRecord))),
    },
    dataSources: {
      registerDataSource: (input) =>
        Effect.gen(function* () {
          const timestamp = nowIso();
          const row = {
            attributionLabel: input.attribution.label,
            attributionLicense: input.attribution.license ?? null,
            attributionUrl: input.attribution.url ?? null,
            cachePolicyJson: JSON.stringify(input.cachePolicy),
            countryCode: input.countryCode,
            createdAt: timestamp,
            datasetVersion: input.datasetVersion ?? null,
            id: input.id,
            modificationNoteSha256: input.modificationNoteSha256 ?? null,
            name: input.name,
            region: input.region ?? null,
            sourceKind: input.sourceKind,
            updatedAt: timestamp,
          } satisfies typeof smartSuggestDataSources.$inferInsert;
          const [stored] = yield* withD1Database((db) =>
            db
              .insert(smartSuggestDataSources)
              .values(row)
              .onConflictDoUpdate({
                set: {
                  attributionLabel: row.attributionLabel,
                  attributionLicense: row.attributionLicense,
                  attributionUrl: row.attributionUrl,
                  cachePolicyJson: row.cachePolicyJson,
                  countryCode: row.countryCode,
                  datasetVersion: row.datasetVersion,
                  modificationNoteSha256: row.modificationNoteSha256,
                  name: row.name,
                  region: row.region,
                  sourceKind: row.sourceKind,
                  updatedAt: row.updatedAt,
                },
                target: smartSuggestDataSources.id,
              })
              .returning(),
          );

          return toDataSourceRecord(stored ?? row);
        }),
      getDataSource: (sourceId) =>
        withD1Database((db) =>
          db
            .select()
            .from(smartSuggestDataSources)
            .where(eq(smartSuggestDataSources.id, sourceId))
            .get(),
        ).pipe(Effect.map((row) => (row === undefined ? undefined : toDataSourceRecord(row)))),
    },
    importRuns: {
      startImportRun: (input) =>
        Effect.gen(function* () {
          const existing = yield* withD1Database((db) =>
            db
              .select()
              .from(smartSuggestImportRuns)
              .where(eq(smartSuggestImportRuns.id, input.id))
              .get(),
          );

          yield* assertD1ImportRunRestartCompatible(existing, input);
          const importKind = input.importKind ?? "manual";

          if (existing === undefined) {
            yield* assertNoD1ActiveSequencedImportRun(input, importKind);
          }

          const row = toD1ImportRunInsertRow(input, importKind);
          const [stored] = yield* insertD1ImportRunRow(input, importKind, row);

          return toImportRunRecord(stored ?? row);
        }),
      finishImportRun: (input) =>
        Effect.gen(function* () {
          const [stored] = yield* withD1Database((db) =>
            db
              .update(smartSuggestImportRuns)
              .set({
                completedAt: input.completedAt,
                errorSummary: input.errorSummary ?? null,
                failedRows: input.failedRows,
                insertedRows: input.insertedRows,
                skippedRows: input.skippedRows ?? input.failedRows,
                status: input.status,
                tombstonedRows: input.tombstonedRows ?? 0,
                totalRows: input.totalRows,
                upsertedRows: input.upsertedRows ?? input.insertedRows,
              })
              .where(eq(smartSuggestImportRuns.id, input.id))
              .returning(),
          );

          if (stored === undefined) {
            return yield* Effect.fail(
              new SmartSuggestStorageError(
                "import-run-not-found",
                `Import run ${input.id} does not exist.`,
              ),
            );
          }

          return toImportRunRecord(stored);
        }),
      getImportRun: (runId) =>
        withD1Database((db) =>
          db
            .select()
            .from(smartSuggestImportRuns)
            .where(eq(smartSuggestImportRuns.id, runId))
            .get(),
        ).pipe(Effect.map((row) => (row === undefined ? undefined : toImportRunRecord(row)))),
      findLatestCompletedImportRun: (input) =>
        Effect.gen(function* () {
          if (input.importKinds.length === 0) {
            return;
          }

          const row = yield* withD1Database((db) =>
            db
              .select()
              .from(smartSuggestImportRuns)
              .where(
                and(
                  eq(smartSuggestImportRuns.status, "completed"),
                  eq(smartSuggestImportRuns.sourceId, input.sourceId),
                  eq(smartSuggestImportRuns.shardCountryCode, input.shardCountryCode),
                  inArray(smartSuggestImportRuns.importKind, input.importKinds),
                ),
              )
              .orderBy(
                desc(smartSuggestImportRuns.completedAt),
                desc(smartSuggestImportRuns.startedAt),
              )
              .get(),
          );

          return row === undefined ? undefined : toImportRunRecord(row);
        }),
      listRecentImportRuns: (limit = 10) => {
        const normalizedLimit = Math.max(1, Math.min(Math.trunc(limit), 50));

        return withD1Database((db) =>
          db
            .select()
            .from(smartSuggestImportRuns)
            .orderBy(desc(smartSuggestImportRuns.startedAt))
            .limit(normalizedLimit),
        ).pipe(Effect.map((rows) => rows.map(toImportRunRecord)));
      },
    },
    shardRegistry: {
      upsertShardMetadata: (input) =>
        Effect.gen(function* () {
          const shardId = input.shardId.trim();
          const previous = yield* withD1Database((db) =>
            db
              .select({ createdAt: smartSuggestShardRegistry.createdAt })
              .from(smartSuggestShardRegistry)
              .where(eq(smartSuggestShardRegistry.shardId, shardId))
              .get(),
          );
          const record = normalizeShardMetadataInput(input, previous);
          const row = toShardMetadataInsert(record);
          const [stored] = yield* withD1Database((db) =>
            db
              .insert(smartSuggestShardRegistry)
              .values(row)
              .onConflictDoUpdate({
                set: {
                  bindingName: row.bindingName,
                  countryCode: row.countryCode,
                  estimatedSizeBytes: row.estimatedSizeBytes,
                  importVersion: row.importVersion,
                  lastImportCompletedAt: row.lastImportCompletedAt,
                  municipalityCodesJson: row.municipalityCodesJson,
                  municipalityHintsJson: row.municipalityHintsJson,
                  postalPrefixesJson: row.postalPrefixesJson,
                  regionCode: row.regionCode,
                  regionKind: row.regionKind,
                  regionName: row.regionName,
                  rowCount: row.rowCount,
                  sourceFreshnessAt: row.sourceFreshnessAt,
                  state: row.state,
                  updatedAt: row.updatedAt,
                },
                target: smartSuggestShardRegistry.shardId,
              })
              .returning(),
          );

          return toShardMetadataRecord(stored ?? row);
        }),
      listShardMetadata: listD1ShardMetadata,
      resolveShardMetadata: (input) =>
        Effect.gen(function* () {
          const states = normalizeShardResolveStates(input.states);

          if (states.length === 0) {
            return [];
          }

          const [state] = states;
          const rows =
            states.length === 1 && state !== undefined
              ? yield* withD1Database((db) =>
                  db
                    .select()
                    .from(smartSuggestShardRegistry)
                    .where(
                      and(
                        eq(smartSuggestShardRegistry.countryCode, input.countryCode),
                        eq(smartSuggestShardRegistry.state, state),
                      ),
                    ),
                )
              : yield* withD1Database((db) =>
                  db
                    .select()
                    .from(smartSuggestShardRegistry)
                    .where(
                      and(
                        eq(smartSuggestShardRegistry.countryCode, input.countryCode),
                        inArray(smartSuggestShardRegistry.state, states),
                      ),
                    ),
                );

          return resolveShardMetadataMatches(rows.map(toShardMetadataRecord), input);
        }),
    },
    addressRecords: {
      upsertAddressRecords: (records) =>
        Effect.gen(function* () {
          const storedRecords: AddressRecord[] = [];

          for (const recordChunk of chunkItems(records, D1_ADDRESS_IMPORT_SUBCHUNK_SIZE)) {
            storedRecords.push(...(yield* upsertAddressRecordSubchunk(recordChunk)));
          }

          return storedRecords;
        }),
      listPostalLocalityAddressRecords: (input) =>
        Effect.gen(function* () {
          const postalDigits = normalizePostalCodeDigits(input.postalCode);
          const postalValues = postalCodeLookupValues(input.postalCode);

          if (postalDigits.length === 0 || postalValues.length === 0) {
            return [];
          }

          const postalFilter = or(
            inArray(smartSuggestAddressRecords.postalCode, postalValues),
            inArray(smartSuggestAddressRecords.ruianPostalCode, postalValues),
            sql`replace(${smartSuggestAddressRecords.postalCode}, ' ', '') = ${postalDigits}`,
            sql`replace(${smartSuggestAddressRecords.ruianPostalCode}, ' ', '') = ${postalDigits}`,
          );

          if (postalFilter === undefined) {
            return [];
          }

          const filters = [
            postalFilter,
            eq(smartSuggestAddressRecords.searchVisible, true),
            eq(smartSuggestAddressRecords.replicationStatus, "active"),
          ];

          if (input.countryCode !== undefined) {
            filters.push(eq(smartSuggestAddressRecords.countryCode, input.countryCode));
          }

          const rows = yield* withD1Database((db) =>
            db
              .select()
              .from(smartSuggestAddressRecords)
              .where(and(...filters))
              .orderBy(desc(smartSuggestAddressRecords.quality)),
          );

          return selectPostalLocalityAddressRecords(rows.map(toAddressRecord), input);
        }),
      searchAddressRecords: ({ countryCode, limit = 10, query }) =>
        Effect.gen(function* () {
          const normalizedLimit = Math.max(1, Math.min(Math.trunc(limit), 50));
          const ftsQuery = createAddressSearchFtsQuery(query);
          const canUsePrefixIndex = hasAddressSearchPrefixToken(query);

          const indexedResults =
            ftsQuery === undefined
              ? undefined
              : yield* searchAddressRecordsByFts({
                  countryCode,
                  limit: normalizedLimit,
                  query,
                });

          if (indexedResults !== undefined) {
            return indexedResults;
          }

          const tokenResults = canUsePrefixIndex
            ? yield* searchAddressRecordsByTokens({
                countryCode,
                limit: normalizedLimit,
                query,
              })
            : undefined;

          if (tokenResults !== undefined) {
            return tokenResults;
          }

          if (ftsQuery === undefined) {
            return [];
          }

          return yield* searchAddressRecordsByLabel({
            countryCode,
            limit: normalizedLimit,
            query,
          });
        }),
      getAddressRecord: (recordId) =>
        withD1Database((db) =>
          db
            .select()
            .from(smartSuggestAddressRecords)
            .where(eq(smartSuggestAddressRecords.id, recordId))
            .get(),
        ).pipe(Effect.map((row) => (row === undefined ? undefined : toAddressRecord(row)))),
    },
    addressTombstones: {
      upsertAddressTombstones: (tombstones) =>
        Effect.gen(function* () {
          const storedTombstones: AddressTombstoneRecord[] = [];

          for (const input of tombstones) {
            const timestamp = nowIso();
            const row = toAddressTombstoneRow(input, timestamp);
            const [stored] = yield* withD1Database((db) =>
              db
                .insert(smartSuggestAddressTombstones)
                .values(row)
                .onConflictDoUpdate({
                  set: toAddressTombstoneUpdateSet(row),
                  target: smartSuggestAddressTombstones.id,
                })
                .returning(),
            );
            yield* markAddressRecordTombstoned(input);

            storedTombstones.push(toAddressTombstoneRecord(stored ?? row));
          }

          return storedTombstones;
        }),
      listAddressTombstones: (limit = 10) => {
        const normalizedLimit = Math.max(1, Math.min(Math.trunc(limit), 50));

        return withD1Database((db) =>
          db
            .select()
            .from(smartSuggestAddressTombstones)
            .orderBy(desc(smartSuggestAddressTombstones.updatedAt))
            .limit(normalizedLimit),
        ).pipe(Effect.map((rows) => rows.map(toAddressTombstoneRecord)));
      },
    },
    suggestCache: {
      readSuggestCache: (cacheKey) =>
        withD1Database((db) =>
          db
            .select()
            .from(smartSuggestCacheEntries)
            .where(eq(smartSuggestCacheEntries.cacheKey, cacheKey))
            .get(),
        ).pipe(Effect.map(toReadSuggestCacheRecord)),
      writeSuggestCache: (input) =>
        Effect.gen(function* () {
          yield* storageEffect(() => assertCachePolicyAllowsWrite(input.cachePolicy));

          const timestamp = nowIso();
          const row = {
            cacheKey: input.cacheKey,
            cachePolicyJson: JSON.stringify(input.cachePolicy),
            countryCode: input.countryCode ?? null,
            createdAt: timestamp,
            expiresAt: input.expiresAt ?? null,
            kind: input.kind,
            language: input.language ?? null,
            payloadJson: JSON.stringify(input.payload),
            queryHash: input.queryHash,
            status: input.status ?? "written",
            tenantId: input.tenantId ?? null,
            updatedAt: timestamp,
          } satisfies typeof smartSuggestCacheEntries.$inferInsert;
          const [stored] = yield* withD1Database((db) =>
            db
              .insert(smartSuggestCacheEntries)
              .values(row)
              .onConflictDoUpdate({
                set: {
                  cachePolicyJson: row.cachePolicyJson,
                  countryCode: row.countryCode,
                  expiresAt: row.expiresAt,
                  kind: row.kind,
                  language: row.language,
                  payloadJson: row.payloadJson,
                  queryHash: row.queryHash,
                  status: row.status,
                  tenantId: row.tenantId,
                  updatedAt: row.updatedAt,
                },
                target: smartSuggestCacheEntries.cacheKey,
              })
              .returning(),
          );

          return toSuggestCacheRecord(stored ?? row);
        }),
    },
    providerEvents: {
      recordProviderEvent: (input) =>
        Effect.gen(function* () {
          const row = {
            createdAt: nowIso(),
            errorCode: input.errorCode ?? null,
            id: input.id,
            latencyMs: input.latencyMs ?? null,
            providerId: input.providerId,
            queryHash: input.queryHash ?? null,
            requestId: input.requestId,
            status: input.status,
            tenantId: input.tenantId ?? null,
          } satisfies typeof smartSuggestProviderEvents.$inferInsert;
          const [stored] = yield* withD1Database((db) =>
            db.insert(smartSuggestProviderEvents).values(row).returning(),
          );

          return toProviderEventRecord(stored ?? row);
        }),
      listProviderEvents: (requestId) =>
        withD1Database((db) =>
          db
            .select()
            .from(smartSuggestProviderEvents)
            .where(eq(smartSuggestProviderEvents.requestId, requestId)),
        ).pipe(Effect.map((rows) => rows.map(toProviderEventRecord))),
    },
    acceptEvents: {
      recordAcceptEvent: (input) =>
        Effect.gen(function* () {
          const row = {
            acceptedAt: input.acceptedAt,
            id: input.id,
            requestId: input.requestId,
            sourceId: input.sourceId,
            suggestionId: input.suggestionId,
            tenantJson: input.tenant === undefined ? null : JSON.stringify(input.tenant),
          } satisfies typeof smartSuggestAcceptEvents.$inferInsert;
          const [stored] = yield* withD1Database((db) =>
            db
              .insert(smartSuggestAcceptEvents)
              .values(row)
              .onConflictDoUpdate({
                set: {
                  acceptedAt: row.acceptedAt,
                  requestId: row.requestId,
                  sourceId: row.sourceId,
                  suggestionId: row.suggestionId,
                  tenantJson: row.tenantJson,
                },
                target: smartSuggestAcceptEvents.id,
              })
              .returning(),
          );

          return toAcceptEventRecord(stored ?? row);
        }),
      listAcceptEvents: (requestId) =>
        withD1Database((db) =>
          db
            .select()
            .from(smartSuggestAcceptEvents)
            .where(eq(smartSuggestAcceptEvents.requestId, requestId)),
        ).pipe(Effect.map((rows) => rows.map(toAcceptEventRecord))),
    },
  };
};

export const createInMemorySmartSuggestRepositories = (): SmartSuggestRepositories => {
  const tenants = new Map<string, TenantRecord>();
  const apiKeys = new Map<string, ApiKeyRecord>();
  const dataSources = new Map<string, DataSourceRecord>();
  const importRuns = new Map<string, ImportRunRecord>();
  const shardRegistry = new Map<string, SmartSuggestShardMetadataRecord>();
  const addressRecords = new Map<string, AddressRecord>();
  const addressTombstones = new Map<string, AddressTombstoneRecord>();
  const addressSearchTokensByRecordId = new Map<string, AddressSearchTokenInsert[]>();
  const suggestCache = new Map<string, SuggestCacheRecord>();
  const providerEvents = new Map<string, ProviderEventRecord[]>();
  const acceptEvents = new Map<string, AcceptEventRecord[]>();
  const indexAddressRecord = (record: AddressRecord) => {
    if (!record.searchVisible || record.replicationStatus !== "active") {
      addressSearchTokensByRecordId.delete(record.id);
      return;
    }

    addressSearchTokensByRecordId.set(record.id, createAddressSearchTokenRows(record));
  };
  const findIndexedAddressRecords = (
    query: string,
    countryCode: SmartSuggestCountryCode | undefined,
  ) => {
    const prefixes = new Set(createQuerySearchPrefixes(query));
    const recordIds = new Set<string>();

    if (prefixes.size === 0) {
      return [];
    }

    for (const tokens of addressSearchTokensByRecordId.values()) {
      for (const token of tokens) {
        if (
          prefixes.has(token.prefix) &&
          (countryCode === undefined || token.countryCode === countryCode)
        ) {
          recordIds.add(token.recordId);
        }
      }
    }

    return [...recordIds]
      .map((recordId) => addressRecords.get(recordId))
      .filter(
        (record): record is AddressRecord =>
          record?.searchVisible === true && record.replicationStatus === "active",
      );
  };
  const toInMemoryTombstonedAddressRecord = (
    record: AddressRecord,
    tombstone: AddressTombstoneRecordInput,
  ) => {
    const visibility: AddressRecordVisibility = {
      ...(record.visibility ?? {
        replicationStatus: "tombstoned",
        searchVisible: false,
      }),
      replicationStatus: "tombstoned",
      searchVisible: false,
    };
    const reason = tombstone.reason ?? record.visibility?.reason;
    const validTo = tombstone.deletedAt ?? record.visibility?.validTo;

    if (reason !== undefined) {
      visibility.reason = reason;
    }
    if (validTo !== undefined) {
      visibility.validTo = validTo;
    }

    const updated: AddressRecord = {
      ...record,
      replicationStatus: "tombstoned",
      searchVisible: false,
      updatedAt: nowIso(),
      visibility,
    };

    if (tombstone.sourceLineage !== undefined) {
      updated.sourceLineage = tombstone.sourceLineage;
    }
    if (tombstone.ruian !== undefined) {
      updated.ruian = tombstone.ruian;
    }

    return updated;
  };
  const markInMemoryAddressRecordTombstoned = (tombstone: AddressTombstoneRecordInput) => {
    const matchedRecords = [...addressRecords.values()].filter(
      (record) =>
        record.id === tombstone.id ||
        (tombstone.ruian?.addressPlaceCode !== undefined &&
          record.ruian?.addressPlaceCode === tombstone.ruian.addressPlaceCode),
    );

    for (const record of matchedRecords) {
      const updated = toInMemoryTombstonedAddressRecord(record, tombstone);
      addressRecords.set(updated.id, updated);
      addressSearchTokensByRecordId.delete(updated.id);
    }
  };
  const listInMemoryShardMetadata = (input: SmartSuggestShardMetadataListInput = {}) =>
    [...shardRegistry.values()]
      .filter((record) => {
        if (input.countryCode !== undefined && record.countryCode !== input.countryCode) {
          return false;
        }

        return input.state === undefined || record.state === input.state;
      })
      .toSorted((left, right) => right.updatedAt.localeCompare(left.updatedAt));

  return {
    health: {
      check: () => storageEffect(() => ({ checkedAt: nowIso(), ok: true })),
    },
    tenants: {
      upsertTenant: (input) =>
        storageEffect(() => {
          const record = withTimestamps(input, tenants.get(input.id));
          tenants.set(record.id, record);
          return record;
        }),
      getTenant: (tenantId) => storageEffect(() => tenants.get(tenantId)),
    },
    apiKeys: {
      upsertApiKey: (input) =>
        storageEffect(() => {
          const timestamp = nowIso();
          const existing = apiKeys.get(input.id);
          const record: ApiKeyRecord = {
            ...input,
            createdAt: existing?.createdAt ?? timestamp,
          };
          apiKeys.set(record.id, record);
          return record;
        }),
      getApiKeyByHash: (keyHash) =>
        storageEffect(() => [...apiKeys.values()].find((record) => record.keyHash === keyHash)),
      listApiKeysForTenant: (tenantId) =>
        storageEffect(() => [...apiKeys.values()].filter((record) => record.tenantId === tenantId)),
    },
    dataSources: {
      registerDataSource: (input) =>
        storageEffect(() => {
          const record = withTimestamps(input, dataSources.get(input.id));
          dataSources.set(record.id, record);
          return record;
        }),
      getDataSource: (sourceId) => storageEffect(() => dataSources.get(sourceId)),
    },
    importRuns: {
      startImportRun: (input) =>
        storageEffect(() => {
          const existing = importRuns.get(input.id);

          if (existing !== undefined) {
            assertImportRunRestartCompatible(existing, input);
          }

          const importKind = input.importKind ?? "manual";

          if (existing === undefined && isSequencedImportKind(importKind)) {
            const activeRun = [...importRuns.values()].find(
              (run) =>
                run.status === "running" &&
                run.sourceId === input.sourceId &&
                run.shardCountryCode === input.shardCountryCode &&
                isSequencedImportKind(run.importKind),
            );

            assertNoActiveSequencedImportRun(input, activeRun);
          }

          const record: ImportRunRecord = {
            ...input,
            failedRows: 0,
            importKind,
            insertedRows: 0,
            skippedRows: 0,
            startedAt: nowIso(),
            status: "running",
            tombstonedRows: 0,
            totalRows: 0,
            upsertedRows: 0,
          };
          importRuns.set(record.id, record);
          return record;
        }),
      finishImportRun: (input) =>
        storageEffect(() => {
          const existing = importRuns.get(input.id);

          if (existing === undefined) {
            throw new SmartSuggestStorageError(
              "import-run-not-found",
              `Import run ${input.id} does not exist.`,
            );
          }

          const record: ImportRunRecord = {
            ...existing,
            ...input,
            skippedRows: input.skippedRows ?? input.failedRows,
            tombstonedRows: input.tombstonedRows ?? 0,
            upsertedRows: input.upsertedRows ?? input.insertedRows,
          };
          importRuns.set(record.id, record);
          return record;
        }),
      getImportRun: (runId) => storageEffect(() => importRuns.get(runId)),
      findLatestCompletedImportRun: (input) =>
        storageEffect(() => {
          if (input.importKinds.length === 0) {
            return;
          }

          const importKinds = new Set(input.importKinds);

          return [...importRuns.values()]
            .filter(
              (run) =>
                run.status === "completed" &&
                run.sourceId === input.sourceId &&
                run.shardCountryCode === input.shardCountryCode &&
                run.importKind !== undefined &&
                importKinds.has(run.importKind),
            )
            .toSorted((left, right) => {
              const byCompletedAt = (right.completedAt ?? "").localeCompare(left.completedAt ?? "");

              return byCompletedAt === 0
                ? right.startedAt.localeCompare(left.startedAt)
                : byCompletedAt;
            })[0];
        }),
      listRecentImportRuns: (limit = 10) =>
        storageEffect(() => {
          const normalizedLimit = Math.max(1, Math.min(Math.trunc(limit), 50));

          return [...importRuns.values()]
            .toSorted((left, right) => right.startedAt.localeCompare(left.startedAt))
            .slice(0, normalizedLimit);
        }),
    },
    shardRegistry: {
      upsertShardMetadata: (input) =>
        storageEffect(() => {
          const shardId = input.shardId.trim();
          const record = normalizeShardMetadataInput(input, shardRegistry.get(shardId));
          shardRegistry.set(record.shardId, record);
          return record;
        }),
      listShardMetadata: (input) => storageEffect(() => listInMemoryShardMetadata(input)),
      resolveShardMetadata: (input) =>
        storageEffect(() =>
          resolveShardMetadataMatches(
            listInMemoryShardMetadata({ countryCode: input.countryCode }),
            input,
          ),
        ),
    },
    addressRecords: {
      upsertAddressRecords: (records) =>
        storageEffect(() =>
          records.map((input) => {
            const previous = addressRecords.get(input.id);
            const replicationStatus = normalizeReplicationStatus(input);
            const searchVisible = normalizeSearchVisible(input);
            const visibility: AddressRecordVisibility = {
              ...(input.visibility ?? {
                replicationStatus,
                searchVisible,
              }),
              replicationStatus,
              searchVisible,
            };
            const record = withTimestamps(
              {
                ...input,
                replicationStatus,
                searchVisible,
                visibility,
              },
              previous,
            );
            addressRecords.set(record.id, record);
            indexAddressRecord(record);
            return record;
          }),
        ),
      listPostalLocalityAddressRecords: (input) =>
        storageEffect(() =>
          selectPostalLocalityAddressRecords([...addressRecords.values()], input),
        ),
      searchAddressRecords: ({ countryCode, limit = 10, query }) =>
        storageEffect(() => {
          const normalizedQuery = normalizeSearchText(query);
          const normalizedLimit = Math.max(1, Math.min(Math.trunc(limit), 50));
          const ftsQuery = createAddressSearchFtsQuery(query);
          const canUsePrefixIndex = hasAddressSearchPrefixToken(query);

          const indexedRecords = canUsePrefixIndex
            ? findIndexedAddressRecords(query, countryCode)
            : [];
          if (indexedRecords.length === 0 && ftsQuery === undefined) {
            return [];
          }

          const candidates =
            indexedRecords.length > 0
              ? indexedRecords
              : [...addressRecords.values()].filter((record) => {
                  if (countryCode !== undefined && record.countryCode !== countryCode) {
                    return false;
                  }
                  if (!record.searchVisible || record.replicationStatus !== "active") {
                    return false;
                  }

                  return normalizeSearchText(record.searchLabel).includes(normalizedQuery);
                });

          return rankAddressRecordResults(query, candidates, normalizedLimit);
        }),
      getAddressRecord: (recordId) => storageEffect(() => addressRecords.get(recordId)),
    },
    addressTombstones: {
      upsertAddressTombstones: (tombstones) =>
        storageEffect(() =>
          tombstones.map((input) => {
            const record = withTimestamps(input, addressTombstones.get(input.id));
            addressTombstones.set(record.id, record);
            markInMemoryAddressRecordTombstoned(input);
            return record;
          }),
        ),
      listAddressTombstones: (limit = 10) =>
        storageEffect(() => {
          const normalizedLimit = Math.max(1, Math.min(Math.trunc(limit), 50));

          return [...addressTombstones.values()]
            .toSorted((left, right) => right.updatedAt.localeCompare(left.updatedAt))
            .slice(0, normalizedLimit);
        }),
    },
    suggestCache: {
      readSuggestCache: (cacheKey) =>
        storageEffect(() => {
          const record = suggestCache.get(cacheKey);

          if (record === undefined) {
            return;
          }

          return isCacheExpired(record)
            ? { ...record, status: "stale" }
            : { ...record, status: "hit" };
        }),
      writeSuggestCache: (input) =>
        storageEffect(() => {
          assertCachePolicyAllowsWrite(input.cachePolicy);

          const timestamp = nowIso();
          const existing = suggestCache.get(input.cacheKey);
          const record: SuggestCacheRecord = {
            ...input,
            createdAt: existing?.createdAt ?? timestamp,
            status: input.status ?? "written",
            updatedAt: timestamp,
          };
          suggestCache.set(record.cacheKey, record);
          return record;
        }),
    },
    providerEvents: {
      recordProviderEvent: (input) =>
        storageEffect(() => {
          const record = { ...input, createdAt: nowIso() };
          const requestEvents = providerEvents.get(record.requestId) ?? [];
          providerEvents.set(record.requestId, [...requestEvents, record]);
          return record;
        }),
      listProviderEvents: (requestId) => storageEffect(() => providerEvents.get(requestId) ?? []),
    },
    acceptEvents: {
      recordAcceptEvent: (input) =>
        storageEffect(() => {
          const requestEvents = acceptEvents.get(input.requestId) ?? [];
          acceptEvents.set(input.requestId, [...requestEvents, input]);
          return input;
        }),
      listAcceptEvents: (requestId) => storageEffect(() => acceptEvents.get(requestId) ?? []),
    },
  };
};

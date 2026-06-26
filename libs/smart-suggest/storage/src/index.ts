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
} from "@techsio/smart-suggest-core"
import { drizzle } from "drizzle-orm/d1"
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core"

export type JsonPrimitive = string | number | boolean | null
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { readonly [key: string]: JsonValue }

export type StorageHealth = {
  ok: boolean
  checkedAt: string
  error?: string
}

export type TenantRecord = {
  id: string
  name: string
  status: "active" | "disabled"
  allowedOrigins: readonly string[]
  providerPriority: readonly string[]
  countryConfig: Record<string, JsonValue>
  createdAt: string
  updatedAt: string
}

export type DataSourceRecord = {
  id: string
  sourceKind: SuggestionSourceKind
  name: string
  countryCode: SmartSuggestCountryCode
  region?: string
  datasetVersion?: string
  attribution: SuggestionAttribution
  cachePolicy: ProviderCachePolicy
  createdAt: string
  updatedAt: string
}

export type ImportRunStatus = "completed" | "failed" | "running"

export type ImportRunRecord = {
  id: string
  sourceId: string
  status: ImportRunStatus
  shardCountryCode: SmartSuggestCountryCode
  startedAt: string
  completedAt?: string
  totalRows: number
  insertedRows: number
  failedRows: number
  errorSummary?: string
}

export type AddressRecord = {
  id: string
  sourceId: string
  countryCode: SmartSuggestCountryCode
  parts: AddressParts
  displayLabel: string
  searchLabel: string
  quality: number
  latitude?: number
  longitude?: number
  attribution?: SuggestionAttribution
  createdAt: string
  updatedAt: string
}

export type AddressSearchRecordInput = Omit<
  AddressRecord,
  "createdAt" | "updatedAt"
>

export type SuggestCacheRecord = {
  cacheKey: string
  queryHash: string
  kind: SmartSuggestKind
  countryCode?: SmartSuggestCountryCode
  tenantId?: string
  language?: string
  status: SmartSuggestCacheStatus
  payload: readonly SmartSuggestSuggestion[]
  cachePolicy: ProviderCachePolicy
  expiresAt?: string
  createdAt: string
  updatedAt: string
}

export type SuggestCacheWrite = Omit<
  SuggestCacheRecord,
  "createdAt" | "status" | "updatedAt"
> & {
  status?: SmartSuggestCacheStatus
}

export type ProviderEventRecord = {
  id: string
  requestId: string
  providerId: string
  tenantId?: string
  status: "error" | "skipped" | "success" | "timeout"
  latencyMs?: number
  errorCode?: SmartSuggestErrorCode
  queryHash?: string
  createdAt: string
}

export type AcceptEventRecord = {
  id: string
  requestId: string
  suggestionId: string
  acceptedAt: string
  tenant?: SmartSuggestTenantContext
  sourceId: string
}

export type SuggestQueryHashInput = {
  query: string
  kind: SmartSuggestKind
  countryCode?: SmartSuggestCountryCode
  tenantId?: string
  language?: string
}

export type SuggestCacheKeyInput = Omit<SuggestQueryHashInput, "query"> & {
  queryHash: string
}

export type SmartSuggestRepositories = {
  health: {
    check: () => Promise<StorageHealth>
  }
  tenants: {
    upsertTenant: (
      input: Omit<TenantRecord, "createdAt" | "updatedAt">
    ) => Promise<TenantRecord>
    getTenant: (tenantId: string) => Promise<TenantRecord | undefined>
  }
  dataSources: {
    registerDataSource: (
      input: Omit<DataSourceRecord, "createdAt" | "updatedAt">
    ) => Promise<DataSourceRecord>
    getDataSource: (sourceId: string) => Promise<DataSourceRecord | undefined>
  }
  importRuns: {
    startImportRun: (
      input: Pick<ImportRunRecord, "id" | "shardCountryCode" | "sourceId">
    ) => Promise<ImportRunRecord>
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
      >
    ) => Promise<ImportRunRecord>
    getImportRun: (runId: string) => Promise<ImportRunRecord | undefined>
  }
  addressRecords: {
    upsertAddressRecords: (
      records: readonly AddressSearchRecordInput[]
    ) => Promise<readonly AddressRecord[]>
    searchAddressRecords: (input: {
      countryCode?: SmartSuggestCountryCode
      limit?: number
      query: string
    }) => Promise<readonly AddressRecord[]>
    getAddressRecord: (recordId: string) => Promise<AddressRecord | undefined>
  }
  suggestCache: {
    readSuggestCache: (
      cacheKey: string
    ) => Promise<SuggestCacheRecord | undefined>
    writeSuggestCache: (input: SuggestCacheWrite) => Promise<SuggestCacheRecord>
  }
  providerEvents: {
    recordProviderEvent: (
      input: Omit<ProviderEventRecord, "createdAt">
    ) => Promise<ProviderEventRecord>
    listProviderEvents: (
      requestId: string
    ) => Promise<readonly ProviderEventRecord[]>
  }
  acceptEvents: {
    recordAcceptEvent: (input: AcceptEventRecord) => Promise<AcceptEventRecord>
    listAcceptEvents: (
      requestId: string
    ) => Promise<readonly AcceptEventRecord[]>
  }
}

export class SmartSuggestStorageError extends Error {
  readonly code:
    | "cache-policy-violation"
    | "import-run-not-found"
    | "storage-unavailable"

  constructor(code: SmartSuggestStorageError["code"], message: string) {
    super(message)
    this.name = "SmartSuggestStorageError"
    this.code = code
  }
}

export const smartSuggestTenants = sqliteTable("smart_suggest_tenants", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status").notNull().default("active"),
  allowedOriginsJson: text("allowed_origins_json").notNull().default("[]"),
  providerPriorityJson: text("provider_priority_json").notNull().default("[]"),
  countryConfigJson: text("country_config_json").notNull().default("{}"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
})

export const smartSuggestApiKeys = sqliteTable(
  "smart_suggest_api_keys",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    keyHash: text("key_hash").notNull(),
    label: text("label").notNull(),
    status: text("status").notNull().default("active"),
    createdAt: text("created_at").notNull(),
    revokedAt: text("revoked_at"),
  },
  (table) => [
    index("smart_suggest_api_keys_tenant_idx").on(table.tenantId),
    uniqueIndex("smart_suggest_api_keys_hash_idx").on(table.keyHash),
  ]
)

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
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [index("smart_suggest_sources_country_idx").on(table.countryCode)]
)

export const smartSuggestImportRuns = sqliteTable(
  "smart_suggest_import_runs",
  {
    id: text("id").primaryKey(),
    sourceId: text("source_id").notNull(),
    status: text("status").notNull(),
    shardCountryCode: text("shard_country_code").notNull(),
    startedAt: text("started_at").notNull(),
    completedAt: text("completed_at"),
    totalRows: integer("total_rows").notNull().default(0),
    insertedRows: integer("inserted_rows").notNull().default(0),
    failedRows: integer("failed_rows").notNull().default(0),
    errorSummary: text("error_summary"),
  },
  (table) => [
    index("smart_suggest_import_runs_source_idx").on(table.sourceId),
    index("smart_suggest_import_runs_shard_idx").on(table.shardCountryCode),
  ]
)

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
  ]
)

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
  ]
)

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
    index("smart_suggest_cache_tenant_country_idx").on(
      table.tenantId,
      table.countryCode
    ),
  ]
)

export const smartSuggestAddressRecords = sqliteTable(
  "smart_suggest_address_records",
  {
    id: text("id").primaryKey(),
    sourceId: text("source_id").notNull(),
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
    latitude: real("latitude"),
    longitude: real("longitude"),
    quality: real("quality").notNull().default(0),
    attributionJson: text("attribution_json"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("smart_suggest_address_country_postal_idx").on(
      table.countryCode,
      table.postalCode
    ),
    index("smart_suggest_address_source_idx").on(table.sourceId),
  ]
)

export const smartSuggestAddressSearchTokens = sqliteTable(
  "smart_suggest_address_search_tokens",
  {
    id: text("id").primaryKey(),
    recordId: text("record_id").notNull(),
    countryCode: text("country_code").notNull(),
    token: text("token").notNull(),
    prefix: text("prefix").notNull(),
    weight: real("weight").notNull().default(1),
  },
  (table) => [
    index("smart_suggest_address_tokens_prefix_idx").on(
      table.countryCode,
      table.prefix
    ),
    index("smart_suggest_address_tokens_record_idx").on(table.recordId),
  ]
)

export const smartSuggestSchema = {
  smartSuggestAcceptEvents,
  smartSuggestAddressRecords,
  smartSuggestAddressSearchTokens,
  smartSuggestApiKeys,
  smartSuggestCacheEntries,
  smartSuggestDataSources,
  smartSuggestImportRuns,
  smartSuggestProviderEvents,
  smartSuggestTenants,
}

export type SmartSuggestD1Binding = Parameters<typeof drizzle>[0]

export const createSmartSuggestD1Database = (binding: SmartSuggestD1Binding) =>
  drizzle(binding, { schema: smartSuggestSchema })

const nowIso = () => new Date().toISOString()

const normalizeQueryForHash = (input: SuggestQueryHashInput) =>
  [
    input.kind,
    input.countryCode ?? "",
    input.tenantId ?? "",
    input.language ?? "",
    input.query.trim().toLocaleLowerCase().replaceAll(/\s+/g, " "),
  ].join("\u001f")

const toHex = (bytes: ArrayBuffer) =>
  [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")

export const createSuggestQueryHash = async (input: SuggestQueryHashInput) => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(normalizeQueryForHash(input))
  )

  return toHex(digest)
}

export const createSuggestCacheKey = (input: SuggestCacheKeyInput) =>
  [
    "smart-suggest",
    "v1",
    input.kind,
    input.countryCode ?? "global",
    input.tenantId ?? "public",
    input.language ?? "default",
    input.queryHash,
  ].join(":")

const normalizeSearchText = (value: string) =>
  value
    .normalize("NFD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase()
    .replaceAll(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()

const withTimestamps = <T extends { id: string }>(
  input: T,
  previous?: { createdAt: string }
) => {
  const timestamp = nowIso()

  return {
    ...input,
    createdAt: previous?.createdAt ?? timestamp,
    updatedAt: timestamp,
  }
}

const assertCachePolicyAllowsWrite = (policy: ProviderCachePolicy) => {
  if (policy.kind === "none") {
    throw new SmartSuggestStorageError(
      "cache-policy-violation",
      "Provider cache policy forbids persistent cache writes."
    )
  }
}

const isCacheExpired = (record: SuggestCacheRecord) =>
  record.expiresAt !== undefined && Date.parse(record.expiresAt) <= Date.now()

const resolveSync = <T>(compute: () => T): Promise<T> =>
  new Promise((resolve, reject) => {
    try {
      resolve(compute())
    } catch (error) {
      reject(error)
    }
  })

export const createInMemorySmartSuggestRepositories =
  (): SmartSuggestRepositories => {
    const tenants = new Map<string, TenantRecord>()
    const dataSources = new Map<string, DataSourceRecord>()
    const importRuns = new Map<string, ImportRunRecord>()
    const addressRecords = new Map<string, AddressRecord>()
    const suggestCache = new Map<string, SuggestCacheRecord>()
    const providerEvents = new Map<string, ProviderEventRecord[]>()
    const acceptEvents = new Map<string, AcceptEventRecord[]>()

    return {
      health: {
        check: () => Promise.resolve({ checkedAt: nowIso(), ok: true }),
      },
      tenants: {
        upsertTenant: (input) =>
          resolveSync(() => {
            const record = withTimestamps(input, tenants.get(input.id))
            tenants.set(record.id, record)
            return record
          }),
        getTenant: (tenantId) => Promise.resolve(tenants.get(tenantId)),
      },
      dataSources: {
        registerDataSource: (input) =>
          resolveSync(() => {
            const record = withTimestamps(input, dataSources.get(input.id))
            dataSources.set(record.id, record)
            return record
          }),
        getDataSource: (sourceId) => Promise.resolve(dataSources.get(sourceId)),
      },
      importRuns: {
        startImportRun: (input) =>
          resolveSync(() => {
            const record: ImportRunRecord = {
              ...input,
              failedRows: 0,
              insertedRows: 0,
              startedAt: nowIso(),
              status: "running",
              totalRows: 0,
            }
            importRuns.set(record.id, record)
            return record
          }),
        finishImportRun: (input) =>
          resolveSync(() => {
            const existing = importRuns.get(input.id)

            if (existing === undefined) {
              throw new SmartSuggestStorageError(
                "import-run-not-found",
                `Import run ${input.id} does not exist.`
              )
            }

            const record: ImportRunRecord = { ...existing, ...input }
            importRuns.set(record.id, record)
            return record
          }),
        getImportRun: (runId) => Promise.resolve(importRuns.get(runId)),
      },
      addressRecords: {
        upsertAddressRecords: (records) =>
          Promise.resolve(
            records.map((input) => {
              const record = withTimestamps(input, addressRecords.get(input.id))
              addressRecords.set(record.id, record)
              return record
            })
          ),
        searchAddressRecords: ({ countryCode, limit = 10, query }) =>
          resolveSync(() => {
            const normalizedQuery = normalizeSearchText(query)
            const normalizedLimit = Math.max(1, Math.min(Math.trunc(limit), 50))

            return [...addressRecords.values()]
              .filter((record) => {
                if (
                  countryCode !== undefined &&
                  record.countryCode !== countryCode
                ) {
                  return false
                }

                return normalizeSearchText(record.searchLabel).includes(
                  normalizedQuery
                )
              })
              .sort((left, right) => right.quality - left.quality)
              .slice(0, normalizedLimit)
          }),
        getAddressRecord: (recordId) =>
          Promise.resolve(addressRecords.get(recordId)),
      },
      suggestCache: {
        readSuggestCache: (cacheKey) =>
          resolveSync(() => {
            const record = suggestCache.get(cacheKey)

            if (record === undefined) {
              return
            }

            return isCacheExpired(record)
              ? { ...record, status: "stale" }
              : { ...record, status: "hit" }
          }),
        writeSuggestCache: (input) =>
          resolveSync(() => {
            assertCachePolicyAllowsWrite(input.cachePolicy)

            const timestamp = nowIso()
            const existing = suggestCache.get(input.cacheKey)
            const record: SuggestCacheRecord = {
              ...input,
              createdAt: existing?.createdAt ?? timestamp,
              status: input.status ?? "written",
              updatedAt: timestamp,
            }
            suggestCache.set(record.cacheKey, record)
            return record
          }),
      },
      providerEvents: {
        recordProviderEvent: (input) =>
          resolveSync(() => {
            const record = { ...input, createdAt: nowIso() }
            const requestEvents = providerEvents.get(record.requestId) ?? []
            providerEvents.set(record.requestId, [...requestEvents, record])
            return record
          }),
        listProviderEvents: (requestId) =>
          Promise.resolve(providerEvents.get(requestId) ?? []),
      },
      acceptEvents: {
        recordAcceptEvent: (input) =>
          resolveSync(() => {
            const requestEvents = acceptEvents.get(input.requestId) ?? []
            acceptEvents.set(input.requestId, [...requestEvents, input])
            return input
          }),
        listAcceptEvents: (requestId) =>
          Promise.resolve(acceptEvents.get(requestId) ?? []),
      },
    }
  }

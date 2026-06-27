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
import {
  createPrefixTokens,
  extractPostalCodeCandidates,
  normalizeSearchText,
  rankAddressCandidates,
  tokenizeAddressText,
} from "@techsio/smart-suggest-indexing"
import { and, desc, eq, inArray, like, sql } from "drizzle-orm"
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
    listRecentImportRuns: (
      limit?: number
    ) => Promise<readonly ImportRunRecord[]>
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

const SEARCH_INDEX_PREFIX_OPTIONS = {
  maxLength: 16,
  minLength: 1,
} as const

type AddressSearchTokenInsert =
  typeof smartSuggestAddressSearchTokens.$inferInsert

const createAddressSearchTokenRows = (
  record: Pick<AddressRecord, "countryCode" | "id" | "searchLabel">
): AddressSearchTokenInsert[] => {
  const rows: AddressSearchTokenInsert[] = []
  const tokens = tokenizeAddressText(record.searchLabel)

  for (const token of tokens) {
    for (const prefix of createPrefixTokens(
      [token],
      SEARCH_INDEX_PREFIX_OPTIONS
    )) {
      rows.push({
        countryCode: record.countryCode,
        id: `${record.id}\u001f${token}\u001f${prefix}`,
        prefix,
        recordId: record.id,
        token,
        weight: prefix === token ? 2 : 1,
      })
    }
  }

  return rows
}

const createQuerySearchPrefixes = (query: string) => {
  const queryTokens = new Set(tokenizeAddressText(query))

  for (const postalCode of extractPostalCodeCandidates(query)) {
    queryTokens.add(postalCode.value)

    for (const token of tokenizeAddressText(postalCode.displayValue)) {
      queryTokens.add(token)
    }
  }

  return [...queryTokens].map((token) =>
    token.slice(0, SEARCH_INDEX_PREFIX_OPTIONS.maxLength)
  )
}

const rankAddressRecordResults = (
  query: string,
  records: readonly AddressRecord[],
  limit: number
) =>
  rankAddressCandidates(
    query,
    records.map((record) => ({ ...record, confidence: record.quality })),
    { limit }
  ).map(({ candidate }) => {
    const { confidence: _confidence, ...record } = candidate

    return record
  })

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

const parseJsonValue = <T>(
  value: string | null | undefined,
  fallback: T
): T => {
  if (value === undefined || value === null || value.trim().length === 0) {
    return fallback
  }

  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

const parseJsonRecord = (
  value: string | null | undefined
): Record<string, JsonValue> => {
  const parsed = parseJsonValue<JsonValue>(value, {})

  return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
    ? (parsed as Record<string, JsonValue>)
    : {}
}

const parseJsonStringArray = (value: string | null | undefined) => {
  const parsed = parseJsonValue<JsonValue>(value, [])

  return Array.isArray(parsed) &&
    parsed.every((entry) => typeof entry === "string")
    ? parsed
    : []
}

const nullableNumber = (value: number | undefined) => value ?? null

const toAttribution = (row: {
  attributionLabel: string
  attributionLicense: string | null
  attributionUrl: string | null
}): SuggestionAttribution => {
  const attribution: SuggestionAttribution = { label: row.attributionLabel }

  if (row.attributionLicense !== null) {
    attribution.license = row.attributionLicense
  }
  if (row.attributionUrl !== null) {
    attribution.url = row.attributionUrl
  }

  return attribution
}

const toDataSourceRecord = (
  row: typeof smartSuggestDataSources.$inferSelect
): DataSourceRecord => {
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
  }

  if (row.datasetVersion !== null) {
    record.datasetVersion = row.datasetVersion
  }
  if (row.region !== null) {
    record.region = row.region
  }

  return record
}

const toTenantRecord = (
  row: typeof smartSuggestTenants.$inferSelect
): TenantRecord => ({
  allowedOrigins: parseJsonStringArray(row.allowedOriginsJson),
  countryConfig: parseJsonRecord(row.countryConfigJson),
  createdAt: row.createdAt,
  id: row.id,
  name: row.name,
  providerPriority: parseJsonStringArray(row.providerPriorityJson),
  status: row.status === "disabled" ? "disabled" : "active",
  updatedAt: row.updatedAt,
})

const toImportRunRecord = (
  row: typeof smartSuggestImportRuns.$inferSelect
): ImportRunRecord => {
  const record: ImportRunRecord = {
    failedRows: row.failedRows,
    id: row.id,
    insertedRows: row.insertedRows,
    shardCountryCode: row.shardCountryCode as SmartSuggestCountryCode,
    sourceId: row.sourceId,
    startedAt: row.startedAt,
    status: row.status as ImportRunStatus,
    totalRows: row.totalRows,
  }

  if (row.completedAt !== null) {
    record.completedAt = row.completedAt
  }
  if (row.errorSummary !== null) {
    record.errorSummary = row.errorSummary
  }

  return record
}

const toAddressParts = (
  row: typeof smartSuggestAddressRecords.$inferSelect
): AddressParts => {
  const parts: AddressParts = {
    countryCode: row.countryCode as SmartSuggestCountryCode,
  }

  if (row.city !== null) {
    parts.city = row.city
  }
  if (row.district !== null) {
    parts.district = row.district
  }
  if (row.houseNumber !== null) {
    parts.houseNumber = row.houseNumber
  }
  if (row.line1 !== null) {
    parts.line1 = row.line1
  }
  if (row.line2 !== null) {
    parts.line2 = row.line2
  }
  if (row.orientationNumber !== null) {
    parts.orientationNumber = row.orientationNumber
  }
  if (row.postalCode !== null) {
    parts.postalCode = row.postalCode
  }
  if (row.region !== null) {
    parts.region = row.region
  }
  if (row.street !== null) {
    parts.street = row.street
  }

  return parts
}

const toAddressRecord = (
  row: typeof smartSuggestAddressRecords.$inferSelect
): AddressRecord => {
  const record: AddressRecord = {
    countryCode: row.countryCode as SmartSuggestCountryCode,
    createdAt: row.createdAt,
    displayLabel: row.displayLabel,
    id: row.id,
    parts: toAddressParts(row),
    quality: row.quality,
    searchLabel: row.searchLabel,
    sourceId: row.sourceId,
    updatedAt: row.updatedAt,
  }

  if (row.attributionJson !== null) {
    const attribution = parseJsonValue<SuggestionAttribution | undefined>(
      row.attributionJson,
      undefined
    )

    if (attribution !== undefined) {
      record.attribution = attribution
    }
  }
  if (row.latitude !== null) {
    record.latitude = row.latitude
  }
  if (row.longitude !== null) {
    record.longitude = row.longitude
  }

  return record
}

const toSuggestCacheRecord = (
  row: typeof smartSuggestCacheEntries.$inferSelect
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
  }

  if (row.countryCode !== null) {
    record.countryCode = row.countryCode as SmartSuggestCountryCode
  }
  if (row.expiresAt !== null) {
    record.expiresAt = row.expiresAt
  }
  if (row.language !== null) {
    record.language = row.language
  }
  if (row.tenantId !== null) {
    record.tenantId = row.tenantId
  }

  return record
}

const toProviderEventRecord = (
  row: typeof smartSuggestProviderEvents.$inferSelect
): ProviderEventRecord => {
  const record: ProviderEventRecord = {
    createdAt: row.createdAt,
    id: row.id,
    providerId: row.providerId,
    requestId: row.requestId,
    status: row.status as ProviderEventRecord["status"],
  }

  if (row.errorCode !== null) {
    record.errorCode = row.errorCode as SmartSuggestErrorCode
  }
  if (row.latencyMs !== null) {
    record.latencyMs = row.latencyMs
  }
  if (row.queryHash !== null) {
    record.queryHash = row.queryHash
  }
  if (row.tenantId !== null) {
    record.tenantId = row.tenantId
  }

  return record
}

const toAcceptEventRecord = (
  row: typeof smartSuggestAcceptEvents.$inferSelect
): AcceptEventRecord => {
  const record: AcceptEventRecord = {
    acceptedAt: row.acceptedAt,
    id: row.id,
    requestId: row.requestId,
    sourceId: row.sourceId,
    suggestionId: row.suggestionId,
  }

  if (row.tenantJson !== null) {
    const tenant = parseJsonValue<SmartSuggestTenantContext | undefined>(
      row.tenantJson,
      undefined
    )

    if (tenant !== undefined) {
      record.tenant = tenant
    }
  }

  return record
}

export const createD1SmartSuggestRepositories = (
  binding: SmartSuggestD1Binding
): SmartSuggestRepositories => {
  const db = createSmartSuggestD1Database(binding)
  const refreshAddressSearchTokens = async (
    record: Pick<AddressRecord, "countryCode" | "id" | "searchLabel">
  ) => {
    await db
      .delete(smartSuggestAddressSearchTokens)
      .where(eq(smartSuggestAddressSearchTokens.recordId, record.id))

    const tokenRows = createAddressSearchTokenRows(record)

    if (tokenRows.length > 0) {
      await db.insert(smartSuggestAddressSearchTokens).values(tokenRows)
    }
  }

  return {
    health: {
      check: async () => {
        try {
          await db.run(sql`select 1`)
          return { checkedAt: nowIso(), ok: true }
        } catch (error) {
          return {
            checkedAt: nowIso(),
            error: error instanceof Error ? error.message : "D1 check failed.",
            ok: false,
          }
        }
      },
    },
    tenants: {
      upsertTenant: async (input) => {
        const timestamp = nowIso()
        const row = {
          allowedOriginsJson: JSON.stringify(input.allowedOrigins),
          countryConfigJson: JSON.stringify(input.countryConfig),
          createdAt: timestamp,
          id: input.id,
          name: input.name,
          providerPriorityJson: JSON.stringify(input.providerPriority),
          status: input.status,
          updatedAt: timestamp,
        } satisfies typeof smartSuggestTenants.$inferInsert
        const [stored] = await db
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
          .returning()

        return toTenantRecord(stored ?? row)
      },
      getTenant: async (tenantId) => {
        const row = await db
          .select()
          .from(smartSuggestTenants)
          .where(eq(smartSuggestTenants.id, tenantId))
          .get()

        return row === undefined ? undefined : toTenantRecord(row)
      },
    },
    dataSources: {
      registerDataSource: async (input) => {
        const timestamp = nowIso()
        const row = {
          attributionLabel: input.attribution.label,
          attributionLicense: input.attribution.license ?? null,
          attributionUrl: input.attribution.url ?? null,
          cachePolicyJson: JSON.stringify(input.cachePolicy),
          countryCode: input.countryCode,
          createdAt: timestamp,
          datasetVersion: input.datasetVersion ?? null,
          id: input.id,
          name: input.name,
          region: input.region ?? null,
          sourceKind: input.sourceKind,
          updatedAt: timestamp,
        } satisfies typeof smartSuggestDataSources.$inferInsert
        const [stored] = await db
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
              name: row.name,
              region: row.region,
              sourceKind: row.sourceKind,
              updatedAt: row.updatedAt,
            },
            target: smartSuggestDataSources.id,
          })
          .returning()

        return toDataSourceRecord(stored ?? row)
      },
      getDataSource: async (sourceId) => {
        const row = await db
          .select()
          .from(smartSuggestDataSources)
          .where(eq(smartSuggestDataSources.id, sourceId))
          .get()

        return row === undefined ? undefined : toDataSourceRecord(row)
      },
    },
    importRuns: {
      startImportRun: async (input) => {
        const row = {
          completedAt: null,
          errorSummary: null,
          failedRows: 0,
          id: input.id,
          insertedRows: 0,
          shardCountryCode: input.shardCountryCode,
          sourceId: input.sourceId,
          startedAt: nowIso(),
          status: "running",
          totalRows: 0,
        } satisfies typeof smartSuggestImportRuns.$inferInsert
        const [stored] = await db
          .insert(smartSuggestImportRuns)
          .values(row)
          .onConflictDoUpdate({
            set: {
              completedAt: row.completedAt,
              errorSummary: row.errorSummary,
              failedRows: row.failedRows,
              insertedRows: row.insertedRows,
              shardCountryCode: row.shardCountryCode,
              sourceId: row.sourceId,
              startedAt: row.startedAt,
              status: row.status,
              totalRows: row.totalRows,
            },
            target: smartSuggestImportRuns.id,
          })
          .returning()

        return toImportRunRecord(stored ?? row)
      },
      finishImportRun: async (input) => {
        const [stored] = await db
          .update(smartSuggestImportRuns)
          .set({
            completedAt: input.completedAt,
            errorSummary: input.errorSummary ?? null,
            failedRows: input.failedRows,
            insertedRows: input.insertedRows,
            status: input.status,
            totalRows: input.totalRows,
          })
          .where(eq(smartSuggestImportRuns.id, input.id))
          .returning()

        if (stored === undefined) {
          throw new SmartSuggestStorageError(
            "import-run-not-found",
            `Import run ${input.id} does not exist.`
          )
        }

        return toImportRunRecord(stored)
      },
      getImportRun: async (runId) => {
        const row = await db
          .select()
          .from(smartSuggestImportRuns)
          .where(eq(smartSuggestImportRuns.id, runId))
          .get()

        return row === undefined ? undefined : toImportRunRecord(row)
      },
      listRecentImportRuns: async (limit = 10) => {
        const normalizedLimit = Math.max(1, Math.min(Math.trunc(limit), 50))
        const rows = await db
          .select()
          .from(smartSuggestImportRuns)
          .orderBy(desc(smartSuggestImportRuns.startedAt))
          .limit(normalizedLimit)

        return rows.map(toImportRunRecord)
      },
    },
    addressRecords: {
      upsertAddressRecords: async (records) =>
        Promise.all(
          records.map(async (input) => {
            const timestamp = nowIso()
            const row = {
              attributionJson:
                input.attribution === undefined
                  ? null
                  : JSON.stringify(input.attribution),
              city: input.parts.city ?? null,
              countryCode: input.countryCode,
              createdAt: timestamp,
              displayLabel: input.displayLabel,
              district: input.parts.district ?? null,
              houseNumber: input.parts.houseNumber ?? null,
              id: input.id,
              latitude: nullableNumber(input.latitude),
              line1: input.parts.line1 ?? null,
              line2: input.parts.line2 ?? null,
              longitude: nullableNumber(input.longitude),
              orientationNumber: input.parts.orientationNumber ?? null,
              postalCode: input.parts.postalCode ?? null,
              quality: input.quality,
              region: input.parts.region ?? null,
              searchLabel: input.searchLabel,
              sourceId: input.sourceId,
              street: input.parts.street ?? null,
              updatedAt: timestamp,
            } satisfies typeof smartSuggestAddressRecords.$inferInsert
            const [stored] = await db
              .insert(smartSuggestAddressRecords)
              .values(row)
              .onConflictDoUpdate({
                set: {
                  attributionJson: row.attributionJson,
                  city: row.city,
                  countryCode: row.countryCode,
                  displayLabel: row.displayLabel,
                  district: row.district,
                  houseNumber: row.houseNumber,
                  latitude: row.latitude,
                  line1: row.line1,
                  line2: row.line2,
                  longitude: row.longitude,
                  orientationNumber: row.orientationNumber,
                  postalCode: row.postalCode,
                  quality: row.quality,
                  region: row.region,
                  searchLabel: row.searchLabel,
                  sourceId: row.sourceId,
                  street: row.street,
                  updatedAt: row.updatedAt,
                },
                target: smartSuggestAddressRecords.id,
              })
              .returning()
            await refreshAddressSearchTokens(input)

            return toAddressRecord(stored ?? row)
          })
        ),
      searchAddressRecords: async ({ countryCode, limit = 10, query }) => {
        const normalizedLimit = Math.max(1, Math.min(Math.trunc(limit), 50))
        const prefixes = [...new Set(createQuerySearchPrefixes(query))]
        const tokenFilters = [
          inArray(smartSuggestAddressSearchTokens.prefix, prefixes),
        ]

        if (countryCode !== undefined) {
          tokenFilters.push(
            eq(smartSuggestAddressSearchTokens.countryCode, countryCode)
          )
        }

        if (prefixes.length > 0) {
          const tokenMatches = await db
            .select({ recordId: smartSuggestAddressSearchTokens.recordId })
            .from(smartSuggestAddressSearchTokens)
            .where(and(...tokenFilters))
            .limit(Math.max(normalizedLimit * 20, 50))
          const recordIds = [
            ...new Set(tokenMatches.map((match) => match.recordId)),
          ]

          if (recordIds.length > 0) {
            const recordFilters = [
              inArray(smartSuggestAddressRecords.id, recordIds),
            ]

            if (countryCode !== undefined) {
              recordFilters.push(
                eq(smartSuggestAddressRecords.countryCode, countryCode)
              )
            }

            const indexedRows = await db
              .select()
              .from(smartSuggestAddressRecords)
              .where(and(...recordFilters))
              .limit(recordIds.length)

            return rankAddressRecordResults(
              query,
              indexedRows.map(toAddressRecord),
              normalizedLimit
            )
          }
        }

        const filters = [
          like(
            smartSuggestAddressRecords.searchLabel,
            `%${normalizeSearchText(query)}%`
          ),
        ]

        if (countryCode !== undefined) {
          filters.push(eq(smartSuggestAddressRecords.countryCode, countryCode))
        }

        const rows = await db
          .select()
          .from(smartSuggestAddressRecords)
          .where(and(...filters))
          .orderBy(desc(smartSuggestAddressRecords.quality))
          .limit(normalizedLimit)

        return rankAddressRecordResults(
          query,
          rows.map(toAddressRecord),
          normalizedLimit
        )
      },
      getAddressRecord: async (recordId) => {
        const row = await db
          .select()
          .from(smartSuggestAddressRecords)
          .where(eq(smartSuggestAddressRecords.id, recordId))
          .get()

        return row === undefined ? undefined : toAddressRecord(row)
      },
    },
    suggestCache: {
      readSuggestCache: async (cacheKey) => {
        const row = await db
          .select()
          .from(smartSuggestCacheEntries)
          .where(eq(smartSuggestCacheEntries.cacheKey, cacheKey))
          .get()

        if (row === undefined) {
          return
        }

        const record = toSuggestCacheRecord(row)

        return isCacheExpired(record)
          ? { ...record, status: "stale" }
          : { ...record, status: "hit" }
      },
      writeSuggestCache: async (input) => {
        assertCachePolicyAllowsWrite(input.cachePolicy)

        const timestamp = nowIso()
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
        } satisfies typeof smartSuggestCacheEntries.$inferInsert
        const [stored] = await db
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
          .returning()

        return toSuggestCacheRecord(stored ?? row)
      },
    },
    providerEvents: {
      recordProviderEvent: async (input) => {
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
        } satisfies typeof smartSuggestProviderEvents.$inferInsert
        const [stored] = await db
          .insert(smartSuggestProviderEvents)
          .values(row)
          .returning()

        return toProviderEventRecord(stored ?? row)
      },
      listProviderEvents: async (requestId) => {
        const rows = await db
          .select()
          .from(smartSuggestProviderEvents)
          .where(eq(smartSuggestProviderEvents.requestId, requestId))

        return rows.map(toProviderEventRecord)
      },
    },
    acceptEvents: {
      recordAcceptEvent: async (input) => {
        const row = {
          acceptedAt: input.acceptedAt,
          id: input.id,
          requestId: input.requestId,
          sourceId: input.sourceId,
          suggestionId: input.suggestionId,
          tenantJson:
            input.tenant === undefined ? null : JSON.stringify(input.tenant),
        } satisfies typeof smartSuggestAcceptEvents.$inferInsert
        const [stored] = await db
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
          .returning()

        return toAcceptEventRecord(stored ?? row)
      },
      listAcceptEvents: async (requestId) => {
        const rows = await db
          .select()
          .from(smartSuggestAcceptEvents)
          .where(eq(smartSuggestAcceptEvents.requestId, requestId))

        return rows.map(toAcceptEventRecord)
      },
    },
  }
}

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
    const addressSearchTokensByRecordId = new Map<
      string,
      AddressSearchTokenInsert[]
    >()
    const suggestCache = new Map<string, SuggestCacheRecord>()
    const providerEvents = new Map<string, ProviderEventRecord[]>()
    const acceptEvents = new Map<string, AcceptEventRecord[]>()
    const indexAddressRecord = (record: AddressRecord) => {
      addressSearchTokensByRecordId.set(
        record.id,
        createAddressSearchTokenRows(record)
      )
    }
    const findIndexedAddressRecords = (
      query: string,
      countryCode: SmartSuggestCountryCode | undefined
    ) => {
      const prefixes = new Set(createQuerySearchPrefixes(query))
      const recordIds = new Set<string>()

      if (prefixes.size === 0) {
        return []
      }

      for (const tokens of addressSearchTokensByRecordId.values()) {
        for (const token of tokens) {
          if (
            prefixes.has(token.prefix) &&
            (countryCode === undefined || token.countryCode === countryCode)
          ) {
            recordIds.add(token.recordId)
          }
        }
      }

      return [...recordIds]
        .map((recordId) => addressRecords.get(recordId))
        .filter((record): record is AddressRecord => record !== undefined)
    }

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
        listRecentImportRuns: (limit = 10) =>
          resolveSync(() => {
            const normalizedLimit = Math.max(1, Math.min(Math.trunc(limit), 50))

            return [...importRuns.values()]
              .toSorted((left, right) =>
                right.startedAt.localeCompare(left.startedAt)
              )
              .slice(0, normalizedLimit)
          }),
      },
      addressRecords: {
        upsertAddressRecords: (records) =>
          Promise.resolve(
            records.map((input) => {
              const record = withTimestamps(input, addressRecords.get(input.id))
              addressRecords.set(record.id, record)
              indexAddressRecord(record)
              return record
            })
          ),
        searchAddressRecords: ({ countryCode, limit = 10, query }) =>
          resolveSync(() => {
            const normalizedQuery = normalizeSearchText(query)
            const normalizedLimit = Math.max(1, Math.min(Math.trunc(limit), 50))
            const indexedRecords = findIndexedAddressRecords(query, countryCode)
            const candidates =
              indexedRecords.length > 0
                ? indexedRecords
                : [...addressRecords.values()].filter((record) => {
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

            return rankAddressRecordResults(query, candidates, normalizedLimit)
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

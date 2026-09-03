import { createHash, randomUUID } from "node:crypto"
import { link, open, readFile, unlink } from "node:fs/promises"
import type { MedusaContainer } from "@medusajs/framework/types"
import {
  persistedSearchProfileToRuntime,
  SEARCH_INDEX_TYPES,
  type SearchIndexType,
} from "../../modules/meilisearch/profiles"
import { SEARCH_INDEX_SETTINGS } from "../../modules/meilisearch/settings"
import {
  SEARCH_PROFILE_MODULE,
  type SearchProfileDTO,
  type SearchProfileModuleService,
} from "../../modules/search-profile"
import { parsePrecommercePriceAuthority } from "../ro-demo-commerce/precommerce-price-authority"

const SHA_256 = /^[a-f0-9]{64}$/
const BUILD_INDEX_MARKER = "__build_"
const COMPLETION_MARKER_PREFIX = "search_build_marker_"
const SNAPSHOT_KIND = "herbatika-ro-meilisearch-convergence-snapshot"
const PROOF_KIND = "herbatika-ro-meilisearch-convergence-proof"
const TRAILING_SLASH = /\/$/
const DEFAULT_MAX_TOTAL_HITS = 1000

export const RO_MEILI_COUNTS = {
  approvedVariant: 2002,
  brand: 103,
  category: 207,
  product: 2002,
} as const

type JsonPrimitive = boolean | null | number | string
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue }

export type RoMeiliApprovedVariantPrice = Readonly<{
  amount: number
  productId: string
  variantId: string
}>

export type RoMeiliAuthority = Readonly<{
  approvedVariantIds: readonly string[]
  approvedVariantPrices: readonly RoMeiliApprovedVariantPrice[]
  brandIds: readonly string[]
  catalogScopeSha256: string
  categoryIds: readonly string[]
  environmentId: string
  kind: "herbatika-ro-meilisearch-authority"
  market: "ro"
  marketAuthoritySha256: string
  productIds: readonly string[]
  releaseId: string
  ronPriceProjectionSha256: string
  roOrigin: string
  salesChannelId: string
  schemaVersion: 1
  unavailableVariantIds: readonly string[]
}>

export type RoMeiliProfileEvidence = Readonly<{
  domain: string
  id: string
  indexes: Readonly<Record<SearchIndexType, string>>
  key: string
  lastSyncError: null | string
  lastSyncMode: null | "full" | "normal"
  lastSyncStartedAt: null | string
  lastSyncStatus: "failed" | "never" | "running" | "succeeded"
  lastSyncedAt: null | string
  locale: string
  salesChannelIds: readonly string[]
  shop: string
  strict: boolean
}>

export type RoMeiliIndexSnapshot = Readonly<{
  documents: readonly Readonly<Record<string, JsonValue>>[]
  documentsSha256: string
  settings: Readonly<Record<string, JsonValue>>
  settingsSha256: string
  uid: string
}>

export type RoMeiliTaskSnapshot = Readonly<{
  details: JsonValue
  indexUids: readonly string[]
  status: string
  type: string
  uid: number
}>

export type RoMeiliConvergenceSnapshot = Readonly<{
  authority: RoMeiliAuthority
  cluster: Readonly<{
    completionMarkerIds: readonly string[]
    indexUids: readonly string[]
    maxTaskUid: number
    stagingIndexUids: readonly string[]
    tasks: readonly RoMeiliTaskSnapshot[]
  }>
  generatedAt: string
  indexes: Readonly<{
    ro: Readonly<Record<SearchIndexType, RoMeiliIndexSnapshot>>
    sk: Readonly<Record<SearchIndexType, RoMeiliIndexSnapshot>>
  }>
  kind: typeof SNAPSHOT_KIND
  phase: "post" | "pre"
  roProfile: RoMeiliProfileEvidence
  schemaVersion: 1
  skProfile: RoMeiliProfileEvidence
}>

export type RoMeiliConvergenceProof = Readonly<{
  atomicSwap: Readonly<{
    activeIndexUids: Readonly<Record<SearchIndexType, string>>
    completionMarkerCount: number
    failedTaskCount: number
    stagingIndexesRemaining: number
    unsettledTaskCount: number
  }>
  catalogScopeSha256: string
  environmentId: string
  generatedAt: string
  indexes: Readonly<
    Record<
      SearchIndexType,
      Readonly<{
        documentCount: number
        documentIdsSha256: string
        entityCount?: number
        entityIdsSha256?: string
        extraScopeCount?: number
        missingScopeCount?: number
        settingsSha256: string
        uid: string
      }>
    >
  >
  isolation: Readonly<{
    roIndexUidsSha256: string
    sharedIndexUidCount: number
    skIndexUidsSha256: string
  }>
  kind: typeof PROOF_KIND
  locale: "ro-RO"
  market: "ro"
  marketAuthoritySha256: string
  profile: Readonly<{
    domain: string
    key: string
    lastSyncError: null | string
    lastSyncMode: null | "full" | "normal"
    lastSyncStartedAt: null | string
    lastSyncStatus: "failed" | "never" | "running" | "succeeded"
    lastSyncedAt: null | string
    locale: string
    salesChannelIds: readonly string[]
    shop: string
    strict: boolean
  }>
  releaseId: string
  ronPriceProjectionSha256: string
  schemaVersion: 1
  scope: Readonly<{
    brandEntityCount: number
    brandEntityIdsSha256: string
    categoryEntityCount: number
    categoryEntityIdsSha256: string
    productEntityCount: number
    productEntityIdsSha256: string
  }>
  skPreservation: Readonly<{
    afterSha256: string
    beforeSha256: string
    indexes: Readonly<
      Record<
        SearchIndexType,
        Readonly<{
          documentsSha256: string
          settingsSha256: string
          uid: string
        }>
      >
    >
  }>
}>

type RawMeiliTask = {
  details?: unknown
  indexUid?: unknown
  status?: unknown
  taskUid?: unknown
  type?: unknown
  uid?: unknown
}

export type RoMeiliReadClient = {
  getDocuments(
    uid: string,
    options: { limit: number; offset: number }
  ): Promise<readonly unknown[]>
  getSettings(uid: string): Promise<unknown>
  listIndexes(options: {
    limit: number
    offset: number
  }): Promise<readonly unknown[]>
  listTasks(options: {
    from?: number
    limit: number
  }): Promise<Readonly<{ next?: number | null; results: readonly unknown[] }>>
}

const invalid = (message: string): never => {
  throw new Error(`RO Meilisearch convergence: ${message}`)
}

const record = (value: unknown, label: string): Record<string, unknown> => {
  if (!(value && typeof value === "object" && !Array.isArray(value))) {
    return invalid(`${label} must be an object`)
  }
  return value as Record<string, unknown>
}

const exactKeys = (
  value: Record<string, unknown>,
  expected: readonly string[],
  label: string
) => {
  const actual = Object.keys(value).sort()
  const sortedExpected = [...expected].sort()
  if (
    actual.length !== sortedExpected.length ||
    actual.some((key, index) => key !== sortedExpected[index])
  ) {
    invalid(`${label} fields must be exactly ${sortedExpected.join(",")}`)
  }
}

const text = (value: unknown, label: string): string => {
  if (typeof value !== "string" || value.trim() !== value || !value) {
    return invalid(`${label} must be a nonblank trimmed string`)
  }
  return value
}

const hash = (value: unknown, label: string): string => {
  const parsed = text(value, label)
  if (!SHA_256.test(parsed)) {
    invalid(`${label} must be a lowercase SHA-256`)
  }
  return parsed
}

const sortedUniqueText = (
  value: unknown,
  label: string,
  expectedCount?: number
): string[] => {
  if (!Array.isArray(value)) {
    return invalid(`${label} must be an array`)
  }
  const parsed = value.map((item, index) => text(item, `${label}[${index}]`))
  const sorted = [...parsed].sort((left, right) => left.localeCompare(right))
  if (
    new Set(parsed).size !== parsed.length ||
    parsed.some((item, index) => item !== sorted[index])
  ) {
    invalid(`${label} must be sorted and unique`)
  }
  if (expectedCount !== undefined && parsed.length !== expectedCount) {
    invalid(`${label} must contain exactly ${expectedCount} IDs`)
  }
  return parsed
}

const jsonValue = (value: unknown, label: string): JsonValue => {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }
  if (Array.isArray(value)) {
    return value.map((entry, index) => jsonValue(entry, `${label}[${index}]`))
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, jsonValue(entry, `${label}.${key}`)])
    )
  }
  return invalid(`${label} contains a non-JSON value`)
}

const stableValue = (value: unknown): JsonValue => jsonValue(value, "artifact")

export const serializeRoMeiliEvidence = (value: unknown): string =>
  `${JSON.stringify(stableValue(value))}\n`

export const hashRoMeiliValue = (value: unknown): string =>
  createHash("sha256")
    .update(JSON.stringify(stableValue(value)))
    .digest("hex")

const sameValue = (left: unknown, right: unknown): boolean =>
  serializeRoMeiliEvidence(left) === serializeRoMeiliEvidence(right)

const ronPriceAmount = (value: unknown, label: string): number => {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value <= 0 ||
    Math.abs(value * 100 - Math.round(value * 100)) > 1e-9
  ) {
    invalid(`${label} must be a positive RON amount with at most two decimals`)
  }
  return Number(value)
}

const approvedVariantPrices = (
  value: unknown
): Array<{ amount: number; productId: string; variantId: string }> => {
  if (!Array.isArray(value)) {
    return invalid("authority.approvedVariantPrices must be an array")
  }
  const prices = value.map((entry, index) => {
    const price = record(entry, `authority.approvedVariantPrices[${index}]`)
    exactKeys(
      price,
      ["amount", "productId", "variantId"],
      `authority.approvedVariantPrices[${index}]`
    )
    const amount = ronPriceAmount(
      price.amount,
      `authority.approvedVariantPrices[${index}].amount`
    )
    return {
      amount,
      productId: text(
        price.productId,
        `authority.approvedVariantPrices[${index}].productId`
      ),
      variantId: text(
        price.variantId,
        `authority.approvedVariantPrices[${index}].variantId`
      ),
    }
  })
  if (
    prices.length !== RO_MEILI_COUNTS.approvedVariant ||
    new Set(prices.map(({ variantId }) => variantId)).size !== prices.length ||
    prices.some(
      ({ variantId }, index) =>
        index > 0 &&
        variantId.localeCompare(prices[index - 1]?.variantId ?? "") <= 0
    )
  ) {
    invalid(
      "authority.approvedVariantPrices must contain exactly 2002 sorted unique variant IDs"
    )
  }
  return prices
}

export const parseRoMeiliAuthority = (contents: string): RoMeiliAuthority => {
  let parsed: unknown
  try {
    parsed = JSON.parse(contents)
  } catch (error) {
    return invalid(`authority is not valid JSON: ${(error as Error).message}`)
  }
  const raw = record(parsed, "authority")
  exactKeys(
    raw,
    [
      "approvedVariantIds",
      "approvedVariantPrices",
      "brandIds",
      "catalogScopeSha256",
      "categoryIds",
      "environmentId",
      "kind",
      "market",
      "marketAuthoritySha256",
      "productIds",
      "releaseId",
      "ronPriceProjectionSha256",
      "roOrigin",
      "salesChannelId",
      "schemaVersion",
      "unavailableVariantIds",
    ],
    "authority"
  )
  if (
    raw.schemaVersion !== 1 ||
    raw.kind !== "herbatika-ro-meilisearch-authority" ||
    raw.market !== "ro"
  ) {
    invalid("authority identity is invalid")
  }
  const parsedApprovedVariantPrices = approvedVariantPrices(
    raw.approvedVariantPrices
  )
  const authority: RoMeiliAuthority = {
    approvedVariantIds: sortedUniqueText(
      raw.approvedVariantIds,
      "authority.approvedVariantIds",
      RO_MEILI_COUNTS.approvedVariant
    ),
    approvedVariantPrices: parsedApprovedVariantPrices,
    brandIds: sortedUniqueText(
      raw.brandIds,
      "authority.brandIds",
      RO_MEILI_COUNTS.brand
    ),
    catalogScopeSha256: hash(
      raw.catalogScopeSha256,
      "authority.catalogScopeSha256"
    ),
    categoryIds: sortedUniqueText(
      raw.categoryIds,
      "authority.categoryIds",
      RO_MEILI_COUNTS.category
    ),
    environmentId: text(raw.environmentId, "authority.environmentId"),
    kind: "herbatika-ro-meilisearch-authority",
    market: "ro",
    marketAuthoritySha256: hash(
      raw.marketAuthoritySha256,
      "authority.marketAuthoritySha256"
    ),
    productIds: sortedUniqueText(
      raw.productIds,
      "authority.productIds",
      RO_MEILI_COUNTS.product
    ),
    releaseId: text(raw.releaseId, "authority.releaseId"),
    ronPriceProjectionSha256: hash(
      raw.ronPriceProjectionSha256,
      "authority.ronPriceProjectionSha256"
    ),
    roOrigin: text(raw.roOrigin, "authority.roOrigin"),
    salesChannelId: text(raw.salesChannelId, "authority.salesChannelId"),
    schemaVersion: 1,
    unavailableVariantIds: sortedUniqueText(
      raw.unavailableVariantIds,
      "authority.unavailableVariantIds"
    ),
  }
  try {
    if (new URL(authority.roOrigin).hostname.length === 0) {
      invalid("authority.roOrigin must have a hostname")
    }
  } catch {
    invalid("authority.roOrigin must be an absolute URL")
  }
  if (
    authority.unavailableVariantIds.some((id) =>
      authority.approvedVariantIds.includes(id)
    )
  ) {
    invalid("authority approved and unavailable variant IDs overlap")
  }
  if (
    !(
      sameValue(
        authority.approvedVariantPrices.map(({ variantId }) => variantId),
        authority.approvedVariantIds
      ) &&
      sameValue(
        [...authority.approvedVariantPrices]
          .map(({ productId }) => productId)
          .sort((left, right) => left.localeCompare(right)),
        authority.productIds
      )
    ) ||
    hashRoMeiliValue(authority.approvedVariantPrices) !==
      authority.ronPriceProjectionSha256
  ) {
    invalid(
      "authority approved variant prices do not match IDs or RON projection hash"
    )
  }
  if (serializeRoMeiliEvidence(authority) !== contents) {
    invalid("authority must be canonical JSON with LF")
  }
  return authority
}

const hashBytes = (contents: string): string =>
  createHash("sha256").update(contents).digest("hex")

export const deriveRoMeiliPriceProjection = (
  contents: string
): readonly RoMeiliApprovedVariantPrice[] => {
  const priceAuthority = parsePrecommercePriceAuthority(contents)
  return priceAuthority.products
    .flatMap(({ productId, variants }) =>
      variants.flatMap((variant) =>
        variant.roAvailability === "sellable"
          ? [
              {
                amount: variant.price.amount,
                productId,
                variantId: variant.variantId,
              },
            ]
          : []
      )
    )
    .sort((left, right) => left.variantId.localeCompare(right.variantId))
}

export const assertRoMeiliPriceAuthorityBinding = (
  authority: RoMeiliAuthority,
  priceAuthoritySha256: string,
  derivedProjection: readonly RoMeiliApprovedVariantPrice[]
): void => {
  if (
    hash(priceAuthoritySha256, "expected price authority SHA-256") !==
      authority.marketAuthoritySha256 ||
    !sameValue(derivedProjection, authority.approvedVariantPrices) ||
    hashRoMeiliValue(derivedProjection) !== authority.ronPriceProjectionSha256
  ) {
    invalid(
      "authority RON prices are not derived from the reviewed pre-commerce price authority"
    )
  }
}

export const bindRoMeiliAuthorityToPriceAuthority = (
  authority: RoMeiliAuthority,
  priceAuthorityContents: string,
  expectedPriceAuthoritySha256: string
): RoMeiliAuthority => {
  const actualSha256 = hashBytes(priceAuthorityContents)
  if (
    hash(expectedPriceAuthoritySha256, "expected price authority SHA-256") !==
    actualSha256
  ) {
    invalid("reviewed pre-commerce price authority raw SHA-256 is invalid")
  }
  assertRoMeiliPriceAuthorityBinding(
    authority,
    actualSha256,
    deriveRoMeiliPriceProjection(priceAuthorityContents)
  )
  return authority
}

const iso = (value: Date | string | null, label: string): string | null => {
  if (value === null) {
    return null
  }
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.valueOf())) {
    return invalid(`${label} must be a timestamp or null`)
  }
  return date.toISOString()
}

const profileEvidence = (profile: SearchProfileDTO): RoMeiliProfileEvidence => {
  const runtime = persistedSearchProfileToRuntime(profile)
  return {
    domain: runtime.domain,
    id: profile.id,
    indexes: runtime.indexes,
    key: runtime.key,
    lastSyncError: profile.last_sync_error,
    lastSyncMode: profile.last_sync_mode,
    lastSyncStartedAt: iso(
      profile.last_sync_started_at,
      `profile ${profile.id} last_sync_started_at`
    ),
    lastSyncStatus: profile.last_sync_status,
    lastSyncedAt: iso(
      profile.last_synced_at,
      `profile ${profile.id} last_synced_at`
    ),
    locale: runtime.locale,
    salesChannelIds: [...runtime.salesChannelIds].sort(),
    shop: runtime.shop,
    strict: runtime.strict,
  }
}

export const loadExactRoMeiliProfiles = async (
  container: MedusaContainer,
  options: { roProfileId: string; skProfileId: string }
): Promise<{ ro: RoMeiliProfileEvidence; sk: RoMeiliProfileEvidence }> => {
  if (options.roProfileId === options.skProfileId) {
    invalid("RO and SK profile IDs must differ")
  }
  const service = container.resolve<SearchProfileModuleService>(
    SEARCH_PROFILE_MODULE
  )
  const profiles = await service.listConfiguredProfiles()
  const exact = (id: string, label: string) => {
    const matches = profiles.filter((profile) => profile.id === id)
    if (matches.length !== 1) {
      return invalid(`${label} must resolve exactly one configured profile ID`)
    }
    return profileEvidence(matches[0] as SearchProfileDTO)
  }
  return {
    ro: exact(options.roProfileId, "RO profile"),
    sk: exact(options.skProfileId, "SK profile"),
  }
}

const REQUEST_TIMEOUT_MS = 15_000

export class ConfiguredRoMeiliReadClient implements RoMeiliReadClient {
  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly fetcher: typeof fetch

  constructor(options?: {
    apiKey?: string
    fetcher?: typeof fetch
    host?: string
  }) {
    const host = options?.host ?? process.env.MEILISEARCH_HOST
    const apiKey = options?.apiKey ?? process.env.MEILISEARCH_API_KEY
    if (!host) {
      invalid("MEILISEARCH_HOST is required")
    }
    if (!apiKey) {
      invalid("MEILISEARCH_API_KEY is required")
    }
    this.baseUrl = (host as string).replace(TRAILING_SLASH, "")
    this.apiKey = apiKey as string
    this.fetcher = options?.fetcher ?? fetch
  }

  private async get(path: string): Promise<unknown> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    try {
      const response = await this.fetcher(this.baseUrl + path, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        method: "GET",
        signal: controller.signal,
      })
      const body = await response.text()
      if (!response.ok) {
        invalid(`Meili GET ${path} failed with HTTP ${response.status}`)
      }
      try {
        return body ? JSON.parse(body) : null
      } catch {
        return invalid(`Meili GET ${path} returned invalid JSON`)
      }
    } finally {
      clearTimeout(timeout)
    }
  }

  async getDocuments(
    uid: string,
    options: { limit: number; offset: number }
  ): Promise<readonly unknown[]> {
    const result = record(
      await this.get(
        `/indexes/${encodeURIComponent(uid)}/documents?limit=${options.limit}&offset=${options.offset}`
      ),
      `documents response for ${uid}`
    )
    return Array.isArray(result.results)
      ? result.results
      : invalid(`documents response for ${uid}.results must be an array`)
  }

  async getSettings(uid: string): Promise<unknown> {
    return this.get(`/indexes/${encodeURIComponent(uid)}/settings`)
  }

  async listIndexes(options: {
    limit: number
    offset: number
  }): Promise<readonly unknown[]> {
    const result = record(
      await this.get(
        `/indexes?limit=${options.limit}&offset=${options.offset}`
      ),
      "indexes response"
    )
    return Array.isArray(result.results)
      ? result.results
      : invalid("indexes response.results must be an array")
  }

  async listTasks(options: {
    from?: number
    limit: number
  }): Promise<Readonly<{ next?: number | null; results: readonly unknown[] }>> {
    const query = new URLSearchParams({ limit: String(options.limit) })
    if (options.from !== undefined) {
      query.set("from", String(options.from))
    }
    const result = record(await this.get(`/tasks?${query}`), "tasks response")
    if (!Array.isArray(result.results)) {
      return invalid("tasks response.results must be an array")
    }
    if (
      result.next !== undefined &&
      result.next !== null &&
      !(typeof result.next === "number" && Number.isSafeInteger(result.next))
    ) {
      invalid("tasks response.next must be an integer or null")
    }
    return {
      next: result.next as number | null | undefined,
      results: result.results,
    }
  }
}

const readAllIndexes = async (client: RoMeiliReadClient): Promise<string[]> => {
  const uids: string[] = []
  for (let offset = 0; ; offset += 500) {
    const batch = await client.listIndexes({ limit: 500, offset })
    for (const [index, item] of batch.entries()) {
      const uid = text(
        record(item, `indexes[${offset + index}]`).uid,
        "index uid"
      )
      uids.push(uid)
    }
    if (batch.length < 500) {
      break
    }
  }
  return [...new Set(uids)].sort()
}

const readAllDocuments = async (
  client: RoMeiliReadClient,
  uid: string
): Promise<Readonly<Record<string, JsonValue>>[]> => {
  const documents: Record<string, JsonValue>[] = []
  for (let offset = 0; ; offset += 500) {
    const batch = await client.getDocuments(uid, { limit: 500, offset })
    for (const [index, item] of batch.entries()) {
      documents.push(
        stableValue(
          record(item, `${uid} documents[${offset + index}]`)
        ) as Record<string, JsonValue>
      )
    }
    if (batch.length < 500) {
      break
    }
  }
  return documents.sort((left, right) => {
    const leftId = text(left.id, `${uid} document id`)
    const rightId = text(right.id, `${uid} document id`)
    return leftId.localeCompare(rightId)
  })
}

const taskUid = (task: RawMeiliTask, label: string): number => {
  const value = task.uid ?? task.taskUid
  if (
    !(typeof value === "number" && Number.isSafeInteger(value) && value >= 0)
  ) {
    return invalid(`${label}.uid must be a non-negative integer`)
  }
  return value
}

const taskIndexUids = (task: RawMeiliTask): string[] => {
  const found = new Set<string>()
  if (typeof task.indexUid === "string" && task.indexUid) {
    found.add(task.indexUid)
  }
  const pending: Array<{ key?: string; value: unknown }> = [
    { value: task.details },
  ]
  while (pending.length > 0) {
    const { key, value } = pending.pop() as {
      key?: string
      value: unknown
    }
    if (key === "indexUid" && typeof value === "string" && value) {
      found.add(value)
    }
    if (key === "indexes" && Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string" && item) {
          found.add(item)
        }
      }
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        pending.push({ value: item })
      }
    } else if (value && typeof value === "object") {
      for (const [childKey, item] of Object.entries(
        value as Record<string, unknown>
      )) {
        pending.push({ key: childKey, value: item })
      }
    }
  }
  return [...found].sort()
}

const readAllTasks = async (
  client: RoMeiliReadClient
): Promise<RoMeiliTaskSnapshot[]> => {
  const tasks: RoMeiliTaskSnapshot[] = []
  const seenPages = new Set<number | undefined>()
  let from: number | undefined
  while (true) {
    if (seenPages.has(from)) {
      invalid("Meili task pagination repeated a cursor")
    }
    seenPages.add(from)
    const page = await client.listTasks({ from, limit: 1000 })
    for (const [index, item] of page.results.entries()) {
      const raw = record(item, `tasks[${index}]`) as RawMeiliTask
      tasks.push({
        details: stableValue(raw.details ?? {}),
        indexUids: taskIndexUids(raw),
        status: text(raw.status, `tasks[${index}].status`),
        type: text(raw.type, `tasks[${index}].type`),
        uid: taskUid(raw, `tasks[${index}]`),
      })
    }
    if (page.next === undefined || page.next === null) {
      break
    }
    from = page.next
  }
  const byUid = new Map(tasks.map((task) => [task.uid, task]))
  if (byUid.size !== tasks.length) {
    invalid("Meili task pages contain duplicate task UIDs")
  }
  return [...byUid.values()].sort((left, right) => left.uid - right.uid)
}

const snapshotIndex = async (
  client: RoMeiliReadClient,
  uid: string,
  existingUids: ReadonlySet<string>
): Promise<RoMeiliIndexSnapshot> => {
  if (!existingUids.has(uid)) {
    return invalid(`configured index ${uid} does not exist`)
  }
  const [settingsValue, documents] = await Promise.all([
    client.getSettings(uid),
    readAllDocuments(client, uid),
  ])
  const settings = stableValue(
    record(settingsValue, `${uid} settings`)
  ) as Record<string, JsonValue>
  return {
    documents,
    documentsSha256: hashRoMeiliValue(documents),
    settings,
    settingsSha256: hashRoMeiliValue(settings),
    uid,
  }
}

const snapshotIndexes = async (
  client: RoMeiliReadClient,
  profile: RoMeiliProfileEvidence,
  existingUids: ReadonlySet<string>
): Promise<Record<SearchIndexType, RoMeiliIndexSnapshot>> =>
  Object.fromEntries(
    await Promise.all(
      SEARCH_INDEX_TYPES.map(async (kind) => [
        kind,
        await snapshotIndex(client, profile.indexes[kind], existingUids),
      ])
    )
  ) as Record<SearchIndexType, RoMeiliIndexSnapshot>

const assertProfileBindings = (options: {
  authority: RoMeiliAuthority
  ro: RoMeiliProfileEvidence
  sk: RoMeiliProfileEvidence
}) => {
  const { authority, ro, sk } = options
  if (
    ro.locale !== "ro-ro" ||
    ro.strict !== true ||
    ro.salesChannelIds.length !== 1 ||
    ro.salesChannelIds[0] !== authority.salesChannelId ||
    ro.domain !== new URL(authority.roOrigin).hostname
  ) {
    invalid("RO profile does not match strict Romanian authority bindings")
  }
  if (!sk.locale.toLowerCase().startsWith("sk")) {
    invalid("SK profile locale is not Slovak")
  }
  const roUids = Object.values(ro.indexes)
  const skUids = Object.values(sk.indexes)
  if (
    new Set(roUids).size !== SEARCH_INDEX_TYPES.length ||
    new Set(skUids).size !== SEARCH_INDEX_TYPES.length ||
    roUids.some((uid) => skUids.includes(uid))
  ) {
    invalid("RO and SK profiles must use eight distinct index UIDs")
  }
}

export const collectRoMeiliConvergenceSnapshot = async (options: {
  authority: RoMeiliAuthority
  client: RoMeiliReadClient
  expectedEnvironmentId: string
  now?: () => Date
  phase: "post" | "pre"
  roProfile: RoMeiliProfileEvidence
  skProfile: RoMeiliProfileEvidence
}): Promise<RoMeiliConvergenceSnapshot> => {
  assertRoMeiliEnvironmentBinding(
    options.authority,
    options.expectedEnvironmentId
  )
  assertProfileBindings({
    authority: options.authority,
    ro: options.roProfile,
    sk: options.skProfile,
  })
  const [indexUids, tasks] = await Promise.all([
    readAllIndexes(options.client),
    readAllTasks(options.client),
  ])
  const existingUids = new Set(indexUids)
  const [ro, sk] = await Promise.all([
    snapshotIndexes(options.client, options.roProfile, existingUids),
    snapshotIndexes(options.client, options.skProfile, existingUids),
  ])
  const activeUids = new Set(Object.values(options.roProfile.indexes))
  const stagingIndexUids = indexUids.filter((uid) =>
    [...activeUids].some((active) =>
      uid.startsWith(`${active}${BUILD_INDEX_MARKER}`)
    )
  )
  const completionMarkerIds = Object.values(ro)
    .flatMap(({ documents }) => documents)
    .map(({ id }) => id)
    .filter(
      (id): id is string =>
        typeof id === "string" && id.startsWith(COMPLETION_MARKER_PREFIX)
    )
    .sort()
  return {
    authority: options.authority,
    cluster: {
      completionMarkerIds,
      indexUids,
      maxTaskUid: tasks.at(-1)?.uid ?? -1,
      stagingIndexUids,
      tasks,
    },
    generatedAt: (options.now?.() ?? new Date()).toISOString(),
    indexes: { ro, sk },
    kind: SNAPSHOT_KIND,
    phase: options.phase,
    roProfile: options.roProfile,
    schemaVersion: 1,
    skProfile: options.skProfile,
  }
}

export const assertRoMeiliEnvironmentBinding = (
  authority: RoMeiliAuthority,
  expectedEnvironmentId: string
): void => {
  if (
    authority.environmentId !==
    text(expectedEnvironmentId, "expected RO environment ID")
  ) {
    invalid("authority environmentId does not match the active RO environment")
  }
}

const documentId = (
  document: Readonly<Record<string, JsonValue>>,
  label: string
): string => text(document.id, `${label}.id`)

const entityId = (
  document: Readonly<Record<string, JsonValue>>,
  field: "search_product_id" | "id",
  label: string
): string => text(document[field], `${label}.${field}`)

const exactSetMismatch = (
  actual: readonly string[],
  expected: readonly string[]
) => {
  const actualSet = new Set(actual)
  const expectedSet = new Set(expected)
  return {
    extra: [...actualSet].filter((id) => !expectedSet.has(id)).sort(),
    missing: [...expectedSet].filter((id) => !actualSet.has(id)).sort(),
  }
}

const allStringValues = (value: JsonValue): string[] => {
  if (typeof value === "string") {
    return [value]
  }
  if (Array.isArray(value)) {
    return value.flatMap(allStringValues)
  }
  if (value && typeof value === "object") {
    return Object.values(value).flatMap(allStringValues)
  }
  return []
}

const asJsonRecords = (
  value: JsonValue | undefined
): Record<string, JsonValue>[] =>
  Array.isArray(value)
    ? (value.map((entry, index) =>
        record(entry, `variants[${index}]`)
      ) as Record<string, JsonValue>[])
    : []

const classifyProductDocuments = (
  documents: readonly Readonly<Record<string, JsonValue>>[]
) => {
  const documentIds = documents.map((document, index) =>
    documentId(document, `product documents[${index}]`)
  )
  if (new Set(documentIds).size !== documentIds.length) {
    invalid("RO product document IDs must be globally unique")
  }
  const productDocuments: Readonly<Record<string, JsonValue>>[] = []
  const variantDocuments: Array<{
    document: Readonly<Record<string, JsonValue>>
    searchVariantId: string
  }> = []
  for (const [index, document] of documents.entries()) {
    const kind = text(
      document.search_result_kind,
      `product documents[${index}].search_result_kind`
    )
    if (kind === "product") {
      if (document.search_variant_id !== undefined) {
        invalid("RO product result must not have search_variant_id")
      }
      productDocuments.push(document)
      continue
    }
    if (kind !== "variant") {
      invalid(`RO product document ${index} has invalid search_result_kind`)
    }
    const searchVariantId = text(
      document.search_variant_id,
      `product documents[${index}].search_variant_id`
    )
    const variants = asJsonRecords(document.variants)
    if (
      variants.length !== 1 ||
      text(variants[0]?.id, `product documents[${index}].variants[0].id`) !==
        searchVariantId
    ) {
      invalid(
        `RO variant document ${index} must contain one nested variant matching search_variant_id`
      )
    }
    variantDocuments.push({ document, searchVariantId })
  }
  if (
    productDocuments.length !== RO_MEILI_COUNTS.product ||
    variantDocuments.length !== RO_MEILI_COUNTS.approvedVariant
  ) {
    invalid(
      "RO product index must contain exactly 2002 product and 2002 variant documents"
    )
  }
  return { productDocuments, variantDocuments }
}

const assertRomanianProductProjection = (
  documents: readonly Readonly<Record<string, JsonValue>>[],
  authority: RoMeiliAuthority
) => {
  const { productDocuments, variantDocuments } =
    classifyProductDocuments(documents)
  const productIds = productDocuments.map((document, index) =>
    entityId(document, "search_product_id", `product documents[${index}]`)
  )
  const productMismatch = exactSetMismatch(productIds, authority.productIds)
  if (
    new Set(productIds).size !== productIds.length ||
    productMismatch.extra.length ||
    productMismatch.missing.length
  ) {
    invalid("RO product documents do not exactly cover authority product IDs")
  }
  const expectedByVariant = new Map(
    authority.approvedVariantPrices.map((projection) => [
      projection.variantId,
      projection,
    ])
  )
  const expectedByProduct = new Map(
    authority.approvedVariantPrices.map((projection) => [
      projection.productId,
      projection,
    ])
  )
  const productVariantByProduct = new Map<string, Record<string, JsonValue>>()
  for (const [index, document] of productDocuments.entries()) {
    const productId = entityId(
      document,
      "search_product_id",
      `product result documents[${index}]`
    )
    const variants = asJsonRecords(document.variants)
    const expected = expectedByProduct.get(productId)
    if (
      variants.length !== 1 ||
      text(variants[0]?.id, `product result ${index} nested variant ID`) !==
        expected?.variantId
    ) {
      invalid(
        `RO product result ${productId} must expose its one authoritative approved variant`
      )
    }
    productVariantByProduct.set(
      productId,
      variants[0] as Record<string, JsonValue>
    )
  }
  for (const { document, searchVariantId } of variantDocuments) {
    const productId = entityId(
      document,
      "search_product_id",
      `variant result ${searchVariantId}`
    )
    const expected = expectedByVariant.get(searchVariantId)
    const nestedVariant = asJsonRecords(document.variants)[0]
    if (
      productId !== expected?.productId ||
      !nestedVariant ||
      !sameValue(productVariantByProduct.get(productId), nestedVariant)
    ) {
      invalid(
        `RO variant result ${searchVariantId} is not paired one-to-one with its authoritative product document`
      )
    }
  }
  for (const [documentIndex, document] of documents.entries()) {
    if (
      authority.unavailableVariantIds.some((id) =>
        allStringValues(document).includes(id)
      )
    ) {
      invalid(`RO product document ${documentIndex} contains an unavailable ID`)
    }
    for (const [variantIndex, variant] of asJsonRecords(
      document.variants
    ).entries()) {
      const id = text(
        variant.id,
        `product document ${documentIndex} variant ${variantIndex}.id`
      )
      if (!authority.approvedVariantIds.includes(id)) {
        invalid(`RO product documents contain non-approved variant ${id}`)
      }
      const prices = asJsonRecords(variant.prices)
      if (
        prices.length !== 1 ||
        typeof prices[0]?.currency_code !== "string" ||
        prices[0].currency_code.toLowerCase() !== "ron"
      ) {
        invalid(`approved variant ${id} must project exactly one RON price`)
      }
      if (prices[0]?.amount !== expectedByVariant.get(id)?.amount) {
        invalid(
          `approved variant ${id} must project its exact authoritative RON amount`
        )
      }
    }
  }
  const variantIds = variantDocuments.map(
    ({ searchVariantId }) => searchVariantId
  )
  const variantMismatch = exactSetMismatch(
    variantIds,
    authority.approvedVariantIds
  )
  if (
    new Set(variantIds).size !== variantIds.length ||
    variantMismatch.extra.length ||
    variantMismatch.missing.length
  ) {
    invalid(
      "RO product search variant IDs do not exactly match approved variants"
    )
  }
}

const taskTouchesRo = (
  task: RoMeiliTaskSnapshot,
  activeUids: readonly string[]
): boolean =>
  task.indexUids.some((uid) =>
    activeUids.some(
      (active) =>
        uid === active || uid.startsWith(`${active}${BUILD_INDEX_MARKER}`)
    )
  )

const isExactFullSwap = (
  task: RoMeiliTaskSnapshot,
  activeUids: readonly string[]
): boolean => {
  if (task.type !== "indexSwap" || task.status !== "succeeded") {
    return false
  }
  const details = record(task.details, `task ${task.uid}.details`)
  if (
    !Array.isArray(details.swaps) ||
    details.swaps.length !== activeUids.length
  ) {
    return false
  }
  const suffixes = new Set<string>()
  const swappedActive = new Set<string>()
  for (const swap of details.swaps) {
    const indexes = record(swap, `task ${task.uid} swap`).indexes
    if (!Array.isArray(indexes) || indexes.length !== 2) {
      return false
    }
    const pair = indexes.map((uid, index) =>
      text(uid, `swap indexes[${index}]`)
    )
    const active = pair.find((uid) => activeUids.includes(uid))
    const staging = pair.find((uid) => !activeUids.includes(uid))
    if (!(active && staging?.startsWith(`${active}${BUILD_INDEX_MARKER}`))) {
      return false
    }
    swappedActive.add(active)
    suffixes.add(staging.slice(active.length + BUILD_INDEX_MARKER.length))
  }
  return swappedActive.size === activeUids.length && suffixes.size === 1
}

const assertSnapshotHashes = (snapshot: RoMeiliConvergenceSnapshot) => {
  for (const side of ["ro", "sk"] as const) {
    for (const kind of SEARCH_INDEX_TYPES) {
      const index = snapshot.indexes[side][kind]
      if (
        index.documentsSha256 !== hashRoMeiliValue(index.documents) ||
        index.settingsSha256 !== hashRoMeiliValue(index.settings)
      ) {
        invalid(`${snapshot.phase} ${side} ${kind} snapshot hash is invalid`)
      }
      if (index.uid !== snapshot[`${side}Profile`].indexes[kind]) {
        invalid(`${snapshot.phase} ${side} ${kind} index UID is unbound`)
      }
    }
  }
}

const assertRoIndexSettings = (snapshot: RoMeiliConvergenceSnapshot) => {
  for (const kind of SEARCH_INDEX_TYPES) {
    const index = snapshot.indexes.ro[kind]
    const expected = {
      ...SEARCH_INDEX_SETTINGS[kind],
      distinctAttribute: null,
      pagination: {
        maxTotalHits: Math.max(DEFAULT_MAX_TOTAL_HITS, index.documents.length),
      },
      stopWords: [],
      synonyms: {},
    }
    const actualProjection = Object.fromEntries(
      Object.keys(expected).map((key) => [key, index.settings[key]])
    )
    if (!sameValue(actualProjection, expected)) {
      invalid(`RO ${kind} index settings drifted from the search contract`)
    }
  }
}

const skState = (snapshot: RoMeiliConvergenceSnapshot) =>
  Object.fromEntries(
    SEARCH_INDEX_TYPES.map((kind) => {
      const index = snapshot.indexes.sk[kind]
      return [
        kind,
        {
          documentsSha256: index.documentsSha256,
          settingsSha256: index.settingsSha256,
          uid: index.uid,
        },
      ]
    })
  ) as Record<
    SearchIndexType,
    { documentsSha256: string; settingsSha256: string; uid: string }
  >

export const assembleRoMeiliConvergenceProof = (
  before: RoMeiliConvergenceSnapshot,
  after: RoMeiliConvergenceSnapshot
): RoMeiliConvergenceProof => {
  if (before.phase !== "pre" || after.phase !== "post") {
    invalid("proof requires pre then post snapshots")
  }
  if (
    before.kind !== SNAPSHOT_KIND ||
    after.kind !== SNAPSHOT_KIND ||
    before.schemaVersion !== 1 ||
    after.schemaVersion !== 1
  ) {
    invalid("snapshot identity is invalid")
  }
  assertSnapshotHashes(before)
  assertSnapshotHashes(after)
  if (!sameValue(before.authority, after.authority)) {
    invalid("authority binding changed between snapshots")
  }
  if (
    !(
      sameValue(
        {
          ...before.roProfile,
          lastSyncError: null,
          lastSyncMode: null,
          lastSyncStartedAt: null,
          lastSyncStatus: null,
          lastSyncedAt: null,
        },
        {
          ...after.roProfile,
          lastSyncError: null,
          lastSyncMode: null,
          lastSyncStartedAt: null,
          lastSyncStatus: null,
          lastSyncedAt: null,
        }
      ) && sameValue(before.skProfile, after.skProfile)
    )
  ) {
    invalid("configured RO/SK profile bindings changed between snapshots")
  }
  const beforeSk = skState(before)
  const afterSk = skState(after)
  const beforeSkSha256 = hashRoMeiliValue(beforeSk)
  const afterSkSha256 = hashRoMeiliValue(afterSk)
  if (beforeSkSha256 !== afterSkSha256) {
    invalid("SK settings or documents changed during RO convergence")
  }
  const generatedAt = new Date(after.generatedAt).valueOf()
  const startedAt = new Date(after.roProfile.lastSyncStartedAt ?? "").valueOf()
  const syncedAt = new Date(after.roProfile.lastSyncedAt ?? "").valueOf()
  if (
    after.roProfile.lastSyncStatus !== "succeeded" ||
    after.roProfile.lastSyncMode !== "full" ||
    after.roProfile.lastSyncError !== null ||
    !Number.isFinite(startedAt) ||
    !Number.isFinite(syncedAt) ||
    startedAt < new Date(before.generatedAt).valueOf() ||
    startedAt > syncedAt ||
    syncedAt > generatedAt
  ) {
    invalid("post snapshot does not bind one completed RO full sync")
  }
  const activeUids = Object.values(after.roProfile.indexes)
  const postTasks = after.cluster.tasks.filter(
    (task) =>
      task.uid > before.cluster.maxTaskUid && taskTouchesRo(task, activeUids)
  )
  const swaps = postTasks.filter((task) => isExactFullSwap(task, activeUids))
  if (swaps.length !== 1) {
    invalid("exactly one succeeded RO four-index full-sync swap is required")
  }
  const failedTaskCount = postTasks.filter(
    (task) => task.status === "failed"
  ).length
  const unsettledTaskCount = after.cluster.tasks.filter(
    (task) =>
      taskTouchesRo(task, activeUids) &&
      (task.status === "enqueued" || task.status === "processing")
  ).length
  if (
    failedTaskCount !== 0 ||
    unsettledTaskCount !== 0 ||
    after.cluster.stagingIndexUids.length !== 0 ||
    after.cluster.completionMarkerIds.length !== 0
  ) {
    invalid(
      "RO staging, completion marker, failed task, or unsettled task residue remains"
    )
  }
  const authority = after.authority
  const expectedByKind = {
    brand: authority.brandIds,
    category: authority.categoryIds,
    product: authority.productIds,
  } as const
  for (const kind of ["brand", "category"] as const) {
    const ids = after.indexes.ro[kind].documents.map((document, index) =>
      entityId(document, "id", `${kind} documents[${index}]`)
    )
    const mismatch = exactSetMismatch(ids, expectedByKind[kind])
    if (
      ids.length !== new Set(ids).size ||
      mismatch.extra.length ||
      mismatch.missing.length
    ) {
      invalid(`RO ${kind} index does not exactly match authority IDs`)
    }
  }
  assertRomanianProductProjection(after.indexes.ro.product.documents, authority)
  if (after.indexes.ro.content.documents.length !== 0) {
    invalid(
      "RO content index must contain zero documents for this release scope"
    )
  }
  assertRoIndexSettings(after)
  const indexProof = Object.fromEntries(
    SEARCH_INDEX_TYPES.map((kind) => {
      const index = after.indexes.ro[kind]
      const ids = index.documents.map((document, position) =>
        documentId(document, `${kind} documents[${position}]`)
      )
      const base = {
        documentCount: ids.length,
        documentIdsSha256: hashRoMeiliValue([...ids].sort()),
        settingsSha256: index.settingsSha256,
        uid: index.uid,
      }
      if (kind === "content") {
        return [kind, base]
      }
      const entityIds = expectedByKind[kind]
      return [
        kind,
        {
          ...base,
          entityCount: entityIds.length,
          entityIdsSha256: hashRoMeiliValue(entityIds),
          extraScopeCount: 0,
          missingScopeCount: 0,
        },
      ]
    })
  ) as RoMeiliConvergenceProof["indexes"]
  const roUids = [...activeUids].sort()
  const skUids = Object.values(after.skProfile.indexes).sort()
  return {
    atomicSwap: {
      activeIndexUids: after.roProfile.indexes,
      completionMarkerCount: 0,
      failedTaskCount,
      stagingIndexesRemaining: after.cluster.stagingIndexUids.length,
      unsettledTaskCount,
    },
    catalogScopeSha256: authority.catalogScopeSha256,
    environmentId: authority.environmentId,
    generatedAt: after.generatedAt,
    indexes: indexProof,
    isolation: {
      roIndexUidsSha256: hashRoMeiliValue(roUids),
      sharedIndexUidCount: roUids.filter((uid) => skUids.includes(uid)).length,
      skIndexUidsSha256: hashRoMeiliValue(skUids),
    },
    kind: PROOF_KIND,
    locale: "ro-RO",
    market: "ro",
    marketAuthoritySha256: authority.marketAuthoritySha256,
    profile: {
      domain: after.roProfile.domain,
      key: after.roProfile.key,
      lastSyncError: after.roProfile.lastSyncError,
      lastSyncMode: after.roProfile.lastSyncMode,
      lastSyncStartedAt: after.roProfile.lastSyncStartedAt,
      lastSyncStatus: after.roProfile.lastSyncStatus,
      lastSyncedAt: after.roProfile.lastSyncedAt,
      locale: after.roProfile.locale,
      salesChannelIds: after.roProfile.salesChannelIds,
      shop: after.roProfile.shop,
      strict: after.roProfile.strict,
    },
    releaseId: authority.releaseId,
    ronPriceProjectionSha256: authority.ronPriceProjectionSha256,
    schemaVersion: 1,
    scope: {
      brandEntityCount: authority.brandIds.length,
      brandEntityIdsSha256: hashRoMeiliValue(authority.brandIds),
      categoryEntityCount: authority.categoryIds.length,
      categoryEntityIdsSha256: hashRoMeiliValue(authority.categoryIds),
      productEntityCount: authority.productIds.length,
      productEntityIdsSha256: hashRoMeiliValue(authority.productIds),
    },
    skPreservation: {
      afterSha256: afterSkSha256,
      beforeSha256: beforeSkSha256,
      indexes: afterSk,
    },
  }
}

export const writePrivateRoMeiliEvidence = async (
  outputPath: string,
  value: unknown
): Promise<void> => {
  const temporaryPath = `${outputPath}.${process.pid}.${randomUUID()}.tmp`
  let handle: Awaited<ReturnType<typeof open>> | undefined
  try {
    handle = await open(temporaryPath, "wx", 0o600)
    await handle.writeFile(serializeRoMeiliEvidence(value), "utf8")
    await handle.sync()
    await handle.close()
    handle = undefined
    await link(temporaryPath, outputPath)
    await unlink(temporaryPath)
  } catch (error) {
    await handle?.close().catch(() => null)
    await unlink(temporaryPath).catch(() => null)
    throw error
  }
}

export const readRoMeiliConvergenceSnapshot = async (
  path: string
): Promise<RoMeiliConvergenceSnapshot> => {
  const contents = await readFile(path, "utf8")
  let parsed: unknown
  try {
    parsed = JSON.parse(contents)
  } catch (error) {
    return invalid(`snapshot is not valid JSON: ${(error as Error).message}`)
  }
  if (serializeRoMeiliEvidence(parsed) !== contents) {
    invalid("snapshot must be canonical JSON with LF")
  }
  const snapshot = parsed as RoMeiliConvergenceSnapshot
  assertSnapshotHashes(snapshot)
  return snapshot
}

import type { MedusaContainer } from "@medusajs/framework/types"
import { MARKET_VARIANT_AUTHORITY_MODULE } from "../../modules/market-variant-authority"
import type { MarketVariantAuthorityModuleService } from "../../modules/market-variant-authority/service"
import {
  persistedSearchProfileToRuntime,
  SEARCH_INDEX_TYPES,
  type SearchIndexType,
} from "../../modules/meilisearch/profiles"
import { PAYLOAD_MODULE } from "../../modules/payload"
import type PayloadModuleService from "../../modules/payload/service"
import {
  SEARCH_PROFILE_MODULE,
  type SearchProfileDTO,
  type SearchProfileModuleService,
} from "../../modules/search-profile"
import { STOREFRONT_URL_ASSIGNMENT_MODULE } from "../../modules/storefront-url-assignment"
import type StorefrontUrlAssignmentModuleService from "../../modules/storefront-url-assignment/service"
import {
  type RoMeiliReadClient,
  writePrivateRoMeiliEvidence,
} from "../ro-meili-convergence"
import {
  FOUR_MARKET_MEILI_MARKETS,
  type FourMarketMeiliConvergenceCandidate,
  type FourMarketMeiliExpectedIds,
  type FourMarketMeiliIndexCandidate,
  type FourMarketMeiliJsonValue,
  type FourMarketMeiliMarket,
  type FourMarketMeiliMarketCandidate,
  type FourMarketMeiliProfile,
  hashFourMarketMeiliValue,
  parseFourMarketMeiliConvergenceCandidate,
  serializeFourMarketMeiliEvidence,
} from "./index"

const BUILD_INDEX_MARKER = "__build_"
const COMPLETION_MARKER_PREFIX = "search_build_marker_"
const PAGE_SIZE = 500
const SHA_256 = /^[a-f0-9]{64}$/

const MARKET_CONTRACT = {
  cz: { currencyCode: "czk", locale: "cs-CZ" },
  hu: { currencyCode: "huf", locale: "hu-HU" },
  ro: { currencyCode: "ron", locale: "ro-RO" },
  sk: { currencyCode: "eur", locale: "sk-SK" },
} as const

type UnknownRecord = Record<string, unknown>

export type FourMarketMeiliProfileIds = Readonly<
  Record<FourMarketMeiliMarket, string>
>

export type FourMarketMeiliAuthoritySnapshot = Readonly<{
  expectedIds: FourMarketMeiliExpectedIds
  sourceAuthoritySha256: string
}>

export type FourMarketMeiliAuthorityReader = Readonly<{
  readMarketAuthority: (
    market: FourMarketMeiliMarket,
    profile: FourMarketMeiliProfile
  ) => Promise<FourMarketMeiliAuthoritySnapshot>
}>

export type FourMarketMeiliCollectorOptions = Readonly<{
  authorityReader: FourMarketMeiliAuthorityReader
  client: RoMeiliReadClient
  environmentId: string
  now?: () => Date
  profiles: Readonly<Record<FourMarketMeiliMarket, FourMarketMeiliProfile>>
  releaseId: string
}>

type RawMeiliTask = Readonly<{
  details?: unknown
  enqueuedAt?: unknown
  finishedAt?: unknown
  indexUid?: unknown
  startedAt?: unknown
  status?: unknown
  taskUid?: unknown
  type?: unknown
  uid?: unknown
}>

type CollectedTask = Readonly<{
  details: FourMarketMeiliJsonValue
  enqueuedAt: string
  finishedAt: null | string
  indexUids: readonly string[]
  startedAt: null | string
  status: string
  type: string
  uid: number
}>

const invalid = (message: string): never => {
  throw new Error(`Four-market Meilisearch collector: ${message}`)
}

const asRecord = (value: unknown, label: string): UnknownRecord => {
  if (!(value && typeof value === "object" && !Array.isArray(value))) {
    return invalid(`${label} must be an object`)
  }
  return value as UnknownRecord
}

const optionalRecord = (value: unknown): UnknownRecord | undefined =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : undefined

const text = (value: unknown, label: string): string => {
  if (typeof value !== "string" || value.trim() !== value || !value) {
    return invalid(`${label} must be a nonblank trimmed string`)
  }
  return value
}

const identifier = (value: unknown, label: string): string => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }
  return text(value, label)
}

const contentEntityId = (
  sourceType: unknown,
  sourceId: unknown,
  label: string
): string => {
  if (sourceType !== "article" && sourceType !== "page") {
    return invalid(`${label}.type must be article or page`)
  }
  return `${sourceType}:${identifier(sourceId, `${label}.source_id`)}`
}

const integer = (value: unknown, label: string): number => {
  if (
    !(typeof value === "number" && Number.isSafeInteger(value) && value >= 0)
  ) {
    return invalid(`${label} must be a non-negative integer`)
  }
  return value
}

const stableValue = (value: unknown): FourMarketMeiliJsonValue =>
  JSON.parse(
    serializeFourMarketMeiliEvidence(value)
  ) as FourMarketMeiliJsonValue

const sortedUnique = (values: readonly string[], label: string): string[] => {
  const sorted = [...values].sort((left, right) => left.localeCompare(right))
  if (new Set(sorted).size !== sorted.length) {
    invalid(`${label} contains duplicate IDs`)
  }
  return sorted
}

const sameIds = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length &&
  left.every((value, index) => value === right[index])

const iso = (value: Date | string | null, label: string): string => {
  if (value === null) {
    return invalid(`${label} must not be null`)
  }
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.valueOf())) {
    return invalid(`${label} must be a timestamp`)
  }
  return date.toISOString()
}

const nullableIso = (value: unknown, label: string): string | null => {
  if (value === null || value === undefined) {
    return null
  }
  if (typeof value !== "string") {
    return invalid(`${label} must be an ISO timestamp or null`)
  }
  return iso(value, label)
}

const profileEvidence = (profile: SearchProfileDTO): FourMarketMeiliProfile => {
  const runtime = persistedSearchProfileToRuntime(profile)
  if (
    runtime.strict !== true ||
    profile.last_sync_error !== null ||
    profile.last_sync_mode !== "full" ||
    profile.last_sync_status !== "succeeded"
  ) {
    return invalid(
      `profile ${profile.id} is not a successful full-sync profile`
    )
  }
  return {
    availability: runtime.availability,
    domain: runtime.domain,
    id: profile.id,
    indexes: runtime.indexes,
    key: runtime.key,
    lastSyncError: null,
    lastSyncMode: "full",
    lastSyncStartedAt: iso(
      profile.last_sync_started_at,
      `profile ${profile.id} last_sync_started_at`
    ),
    lastSyncStatus: "succeeded",
    lastSyncedAt: iso(
      profile.last_synced_at,
      `profile ${profile.id} last_synced_at`
    ),
    limits: runtime.limits,
    locale: runtime.locale,
    minimumRankingScore: runtime.minimumRankingScore,
    salesChannelIds: sortedUnique(
      runtime.salesChannelIds,
      `profile ${profile.id} Sales Channels`
    ),
    separateVariantResults: runtime.separateVariantResults,
    shop: runtime.shop,
    strict: true,
  }
}

export const loadExactFourMarketMeiliProfiles = async (
  container: MedusaContainer,
  profileIds: FourMarketMeiliProfileIds
): Promise<Record<FourMarketMeiliMarket, FourMarketMeiliProfile>> => {
  const service = container.resolve<SearchProfileModuleService>(
    SEARCH_PROFILE_MODULE
  )
  const configured = await service.listConfiguredProfiles()
  return Object.fromEntries(
    FOUR_MARKET_MEILI_MARKETS.map((market) => {
      const id = text(profileIds[market], `${market} profile ID`)
      const matches = configured.filter((profile) => profile.id === id)
      if (matches.length !== 1) {
        invalid(
          `${market} profile ID must resolve exactly one configured profile`
        )
      }
      return [market, profileEvidence(matches[0] as SearchProfileDTO)]
    })
  ) as Record<FourMarketMeiliMarket, FourMarketMeiliProfile>
}

const readAllIndexes = async (client: RoMeiliReadClient): Promise<string[]> => {
  const values: string[] = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const rows = await client.listIndexes({ limit: PAGE_SIZE, offset })
    rows.forEach((row, index) => {
      values.push(
        text(asRecord(row, `indexes[${offset + index}]`).uid, "index uid")
      )
    })
    if (rows.length < PAGE_SIZE) {
      return sortedUnique(values, "Meilisearch indexes")
    }
  }
}

const readAllDocuments = async (
  client: RoMeiliReadClient,
  uid: string
): Promise<UnknownRecord[]> => {
  const documents: UnknownRecord[] = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const rows = await client.getDocuments(uid, { limit: PAGE_SIZE, offset })
    rows.forEach((row, index) => {
      documents.push(
        stableValue(
          asRecord(row, `${uid} documents[${offset + index}]`)
        ) as UnknownRecord
      )
    })
    if (rows.length < PAGE_SIZE) {
      break
    }
  }
  return documents.sort((left, right) =>
    text(left.id, `${uid} document id`).localeCompare(
      text(right.id, `${uid} document id`)
    )
  )
}

const taskValueChildren = (
  value: unknown,
  key: string | undefined
): Array<readonly [string | undefined, unknown]> => {
  if (Array.isArray(value)) {
    const childKey = key === "indexes" ? "indexes" : undefined
    return value.map((entry) => [childKey, entry])
  }
  if (value && typeof value === "object") {
    return Object.entries(value as UnknownRecord)
  }
  return []
}

const collectTaskIndexUids = (
  value: unknown,
  key: string | undefined,
  found: Set<string>
): void => {
  if (
    (key === "indexUid" || key === "indexes") &&
    typeof value === "string" &&
    value
  ) {
    found.add(value)
  }
  for (const [childKey, entry] of taskValueChildren(value, key)) {
    collectTaskIndexUids(entry, childKey, found)
  }
}

const taskIndexUids = (task: RawMeiliTask): string[] => {
  const values = new Set<string>()
  if (typeof task.indexUid === "string" && task.indexUid) {
    values.add(task.indexUid)
  }
  collectTaskIndexUids(task.details, undefined, values)
  return [...values].sort()
}

const readAllTasks = async (
  client: RoMeiliReadClient
): Promise<CollectedTask[]> => {
  const tasks: CollectedTask[] = []
  const seenCursors = new Set<number | undefined>()
  let from: number | undefined
  while (true) {
    if (seenCursors.has(from)) {
      invalid("Meilisearch task pagination repeated a cursor")
    }
    seenCursors.add(from)
    const page = await client.listTasks({ from, limit: 1000 })
    page.results.forEach((entry, index) => {
      const raw = asRecord(entry, `tasks[${index}]`) as RawMeiliTask
      tasks.push({
        details: stableValue(raw.details ?? {}),
        enqueuedAt: iso(
          text(raw.enqueuedAt, `tasks[${index}].enqueuedAt`),
          `tasks[${index}].enqueuedAt`
        ),
        finishedAt: nullableIso(raw.finishedAt, `tasks[${index}].finishedAt`),
        indexUids: taskIndexUids(raw),
        startedAt: nullableIso(raw.startedAt, `tasks[${index}].startedAt`),
        status: text(raw.status, `tasks[${index}].status`),
        type: text(raw.type, `tasks[${index}].type`),
        uid: integer(raw.uid ?? raw.taskUid, `tasks[${index}].uid`),
      })
    })
    if (page.next === undefined || page.next === null) {
      break
    }
    from = integer(page.next, "tasks.next")
  }
  const unique = new Map(tasks.map((task) => [task.uid, task]))
  if (unique.size !== tasks.length) {
    invalid("Meilisearch task pages contain duplicate task UIDs")
  }
  return [...unique.values()].sort((left, right) => left.uid - right.uid)
}

const exactFullSwap = (
  task: CollectedTask,
  activeUids: readonly string[]
): boolean => {
  if (task.status !== "succeeded" || task.type !== "indexSwap") {
    return false
  }
  const details = optionalRecord(task.details)
  if (
    !Array.isArray(details?.swaps) ||
    details.swaps.length !== activeUids.length
  ) {
    return false
  }
  const swappedActive = new Set<string>()
  const suffixes = new Set<string>()
  for (const [index, value] of details.swaps.entries()) {
    const indexes = optionalRecord(value)?.indexes
    if (!Array.isArray(indexes) || indexes.length !== 2) {
      return false
    }
    const pair = indexes.map((uid) =>
      typeof uid === "string" && uid
        ? uid
        : invalid(`task ${task.uid} swap ${index} UID is invalid`)
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

const taskMatchesProfileSync = (
  task: CollectedTask,
  profile: FourMarketMeiliProfile
): boolean => {
  if (!(task.startedAt && task.finishedAt)) {
    return false
  }
  const syncStarted = new Date(profile.lastSyncStartedAt).valueOf()
  const syncFinished = new Date(profile.lastSyncedAt).valueOf()
  const enqueued = new Date(task.enqueuedAt).valueOf()
  const started = new Date(task.startedAt).valueOf()
  const finished = new Date(task.finishedAt).valueOf()
  return (
    syncStarted <= enqueued &&
    enqueued <= started &&
    started <= finished &&
    finished <= syncFinished
  )
}

const taskTouchesProfile = (
  task: CollectedTask,
  activeUids: readonly string[]
): boolean =>
  task.indexUids.some((uid) =>
    activeUids.some(
      (active) =>
        uid === active || uid.startsWith(`${active}${BUILD_INDEX_MARKER}`)
    )
  )

const documentProjection = (
  kind: SearchIndexType,
  uid: string,
  documents: readonly UnknownRecord[]
): { documentIds: string[]; entityIds: string[]; variantIds: string[] } => {
  const documentIds = documents.map((document, index) =>
    text(document.id, `${uid} documents[${index}].id`)
  )
  sortedUnique(documentIds, `${uid} document IDs`)
  if (kind === "product") {
    const entityIds: string[] = []
    const variantIds: string[] = []
    documents.forEach((document, index) => {
      const resultKind = text(
        document.search_result_kind,
        `${uid} documents[${index}].search_result_kind`
      )
      const productId = text(
        document.search_product_id,
        `${uid} documents[${index}].search_product_id`
      )
      if (resultKind === "product") {
        entityIds.push(productId)
      } else if (resultKind === "variant") {
        variantIds.push(
          text(
            document.search_variant_id,
            `${uid} documents[${index}].search_variant_id`
          )
        )
      } else {
        invalid(`${uid} documents[${index}] has an unexpected result kind`)
      }
    })
    return {
      documentIds: sortedUnique(documentIds, `${uid} document IDs`),
      entityIds: sortedUnique(entityIds, `${uid} product IDs`),
      variantIds: sortedUnique(variantIds, `${uid} variant IDs`),
    }
  }
  if (kind === "content") {
    return {
      documentIds: sortedUnique(documentIds, `${uid} document IDs`),
      entityIds: sortedUnique(
        documents.map((document, index) =>
          contentEntityId(
            document.type,
            document.source_id,
            `${uid} documents[${index}]`
          )
        ),
        `${uid} content source IDs`
      ),
      variantIds: [],
    }
  }
  return {
    documentIds: sortedUnique(documentIds, `${uid} document IDs`),
    entityIds: sortedUnique(documentIds, `${uid} entity IDs`),
    variantIds: [],
  }
}

const assertAuthorityProjection = (
  market: FourMarketMeiliMarket,
  authority: FourMarketMeiliExpectedIds,
  indexes: Readonly<Record<SearchIndexType, FourMarketMeiliIndexCandidate>>
): void => {
  const actual = {
    brand: indexes.brand.entityIds,
    category: indexes.category.entityIds,
    content: indexes.content.entityIds,
    product: indexes.product.entityIds,
    variant: indexes.product.variantIds,
  }
  for (const kind of [
    "brand",
    "category",
    "content",
    "product",
    "variant",
  ] as const) {
    if (!sameIds(actual[kind], authority[kind])) {
      invalid(`${market} ${kind} index IDs do not exactly match live authority`)
    }
  }
}

type CollectedIndex = Readonly<{
  candidate: FourMarketMeiliIndexCandidate
  documents: UnknownRecord[]
}>

const collectIndex = async (
  client: RoMeiliReadClient,
  profile: FourMarketMeiliProfile,
  kind: SearchIndexType
): Promise<CollectedIndex> => {
  const uid = profile.indexes[kind]
  const [documents, settingsValue] = await Promise.all([
    readAllDocuments(client, uid),
    client.getSettings(uid),
  ])
  const projection = documentProjection(kind, uid, documents)
  return {
    candidate: {
      ...projection,
      settings: stableValue(
        asRecord(settingsValue, `${uid} settings`)
      ) as Record<string, FourMarketMeiliJsonValue>,
      uid,
    },
    documents,
  }
}

const collectMarketIndexes = async (
  client: RoMeiliReadClient,
  profile: FourMarketMeiliProfile
): Promise<Record<SearchIndexType, CollectedIndex>> => {
  const [product, category, brand, content] = await Promise.all([
    collectIndex(client, profile, "product"),
    collectIndex(client, profile, "category"),
    collectIndex(client, profile, "brand"),
    collectIndex(client, profile, "content"),
  ])
  return { brand, category, content, product }
}

export const collectFourMarketMeiliConvergenceCandidate = async (
  options: FourMarketMeiliCollectorOptions
): Promise<FourMarketMeiliConvergenceCandidate> => {
  const environmentId = text(options.environmentId, "environmentId")
  const releaseId = text(options.releaseId, "releaseId")
  const profiles = options.profiles
  const activeUids = FOUR_MARKET_MEILI_MARKETS.flatMap((market) =>
    Object.values(profiles[market].indexes)
  )
  if (
    activeUids.length !== 16 ||
    new Set(activeUids).size !== activeUids.length
  ) {
    invalid("the exact four profiles must own sixteen distinct index UIDs")
  }

  const tasksBefore = await readAllTasks(options.client)
  const [
    clusterUids,
    czAuthority,
    huAuthority,
    roAuthority,
    skAuthority,
    czIndexes,
    huIndexes,
    roIndexes,
    skIndexes,
  ] = await Promise.all([
    readAllIndexes(options.client),
    options.authorityReader.readMarketAuthority("cz", profiles.cz),
    options.authorityReader.readMarketAuthority("hu", profiles.hu),
    options.authorityReader.readMarketAuthority("ro", profiles.ro),
    options.authorityReader.readMarketAuthority("sk", profiles.sk),
    collectMarketIndexes(options.client, profiles.cz),
    collectMarketIndexes(options.client, profiles.hu),
    collectMarketIndexes(options.client, profiles.ro),
    collectMarketIndexes(options.client, profiles.sk),
  ])
  const tasks = await readAllTasks(options.client)
  if (
    serializeFourMarketMeiliEvidence(tasksBefore) !==
    serializeFourMarketMeiliEvidence(tasks)
  ) {
    invalid("Meilisearch task state changed during evidence collection")
  }
  const existing = new Set(clusterUids)
  for (const uid of activeUids) {
    if (!existing.has(uid)) {
      invalid(`configured index ${uid} does not exist`)
    }
  }

  const marketIndexes = {
    cz: czIndexes,
    hu: huIndexes,
    ro: roIndexes,
    sk: skIndexes,
  } satisfies Record<
    FourMarketMeiliMarket,
    Record<SearchIndexType, CollectedIndex>
  >
  const authorityByMarket = {
    cz: czAuthority,
    hu: huAuthority,
    ro: roAuthority,
    sk: skAuthority,
  } satisfies Record<FourMarketMeiliMarket, FourMarketMeiliAuthoritySnapshot>
  const generatedAt = (options.now?.() ?? new Date()).toISOString()
  const buildMarket = (
    market: FourMarketMeiliMarket
  ): FourMarketMeiliMarketCandidate => {
    const profile = profiles[market]
    const collected = marketIndexes[market]
    const indexes = {
      brand: collected.brand.candidate,
      category: collected.category.candidate,
      content: collected.content.candidate,
      product: collected.product.candidate,
    }
    const authority = authorityByMarket[market]
    assertAuthorityProjection(market, authority.expectedIds, indexes)
    const profileUids = Object.values(profile.indexes).sort()
    const fullSyncTask =
      [...tasks]
        .reverse()
        .find(
          (task) =>
            exactFullSwap(task, profileUids) &&
            taskMatchesProfileSync(task, profile)
        ) ??
      invalid(`${market} has no succeeded exact four-index full-sync task`)
    const completionMarkerIds = SEARCH_INDEX_TYPES.flatMap((kind) =>
      collected[kind].documents.flatMap((document) => {
        const id = document.id
        return typeof id === "string" && id.startsWith(COMPLETION_MARKER_PREFIX)
          ? [id]
          : []
      })
    ).sort()
    const relevantTasks = tasks.filter((task) =>
      taskTouchesProfile(task, profileUids)
    )
    const failedTaskUids = relevantTasks
      .filter((task) => task.uid > fullSyncTask.uid && task.status === "failed")
      .map((task) => task.uid)
    const unsettledTaskUids = relevantTasks
      .filter(
        (task) => task.status === "enqueued" || task.status === "processing"
      )
      .map((task) => task.uid)
    const stagingIndexUids = clusterUids.filter((uid) =>
      profileUids.some((active) =>
        uid.startsWith(`${active}${BUILD_INDEX_MARKER}`)
      )
    )
    return {
      authority: {
        expectedDocumentIds: {
          brand: indexes.brand.documentIds,
          category: indexes.category.documentIds,
          content: indexes.content.documentIds,
          product: indexes.product.documentIds,
        },
        expectedIds: authority.expectedIds,
        projectionSha256: hashFourMarketMeiliValue({
          brand: {
            documents: collected.brand.documents,
            settings: indexes.brand.settings,
          },
          category: {
            documents: collected.category.documents,
            settings: indexes.category.settings,
          },
          content: {
            documents: collected.content.documents,
            settings: indexes.content.settings,
          },
          product: {
            documents: collected.product.documents,
            settings: indexes.product.settings,
          },
        }),
        sourceAuthoritySha256: authority.sourceAuthoritySha256,
      },
      convergence: {
        completionMarkerIds,
        failedTaskUids,
        fullSyncTask: {
          indexUids: profileUids,
          status: "succeeded" as const,
          type: "indexSwap" as const,
          uid: fullSyncTask.uid,
        },
        stagingIndexUids,
        unsettledTaskUids,
      },
      currencyCode: MARKET_CONTRACT[market].currencyCode,
      environmentId,
      indexes,
      locale: MARKET_CONTRACT[market].locale,
      market,
      profile,
      releaseId,
    }
  }
  const markets = {
    cz: buildMarket("cz"),
    hu: buildMarket("hu"),
    ro: buildMarket("ro"),
    sk: buildMarket("sk"),
  } satisfies FourMarketMeiliConvergenceCandidate["markets"]

  const value = {
    environmentId,
    generatedAt,
    kind: "herbatika-four-market-meilisearch-convergence-candidate" as const,
    markets,
    releaseId,
    schemaVersion: 1 as const,
    targetedProfileIds: FOUR_MARKET_MEILI_MARKETS.map(
      (market) => profiles[market].id
    ).sort(),
  }
  return parseFourMarketMeiliConvergenceCandidate(
    serializeFourMarketMeiliEvidence(value)
  )
}

type MarketVariantAuthorityRow = Readonly<{
  authority_sha256?: unknown
  availability?: unknown
  market_code?: unknown
  product_id?: unknown
  source_version?: unknown
  variant_id?: unknown
}>

const readPagedService = async <Row>(
  read: (skip: number, take: number) => Promise<readonly Row[]>
): Promise<Row[]> => {
  const values: Row[] = []
  for (let skip = 0; ; skip += PAGE_SIZE) {
    const batch = await read(skip, PAGE_SIZE)
    values.push(...batch)
    if (batch.length < PAGE_SIZE) {
      return values
    }
  }
}

const readPayloadIds = async (
  payload: PayloadModuleService,
  locale: string
): Promise<Array<{ sourceId: string; sourceType: "article" | "page" }>> => {
  const result: Array<{ sourceId: string; sourceType: "article" | "page" }> = []
  for (const sourceType of ["article", "page"] as const) {
    for (let page = 1; ; page += 1) {
      const response =
        sourceType === "article"
          ? await payload.listPublishedArticles({
              limit: PAGE_SIZE,
              locale,
              page,
            })
          : await payload.listPublishedPages({ limit: PAGE_SIZE, locale, page })
      response.docs.forEach((document, index) => {
        result.push({
          sourceId: identifier(
            document.id,
            `${sourceType} page ${page} document ${index} ID`
          ),
          sourceType,
        })
      })
      if (!response.hasNextPage) {
        break
      }
    }
  }
  return result.sort((left, right) =>
    `${left.sourceType}\u0000${left.sourceId}`.localeCompare(
      `${right.sourceType}\u0000${right.sourceId}`
    )
  )
}

export class ConfiguredFourMarketMeiliAuthorityReader
  implements FourMarketMeiliAuthorityReader
{
  private readonly authorityService: MarketVariantAuthorityModuleService
  private readonly assignmentService: StorefrontUrlAssignmentModuleService
  private readonly payload: PayloadModuleService

  constructor(container: MedusaContainer) {
    this.authorityService =
      container.resolve<MarketVariantAuthorityModuleService>(
        MARKET_VARIANT_AUTHORITY_MODULE
      )
    this.assignmentService =
      container.resolve<StorefrontUrlAssignmentModuleService>(
        STOREFRONT_URL_ASSIGNMENT_MODULE
      )
    this.payload = container.resolve<PayloadModuleService>(PAYLOAD_MODULE)
  }

  async readMarketAuthority(
    market: FourMarketMeiliMarket,
    profile: FourMarketMeiliProfile
  ): Promise<FourMarketMeiliAuthoritySnapshot> {
    if (
      profile.salesChannelIds.length !== 1 ||
      !profile.separateVariantResults
    ) {
      return invalid(
        `${market} profile must use one Sales Channel and separate variants`
      )
    }
    const salesChannelId = profile.salesChannelIds[0] as string
    const [rawRows, categories, brands, contentSources] = await Promise.all([
      readPagedService<MarketVariantAuthorityRow>(
        async (skip, take) =>
          (await this.authorityService.listMarketVariantAuthorities(
            { market_code: market },
            { order: { product_id: "ASC", variant_id: "ASC" }, skip, take }
          )) as MarketVariantAuthorityRow[]
      ),
      readPagedService<UnknownRecord>(
        async (skip, take) =>
          (await this.assignmentService.listStorefrontUrlAssignments(
            {
              entity_kind: "category",
              market_code: market,
              publication_status: "published",
              sales_channel_id: salesChannelId,
            },
            { order: { entity_id: "ASC" }, skip, take }
          )) as UnknownRecord[]
      ),
      readPagedService<UnknownRecord>(
        async (skip, take) =>
          (await this.assignmentService.listStorefrontUrlAssignments(
            {
              entity_kind: "brand",
              market_code: market,
              publication_status: "published",
              sales_channel_id: salesChannelId,
            },
            { order: { entity_id: "ASC" }, skip, take }
          )) as UnknownRecord[]
      ),
      readPayloadIds(this.payload, profile.locale),
    ])
    const rows = rawRows.map((row, index) => {
      const availability = text(
        row.availability,
        `${market} authority[${index}].availability`
      )
      if (availability !== "sellable" && availability !== "unavailable") {
        invalid(`${market} authority[${index}].availability is invalid`)
      }
      const authoritySha256 = text(
        row.authority_sha256,
        `${market} authority[${index}].authority_sha256`
      )
      if (!SHA_256.test(authoritySha256)) {
        invalid(`${market} authority[${index}].authority_sha256 is invalid`)
      }
      if (row.market_code !== market) {
        invalid(`${market} authority[${index}] has the wrong market`)
      }
      return {
        authoritySha256,
        availability,
        productId: text(
          row.product_id,
          `${market} authority[${index}].product_id`
        ),
        sourceVersion: text(
          row.source_version,
          `${market} authority[${index}].source_version`
        ),
        variantId: text(
          row.variant_id,
          `${market} authority[${index}].variant_id`
        ),
      }
    })
    if (
      rows.length === 0 ||
      new Set(rows.map((row) => row.variantId)).size !== rows.length ||
      new Set(rows.map((row) => row.authoritySha256)).size !== 1 ||
      new Set(rows.map((row) => row.sourceVersion)).size !== 1
    ) {
      invalid(
        `${market} must expose one exhaustive unique variant authority generation`
      )
    }
    const normalizeAssignments = (
      records: readonly UnknownRecord[],
      entityKind: "brand" | "category"
    ) =>
      records.map((record, index) => {
        const label = `${market} ${entityKind}[${index}]`
        if (
          record.entity_kind !== entityKind ||
          record.market_code !== market ||
          record.publication_status !== "published" ||
          record.sales_channel_id !== salesChannelId
        ) {
          invalid(`${label} is outside the exact publication scope`)
        }
        return {
          entityId: text(record.entity_id, `${label}.entity_id`),
          entityKind,
          publicSlug: text(record.public_slug, `${label}.public_slug`),
          sourceVersion: integer(
            record.source_version,
            `${label}.source_version`
          ),
        }
      })
    const categoryAssignments = normalizeAssignments(categories, "category")
    const brandAssignments = normalizeAssignments(brands, "brand")
    const assignmentIds = (
      records: readonly { entityId: string }[],
      kind: string
    ) =>
      sortedUnique(
        records.map(({ entityId }) => entityId),
        `${market} ${kind} authority IDs`
      )
    const sellableRows = rows.filter((row) => row.availability === "sellable")
    const productRows =
      profile.availability === "in-stock" ? sellableRows : rows
    const expectedIds = {
      brand: assignmentIds(brandAssignments, "brand"),
      category: assignmentIds(categoryAssignments, "category"),
      content: sortedUnique(
        contentSources.map(({ sourceId, sourceType }) =>
          contentEntityId(sourceType, sourceId, `${market} content authority`)
        ),
        `${market} content authority IDs`
      ),
      product: sortedUnique(
        [...new Set(productRows.map(({ productId }) => productId))],
        `${market} product authority IDs`
      ),
      variant: sortedUnique(
        sellableRows.map(({ variantId }) => variantId),
        `${market} variant authority IDs`
      ),
    } satisfies FourMarketMeiliExpectedIds
    return {
      expectedIds,
      sourceAuthoritySha256: hashFourMarketMeiliValue({
        assignments: {
          brands: brandAssignments,
          categories: categoryAssignments,
        },
        contentSources,
        market,
        rows,
        salesChannelId,
      }),
    }
  }
}

export const writePrivateFourMarketMeiliCandidate = async (
  outputPath: string,
  candidate: FourMarketMeiliConvergenceCandidate
): Promise<void> => {
  await writePrivateRoMeiliEvidence(outputPath, candidate)
}

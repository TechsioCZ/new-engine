import { createHash } from "node:crypto"
import {
  SEARCH_INDEX_TYPES,
  type SearchIndexType,
} from "../../modules/meilisearch/profiles"
import { SEARCH_INDEX_SETTINGS } from "../../modules/meilisearch/settings"

const CANDIDATE_KIND =
  "herbatika-four-market-meilisearch-convergence-candidate" as const
const PROOF_KIND =
  "herbatika-four-market-meilisearch-convergence-proof" as const
const SHA_256 = /^[a-f0-9]{64}$/
const DEFAULT_MAX_TOTAL_HITS = 1000

export const FOUR_MARKET_MEILI_MARKETS = ["cz", "hu", "ro", "sk"] as const
export type FourMarketMeiliMarket = (typeof FOUR_MARKET_MEILI_MARKETS)[number]

const MARKET_CONTRACT = {
  cz: {
    currencyCode: "czk",
    domain: "herbatica.cz",
    locale: "cs-CZ",
    profileLocale: "cs-cz",
  },
  hu: {
    currencyCode: "huf",
    domain: "herbatica.hu",
    locale: "hu-HU",
    profileLocale: "hu-hu",
  },
  ro: {
    currencyCode: "ron",
    domain: "herbatica.ro",
    locale: "ro-RO",
    profileLocale: "ro-ro",
  },
  sk: {
    currencyCode: "eur",
    domain: "herbatica.sk",
    locale: "sk-SK",
    profileLocale: "sk-sk",
  },
} as const

type JsonPrimitive = boolean | null | number | string
export type FourMarketMeiliJsonValue =
  | JsonPrimitive
  | FourMarketMeiliJsonValue[]
  | { [key: string]: FourMarketMeiliJsonValue }

export type FourMarketMeiliExpectedIds = Readonly<{
  brand: readonly string[]
  category: readonly string[]
  content: readonly string[]
  product: readonly string[]
  variant: readonly string[]
}>

export type FourMarketMeiliExpectedDocumentIds = Readonly<
  Record<SearchIndexType, readonly string[]>
>

export type FourMarketMeiliIndexCandidate = Readonly<{
  documentIds: readonly string[]
  entityIds: readonly string[]
  settings: Readonly<Record<string, FourMarketMeiliJsonValue>>
  uid: string
  variantIds: readonly string[]
}>

export type FourMarketMeiliProfile = Readonly<{
  availability: "all" | "in-stock"
  domain: string
  id: string
  indexes: Readonly<Record<SearchIndexType, string>>
  key: string
  lastSyncError: null
  lastSyncMode: "full"
  lastSyncStartedAt: string
  lastSyncStatus: "succeeded"
  lastSyncedAt: string
  limits: Readonly<{
    autocomplete: Readonly<Record<SearchIndexType, number>>
    fullSearch: number
    page: number
    popular: number
  }>
  locale: string
  minimumRankingScore: number
  salesChannelIds: readonly string[]
  separateVariantResults: boolean
  shop: string
  strict: true
}>

export type FourMarketMeiliMarketCandidate = Readonly<{
  authority: Readonly<{
    expectedDocumentIds: FourMarketMeiliExpectedDocumentIds
    expectedIds: FourMarketMeiliExpectedIds
    projectionSha256: string
    sourceAuthoritySha256: string
  }>
  convergence: Readonly<{
    completionMarkerIds: readonly string[]
    failedTaskUids: readonly number[]
    fullSyncTask: Readonly<{
      indexUids: readonly string[]
      status: "succeeded"
      type: "indexSwap"
      uid: number
    }>
    stagingIndexUids: readonly string[]
    unsettledTaskUids: readonly number[]
  }>
  currencyCode: "czk" | "eur" | "huf" | "ron"
  environmentId: string
  indexes: Readonly<Record<SearchIndexType, FourMarketMeiliIndexCandidate>>
  locale: "cs-CZ" | "hu-HU" | "ro-RO" | "sk-SK"
  market: FourMarketMeiliMarket
  profile: FourMarketMeiliProfile
  releaseId: string
}>

export type FourMarketMeiliConvergenceCandidate = Readonly<{
  environmentId: string
  generatedAt: string
  kind: typeof CANDIDATE_KIND
  markets: Readonly<
    Record<FourMarketMeiliMarket, FourMarketMeiliMarketCandidate>
  >
  releaseId: string
  schemaVersion: 1
  targetedProfileIds: readonly string[]
}>

export type FourMarketMeiliIndexProof = Readonly<{
  documentCount: number
  documentIdsSha256: string
  entityCount: number
  entityIdsSha256: string
  settingsSha256: string
  uid: string
  variantCount: number
  variantIdsSha256: string
}>

export type FourMarketMeiliMarketProof = FourMarketMeiliMarketCandidate &
  Readonly<{
    indexProofs: Readonly<Record<SearchIndexType, FourMarketMeiliIndexProof>>
  }>

export type FourMarketMeiliConvergenceProof = Readonly<{
  aggregate: Readonly<{
    indexUidCount: 16
    indexUidsSha256: string
    marketEvidenceSha256: string
    profileCount: 4
    profileIdsSha256: string
    sharedIndexUidCount: 0
    state: "converged"
    targetedProfileCount: 4
  }>
  environmentId: string
  generatedAt: string
  kind: typeof PROOF_KIND
  markets: Readonly<Record<FourMarketMeiliMarket, FourMarketMeiliMarketProof>>
  releaseId: string
  schemaVersion: 1
  targetedProfileIds: readonly string[]
}>

const invalid = (message: string): never => {
  throw new Error(`Four-market Meilisearch convergence: ${message}`)
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
): void => {
  const actual = Object.keys(value).sort()
  const wanted = [...expected].sort()
  if (
    actual.length !== wanted.length ||
    actual.some((key, index) => key !== wanted[index])
  ) {
    invalid(`${label} fields must be exactly ${wanted.join(",")}`)
  }
}

const jsonValue = (value: unknown, label: string): FourMarketMeiliJsonValue => {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "string"
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

const stableValue = (value: unknown): FourMarketMeiliJsonValue =>
  jsonValue(value, "artifact")

export const serializeFourMarketMeiliEvidence = (value: unknown): string =>
  `${JSON.stringify(stableValue(value))}\n`

export const hashFourMarketMeiliValue = (value: unknown): string =>
  createHash("sha256")
    .update(JSON.stringify(stableValue(value)))
    .digest("hex")

export const hashFourMarketMeiliArtifact = (contents: string): string =>
  createHash("sha256").update(contents).digest("hex")

const sameValue = (left: unknown, right: unknown): boolean =>
  serializeFourMarketMeiliEvidence(left) ===
  serializeFourMarketMeiliEvidence(right)

const text = (value: unknown, label: string): string => {
  if (typeof value !== "string" || value.trim() !== value || !value) {
    return invalid(`${label} must be a nonblank trimmed string`)
  }
  return value
}

const booleanValue = (value: unknown, label: string): boolean => {
  if (typeof value !== "boolean") {
    return invalid(`${label} must be a boolean`)
  }
  return value
}

const availabilityValue = (
  value: unknown,
  label: string
): "all" | "in-stock" => {
  if (value !== "all" && value !== "in-stock") {
    return invalid(`${label} is invalid`)
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

const integer = (
  value: unknown,
  label: string,
  options: { maximum?: number; minimum?: number } = {}
): number => {
  const minimum = options.minimum ?? 0
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < minimum ||
    (options.maximum !== undefined && value > options.maximum)
  ) {
    return invalid(`${label} must be an integer in the accepted range`)
  }
  return value
}

const score = (value: unknown, label: string): number => {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 1
  ) {
    return invalid(`${label} must be between zero and one`)
  }
  return value
}

const timestamp = (value: unknown, label: string): string => {
  const parsed = text(value, label)
  const date = new Date(parsed)
  if (Number.isNaN(date.valueOf()) || date.toISOString() !== parsed) {
    invalid(`${label} must be a canonical ISO timestamp`)
  }
  return parsed
}

const sortedUniqueText = (
  value: unknown,
  label: string,
  options: { allowEmpty?: boolean; exactCount?: number } = {}
): string[] => {
  if (!Array.isArray(value)) {
    return invalid(`${label} must be an array`)
  }
  const parsed = value.map((entry, index) => text(entry, `${label}[${index}]`))
  const sorted = [...parsed].sort((left, right) => left.localeCompare(right))
  if (
    new Set(parsed).size !== parsed.length ||
    parsed.some((entry, index) => entry !== sorted[index])
  ) {
    invalid(`${label} must be sorted and unique`)
  }
  if (!options.allowEmpty && parsed.length === 0) {
    invalid(`${label} must be nonempty`)
  }
  if (
    options.exactCount !== undefined &&
    parsed.length !== options.exactCount
  ) {
    invalid(`${label} must contain exactly ${options.exactCount} entries`)
  }
  return parsed
}

const sortedUniqueIntegers = (value: unknown, label: string): number[] => {
  if (!Array.isArray(value)) {
    return invalid(`${label} must be an array`)
  }
  const parsed = value.map((entry, index) =>
    integer(entry, `${label}[${index}]`)
  )
  if (
    new Set(parsed).size !== parsed.length ||
    parsed.some(
      (entry, index) => index > 0 && entry <= (parsed[index - 1] ?? -1)
    )
  ) {
    invalid(`${label} must be sorted and unique`)
  }
  return parsed
}

const parseExpectedIds = (
  value: unknown,
  label: string
): FourMarketMeiliExpectedIds => {
  const raw = record(value, label)
  exactKeys(raw, ["brand", "category", "content", "product", "variant"], label)
  return {
    brand: sortedUniqueText(raw.brand, `${label}.brand`),
    category: sortedUniqueText(raw.category, `${label}.category`),
    content: sortedUniqueText(raw.content, `${label}.content`, {
      allowEmpty: true,
    }),
    product: sortedUniqueText(raw.product, `${label}.product`),
    variant: sortedUniqueText(raw.variant, `${label}.variant`),
  }
}

const parseExpectedDocumentIds = (
  value: unknown,
  label: string
): FourMarketMeiliExpectedDocumentIds => {
  const raw = record(value, label)
  exactKeys(raw, SEARCH_INDEX_TYPES, label)
  return {
    brand: sortedUniqueText(raw.brand, `${label}.brand`, { allowEmpty: true }),
    category: sortedUniqueText(raw.category, `${label}.category`, {
      allowEmpty: true,
    }),
    content: sortedUniqueText(raw.content, `${label}.content`, {
      allowEmpty: true,
    }),
    product: sortedUniqueText(raw.product, `${label}.product`, {
      allowEmpty: true,
    }),
  }
}

const parseSettings = (
  value: unknown,
  label: string
): Record<string, FourMarketMeiliJsonValue> =>
  stableValue(record(value, label)) as Record<string, FourMarketMeiliJsonValue>

const parseIndexCandidate = (
  value: unknown,
  market: FourMarketMeiliMarket,
  kind: SearchIndexType,
  authority: {
    expectedDocumentIds: FourMarketMeiliExpectedDocumentIds
    expectedIds: FourMarketMeiliExpectedIds
  }
): FourMarketMeiliIndexCandidate => {
  const { expectedDocumentIds, expectedIds } = authority
  const label = `markets.${market}.indexes.${kind}`
  const raw = record(value, label)
  exactKeys(
    raw,
    ["documentIds", "entityIds", "settings", "uid", "variantIds"],
    label
  )
  const documentIds = sortedUniqueText(
    raw.documentIds,
    `${label}.documentIds`,
    {
      allowEmpty: kind === "content" && expectedIds.content.length === 0,
    }
  )
  const entityIds = sortedUniqueText(raw.entityIds, `${label}.entityIds`, {
    allowEmpty: kind === "content" && expectedIds.content.length === 0,
  })
  const variantIds = sortedUniqueText(raw.variantIds, `${label}.variantIds`, {
    allowEmpty: kind !== "product",
  })
  const expectedEntityIds =
    kind === "product" ? expectedIds.product : expectedIds[kind]
  const expectedVariantIds = kind === "product" ? expectedIds.variant : []
  if (
    !(
      sameValue(entityIds, expectedEntityIds) &&
      sameValue(variantIds, expectedVariantIds)
    )
  ) {
    invalid(`${label} projected IDs do not exactly match authority IDs`)
  }
  if (
    documentIds.length !== entityIds.length + variantIds.length ||
    !sameValue(documentIds, expectedDocumentIds[kind])
  ) {
    invalid(
      `${label}.documentIds must exactly match authority and cover entity and variant results`
    )
  }
  const settings = parseSettings(raw.settings, `${label}.settings`)
  const expectedSettings = {
    ...SEARCH_INDEX_SETTINGS[kind],
    distinctAttribute: null,
    pagination: {
      maxTotalHits: Math.max(DEFAULT_MAX_TOTAL_HITS, documentIds.length),
    },
    stopWords: [],
    synonyms: {},
  }
  const settingsProjection = Object.fromEntries(
    Object.keys(expectedSettings).map((key) => [key, settings[key]])
  )
  if (!sameValue(settingsProjection, expectedSettings)) {
    invalid(`${label}.settings drifted from the search contract`)
  }
  return {
    documentIds,
    entityIds,
    settings,
    uid: text(raw.uid, `${label}.uid`),
    variantIds,
  }
}

const parseProfile = (
  value: unknown,
  market: FourMarketMeiliMarket,
  generatedAt: string
): FourMarketMeiliProfile => {
  const label = `markets.${market}.profile`
  const raw = record(value, label)
  exactKeys(
    raw,
    [
      "availability",
      "domain",
      "id",
      "indexes",
      "key",
      "lastSyncError",
      "lastSyncMode",
      "lastSyncStartedAt",
      "lastSyncStatus",
      "lastSyncedAt",
      "limits",
      "locale",
      "minimumRankingScore",
      "salesChannelIds",
      "separateVariantResults",
      "shop",
      "strict",
    ],
    label
  )
  const availability = availabilityValue(
    raw.availability,
    `${label}.availability`
  )
  const separateVariantResults = booleanValue(
    raw.separateVariantResults,
    `${label}.separateVariantResults`
  )
  if (
    raw.locale !== MARKET_CONTRACT[market].profileLocale ||
    raw.strict !== true ||
    raw.lastSyncError !== null ||
    raw.lastSyncMode !== "full" ||
    raw.lastSyncStatus !== "succeeded"
  ) {
    invalid(`${label} must be strict, exact-locale, and fully synchronized`)
  }
  const indexesRaw = record(raw.indexes, `${label}.indexes`)
  exactKeys(indexesRaw, SEARCH_INDEX_TYPES, `${label}.indexes`)
  const indexes = Object.fromEntries(
    SEARCH_INDEX_TYPES.map((kind) => [
      kind,
      text(indexesRaw[kind], `${label}.indexes.${kind}`),
    ])
  ) as Record<SearchIndexType, string>
  if (new Set(Object.values(indexes)).size !== SEARCH_INDEX_TYPES.length) {
    invalid(`${label}.indexes must contain four distinct UIDs`)
  }
  const limitsRaw = record(raw.limits, `${label}.limits`)
  exactKeys(
    limitsRaw,
    ["autocomplete", "fullSearch", "page", "popular"],
    `${label}.limits`
  )
  const autocompleteRaw = record(
    limitsRaw.autocomplete,
    `${label}.limits.autocomplete`
  )
  exactKeys(autocompleteRaw, SEARCH_INDEX_TYPES, `${label}.limits.autocomplete`)
  const limits = {
    autocomplete: Object.fromEntries(
      SEARCH_INDEX_TYPES.map((kind) => [
        kind,
        integer(autocompleteRaw[kind], `${label}.limits.autocomplete.${kind}`, {
          minimum: 1,
        }),
      ])
    ) as Record<SearchIndexType, number>,
    fullSearch: integer(limitsRaw.fullSearch, `${label}.limits.fullSearch`, {
      minimum: 1,
    }),
    page: integer(limitsRaw.page, `${label}.limits.page`, { minimum: 1 }),
    popular: integer(limitsRaw.popular, `${label}.limits.popular`, {
      minimum: 1,
    }),
  }
  const lastSyncStartedAt = timestamp(
    raw.lastSyncStartedAt,
    `${label}.lastSyncStartedAt`
  )
  const lastSyncedAt = timestamp(raw.lastSyncedAt, `${label}.lastSyncedAt`)
  if (
    new Date(lastSyncStartedAt).valueOf() > new Date(lastSyncedAt).valueOf() ||
    new Date(lastSyncedAt).valueOf() > new Date(generatedAt).valueOf()
  ) {
    invalid(`${label} sync timestamps are not bound to generatedAt`)
  }
  const domain = text(raw.domain, `${label}.domain`)
  if (domain !== MARKET_CONTRACT[market].domain) {
    invalid(`${label}.domain is not bound to the canonical market hostname`)
  }
  return {
    availability,
    domain,
    id: text(raw.id, `${label}.id`),
    indexes,
    key: text(raw.key, `${label}.key`),
    lastSyncError: null,
    lastSyncMode: "full",
    lastSyncStartedAt,
    lastSyncStatus: "succeeded",
    lastSyncedAt,
    limits,
    locale: MARKET_CONTRACT[market].profileLocale,
    minimumRankingScore: score(
      raw.minimumRankingScore,
      `${label}.minimumRankingScore`
    ),
    salesChannelIds: sortedUniqueText(
      raw.salesChannelIds,
      `${label}.salesChannelIds`,
      { exactCount: 1 }
    ),
    separateVariantResults,
    shop: text(raw.shop, `${label}.shop`),
    strict: true,
  }
}

const parseMarketCandidate = (
  value: unknown,
  market: FourMarketMeiliMarket,
  binding: { environmentId: string; generatedAt: string; releaseId: string }
): FourMarketMeiliMarketCandidate => {
  const label = `markets.${market}`
  const raw = record(value, label)
  exactKeys(
    raw,
    [
      "authority",
      "convergence",
      "currencyCode",
      "environmentId",
      "indexes",
      "locale",
      "market",
      "profile",
      "releaseId",
    ],
    label
  )
  if (
    raw.market !== market ||
    raw.locale !== MARKET_CONTRACT[market].locale ||
    raw.currencyCode !== MARKET_CONTRACT[market].currencyCode
  ) {
    invalid(`${label} market, locale, or currency binding is invalid`)
  }
  if (
    raw.environmentId !== binding.environmentId ||
    raw.releaseId !== binding.releaseId
  ) {
    invalid(`${label} environmentId or releaseId is not aggregate-bound`)
  }
  const authorityRaw = record(raw.authority, `${label}.authority`)
  exactKeys(
    authorityRaw,
    [
      "expectedDocumentIds",
      "expectedIds",
      "projectionSha256",
      "sourceAuthoritySha256",
    ],
    `${label}.authority`
  )
  const expectedIds = parseExpectedIds(
    authorityRaw.expectedIds,
    `${label}.authority.expectedIds`
  )
  const expectedDocumentIds = parseExpectedDocumentIds(
    authorityRaw.expectedDocumentIds,
    `${label}.authority.expectedDocumentIds`
  )
  const profile = parseProfile(raw.profile, market, binding.generatedAt)
  const indexesRaw = record(raw.indexes, `${label}.indexes`)
  exactKeys(indexesRaw, SEARCH_INDEX_TYPES, `${label}.indexes`)
  const indexes = Object.fromEntries(
    SEARCH_INDEX_TYPES.map((kind) => [
      kind,
      parseIndexCandidate(indexesRaw[kind], market, kind, {
        expectedDocumentIds,
        expectedIds,
      }),
    ])
  ) as Record<SearchIndexType, FourMarketMeiliIndexCandidate>
  for (const kind of SEARCH_INDEX_TYPES) {
    if (indexes[kind].uid !== profile.indexes[kind]) {
      invalid(`${label}.${kind} index UID is not profile-bound`)
    }
  }
  const convergenceRaw = record(raw.convergence, `${label}.convergence`)
  exactKeys(
    convergenceRaw,
    [
      "completionMarkerIds",
      "failedTaskUids",
      "fullSyncTask",
      "stagingIndexUids",
      "unsettledTaskUids",
    ],
    `${label}.convergence`
  )
  const completionMarkerIds = sortedUniqueText(
    convergenceRaw.completionMarkerIds,
    `${label}.convergence.completionMarkerIds`,
    { allowEmpty: true }
  )
  const failedTaskUids = sortedUniqueIntegers(
    convergenceRaw.failedTaskUids,
    `${label}.convergence.failedTaskUids`
  )
  const stagingIndexUids = sortedUniqueText(
    convergenceRaw.stagingIndexUids,
    `${label}.convergence.stagingIndexUids`,
    { allowEmpty: true }
  )
  const unsettledTaskUids = sortedUniqueIntegers(
    convergenceRaw.unsettledTaskUids,
    `${label}.convergence.unsettledTaskUids`
  )
  if (
    completionMarkerIds.length > 0 ||
    failedTaskUids.length > 0 ||
    stagingIndexUids.length > 0 ||
    unsettledTaskUids.length > 0
  ) {
    invalid(`${label} has task, staging-index, or completion-marker residue`)
  }
  const taskRaw = record(
    convergenceRaw.fullSyncTask,
    `${label}.convergence.fullSyncTask`
  )
  exactKeys(
    taskRaw,
    ["indexUids", "status", "type", "uid"],
    `${label}.convergence.fullSyncTask`
  )
  const taskIndexUids = sortedUniqueText(
    taskRaw.indexUids,
    `${label}.convergence.fullSyncTask.indexUids`,
    { exactCount: SEARCH_INDEX_TYPES.length }
  )
  if (
    taskRaw.status !== "succeeded" ||
    taskRaw.type !== "indexSwap" ||
    !sameValue(taskIndexUids, Object.values(profile.indexes).sort())
  ) {
    invalid(`${label} must bind one succeeded exact four-index full-sync task`)
  }
  return {
    authority: {
      expectedDocumentIds,
      expectedIds,
      projectionSha256: hash(
        authorityRaw.projectionSha256,
        `${label}.authority.projectionSha256`
      ),
      sourceAuthoritySha256: hash(
        authorityRaw.sourceAuthoritySha256,
        `${label}.authority.sourceAuthoritySha256`
      ),
    },
    convergence: {
      completionMarkerIds,
      failedTaskUids,
      fullSyncTask: {
        indexUids: taskIndexUids,
        status: "succeeded",
        type: "indexSwap",
        uid: integer(taskRaw.uid, `${label}.convergence.fullSyncTask.uid`),
      },
      stagingIndexUids,
      unsettledTaskUids,
    },
    currencyCode: MARKET_CONTRACT[market].currencyCode,
    environmentId: binding.environmentId,
    indexes,
    locale: MARKET_CONTRACT[market].locale,
    market,
    profile,
    releaseId: binding.releaseId,
  }
}

const parseCandidateValue = (
  value: unknown
): FourMarketMeiliConvergenceCandidate => {
  const raw = record(value, "candidate")
  exactKeys(
    raw,
    [
      "environmentId",
      "generatedAt",
      "kind",
      "markets",
      "releaseId",
      "schemaVersion",
      "targetedProfileIds",
    ],
    "candidate"
  )
  if (raw.kind !== CANDIDATE_KIND || raw.schemaVersion !== 1) {
    invalid("candidate identity is invalid")
  }
  const environmentId = text(raw.environmentId, "candidate.environmentId")
  const generatedAt = timestamp(raw.generatedAt, "candidate.generatedAt")
  const releaseId = text(raw.releaseId, "candidate.releaseId")
  const marketsRaw = record(raw.markets, "candidate.markets")
  exactKeys(marketsRaw, FOUR_MARKET_MEILI_MARKETS, "candidate.markets")
  const markets = Object.fromEntries(
    FOUR_MARKET_MEILI_MARKETS.map((market) => [
      market,
      parseMarketCandidate(marketsRaw[market], market, {
        environmentId,
        generatedAt,
        releaseId,
      }),
    ])
  ) as Record<FourMarketMeiliMarket, FourMarketMeiliMarketCandidate>
  const targetedProfileIds = sortedUniqueText(
    raw.targetedProfileIds,
    "candidate.targetedProfileIds",
    { exactCount: FOUR_MARKET_MEILI_MARKETS.length }
  )
  const profileIds = FOUR_MARKET_MEILI_MARKETS.map(
    (market) => markets[market].profile.id
  ).sort()
  if (!sameValue(targetedProfileIds, profileIds)) {
    invalid("targetedProfileIds must exactly equal the four market profiles")
  }
  const uniqueProfileFields = [
    ["id", ...profileIds],
    [
      "key",
      ...FOUR_MARKET_MEILI_MARKETS.map((market) => markets[market].profile.key),
    ],
    [
      "domain",
      ...FOUR_MARKET_MEILI_MARKETS.map(
        (market) => markets[market].profile.domain
      ),
    ],
    [
      "sales channel",
      ...FOUR_MARKET_MEILI_MARKETS.map(
        (market) => markets[market].profile.salesChannelIds[0] as string
      ),
    ],
  ]
  for (const [label, ...values] of uniqueProfileFields) {
    if (new Set(values).size !== FOUR_MARKET_MEILI_MARKETS.length) {
      invalid(`the four profiles must have distinct ${label} values`)
    }
  }
  const indexUids = FOUR_MARKET_MEILI_MARKETS.flatMap((market) =>
    Object.values(markets[market].profile.indexes)
  )
  if (indexUids.length !== 16 || new Set(indexUids).size !== indexUids.length) {
    invalid("the four profiles must use exactly sixteen distinct index UIDs")
  }
  return {
    environmentId,
    generatedAt,
    kind: CANDIDATE_KIND,
    markets,
    releaseId,
    schemaVersion: 1,
    targetedProfileIds,
  }
}

export const parseFourMarketMeiliConvergenceCandidate = (
  contents: string
): FourMarketMeiliConvergenceCandidate => {
  let parsed: unknown
  try {
    parsed = JSON.parse(contents)
  } catch (error) {
    return invalid(
      `candidate is not valid JSON: ${error instanceof Error ? error.message : String(error)}`
    )
  }
  const candidate = parseCandidateValue(parsed)
  if (serializeFourMarketMeiliEvidence(candidate) !== contents) {
    invalid("candidate must be canonical JSON with LF")
  }
  return candidate
}

const buildIndexProof = (
  index: FourMarketMeiliIndexCandidate
): FourMarketMeiliIndexProof => ({
  documentCount: index.documentIds.length,
  documentIdsSha256: hashFourMarketMeiliValue(index.documentIds),
  entityCount: index.entityIds.length,
  entityIdsSha256: hashFourMarketMeiliValue(index.entityIds),
  settingsSha256: hashFourMarketMeiliValue(index.settings),
  uid: index.uid,
  variantCount: index.variantIds.length,
  variantIdsSha256: hashFourMarketMeiliValue(index.variantIds),
})

export const buildFourMarketMeiliConvergenceProof = (
  value: unknown
): FourMarketMeiliConvergenceProof => {
  const candidate = parseCandidateValue(value)
  const markets = Object.fromEntries(
    FOUR_MARKET_MEILI_MARKETS.map((market) => {
      const evidence = candidate.markets[market]
      return [
        market,
        {
          ...evidence,
          indexProofs: Object.fromEntries(
            SEARCH_INDEX_TYPES.map((kind) => [
              kind,
              buildIndexProof(evidence.indexes[kind]),
            ])
          ) as Record<SearchIndexType, FourMarketMeiliIndexProof>,
        },
      ]
    })
  ) as Record<FourMarketMeiliMarket, FourMarketMeiliMarketProof>
  const profileIds = [...candidate.targetedProfileIds]
  const indexUids = FOUR_MARKET_MEILI_MARKETS.flatMap((market) =>
    Object.values(markets[market].profile.indexes)
  ).sort()
  return {
    aggregate: {
      indexUidCount: 16,
      indexUidsSha256: hashFourMarketMeiliValue(indexUids),
      marketEvidenceSha256: hashFourMarketMeiliValue(markets),
      profileCount: 4,
      profileIdsSha256: hashFourMarketMeiliValue(profileIds),
      sharedIndexUidCount: 0,
      state: "converged",
      targetedProfileCount: 4,
    },
    environmentId: candidate.environmentId,
    generatedAt: candidate.generatedAt,
    kind: PROOF_KIND,
    markets,
    releaseId: candidate.releaseId,
    schemaVersion: 1,
    targetedProfileIds: profileIds,
  }
}

export const parseFourMarketMeiliConvergenceProof = (
  contents: string
): FourMarketMeiliConvergenceProof => {
  let parsed: unknown
  try {
    parsed = JSON.parse(contents)
  } catch (error) {
    return invalid(
      `proof is not valid JSON: ${error instanceof Error ? error.message : String(error)}`
    )
  }
  const raw = record(parsed, "proof")
  exactKeys(
    raw,
    [
      "aggregate",
      "environmentId",
      "generatedAt",
      "kind",
      "markets",
      "releaseId",
      "schemaVersion",
      "targetedProfileIds",
    ],
    "proof"
  )
  if (raw.kind !== PROOF_KIND || raw.schemaVersion !== 1) {
    invalid("proof identity is invalid")
  }
  const proofMarketsRaw = record(raw.markets, "proof.markets")
  exactKeys(proofMarketsRaw, FOUR_MARKET_MEILI_MARKETS, "proof.markets")
  const candidateMarkets = Object.fromEntries(
    FOUR_MARKET_MEILI_MARKETS.map((market) => {
      const proofMarket = record(
        proofMarketsRaw[market],
        `proof.markets.${market}`
      )
      exactKeys(
        proofMarket,
        [
          "authority",
          "convergence",
          "currencyCode",
          "environmentId",
          "indexes",
          "indexProofs",
          "locale",
          "market",
          "profile",
          "releaseId",
        ],
        `proof.markets.${market}`
      )
      const { indexProofs: _indexProofs, ...candidateMarket } = proofMarket
      return [market, candidateMarket]
    })
  )
  const rebuilt = buildFourMarketMeiliConvergenceProof({
    environmentId: raw.environmentId,
    generatedAt: raw.generatedAt,
    kind: CANDIDATE_KIND,
    markets: candidateMarkets,
    releaseId: raw.releaseId,
    schemaVersion: 1,
    targetedProfileIds: raw.targetedProfileIds,
  })
  if (!sameValue(rebuilt, parsed)) {
    invalid("proof derived hashes or aggregate invariants are invalid")
  }
  if (serializeFourMarketMeiliEvidence(rebuilt) !== contents) {
    invalid("proof must be canonical JSON with LF")
  }
  return rebuilt
}

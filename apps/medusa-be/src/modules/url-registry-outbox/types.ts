export const URL_REGISTRY_OUTBOX_MARKETS = ["sk", "cz", "hu", "ro"] as const

export type UrlRegistryOutboxMarket =
  (typeof URL_REGISTRY_OUTBOX_MARKETS)[number]

export const PRODUCT_LIFECYCLE_REASONS = [
  "created",
  "updated",
  "channel-linked",
  "channel-unlinked",
  "deleted",
] as const

export type ProductLifecycleReason = (typeof PRODUCT_LIFECYCLE_REASONS)[number]

export type ProductPublicationAssignment = Readonly<{
  publicationStatus: "draft" | "published"
  publicSlug: string
  salesChannelId: string
}>

export type ProductLifecycleMarketAssignment = Readonly<{
  assignment: ProductPublicationAssignment | null
  marketCode: UrlRegistryOutboxMarket
  sourceVersion: string
}>

export type ProductLifecycleEventTrace = Readonly<{
  stepIdempotencyKey?: string
  transactionId?: string
  workflowId?: string
}>

export type ProductLifecycleEventPayloadV1 = Readonly<{
  assignment: ProductPublicationAssignment | null
  changeType: "delete" | "reconcile"
  productId: string
  reason: ProductLifecycleReason
  schemaVersion: 1
  sourceVersion: string
  trace?: ProductLifecycleEventTrace
}>

export type NormalizedProductLifecycleEvent = Readonly<{
  affectedMarketCodes: readonly UrlRegistryOutboxMarket[]
  eventId: string
  occurredAt: string
  payloadByMarket: Readonly<
    Record<UrlRegistryOutboxMarket, ProductLifecycleEventPayloadV1>
  >
  productId: string
  source: "medusa"
}>

const INPUT_KEYS = new Set([
  "affectedMarketCodes",
  "eventId",
  "marketAssignments",
  "occurredAt",
  "productId",
  "reason",
  "trace",
])
const TRACE_KEYS = new Set([
  "stepIdempotencyKey",
  "transactionId",
  "workflowId",
])
const MARKET_SET = new Set<string>(URL_REGISTRY_OUTBOX_MARKETS)
const REASON_SET = new Set<string>(PRODUCT_LIFECYCLE_REASONS)
const MAX_IDENTIFIER_LENGTH = 255
const PRINTABLE_ASCII = /^[\x21-\x7e]+$/

export class UrlRegistryOutboxInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "UrlRegistryOutboxInputError"
  }
}

const asRecord = (value: unknown, label: string): Record<string, unknown> => {
  if (!(value && typeof value === "object" && !Array.isArray(value))) {
    throw new UrlRegistryOutboxInputError(`${label} must be an object`)
  }
  return value as Record<string, unknown>
}

const assertKnownKeys = (
  value: Record<string, unknown>,
  keys: ReadonlySet<string>,
  label: string
) => {
  const unexpected = Object.keys(value).find((key) => !keys.has(key))
  if (unexpected) {
    throw new UrlRegistryOutboxInputError(
      `${label} contains unexpected field ${unexpected}`
    )
  }
}

const identifier = (value: unknown, label: string) => {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAX_IDENTIFIER_LENGTH ||
    !PRINTABLE_ASCII.test(value)
  ) {
    throw new UrlRegistryOutboxInputError(`${label} is invalid`)
  }
  return value
}

const trace = (value: unknown): ProductLifecycleEventTrace | undefined => {
  if (value === undefined) {
    return
  }
  const record = asRecord(value, "trace")
  assertKnownKeys(record, TRACE_KEYS, "trace")
  const normalized = Object.fromEntries(
    [...TRACE_KEYS]
      .filter((key) => record[key] !== undefined)
      .map((key) => [key, identifier(record[key], `trace.${key}`)])
  ) as ProductLifecycleEventTrace
  return Object.keys(normalized).length ? normalized : undefined
}

const markets = (value: unknown): readonly UrlRegistryOutboxMarket[] => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new UrlRegistryOutboxInputError(
      "affectedMarketCodes must be a non-empty array"
    )
  }
  const unique = new Set<UrlRegistryOutboxMarket>()
  for (const market of value) {
    if (typeof market !== "string" || !MARKET_SET.has(market)) {
      throw new UrlRegistryOutboxInputError("affectedMarketCodes is invalid")
    }
    unique.add(market as UrlRegistryOutboxMarket)
  }
  return [...unique].sort()
}

const timestamp = (value: unknown) => {
  if (typeof value !== "string") {
    throw new UrlRegistryOutboxInputError("occurredAt is invalid")
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new UrlRegistryOutboxInputError("occurredAt is invalid")
  }
  return parsed.toISOString()
}

const ASSIGNMENT_KEYS = new Set([
  "publicationStatus",
  "publicSlug",
  "salesChannelId",
])
const MARKET_ASSIGNMENT_KEYS = new Set([
  "assignment",
  "marketCode",
  "sourceVersion",
])
const PUBLIC_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const publicationAssignment = (
  value: unknown,
  label: string
): ProductPublicationAssignment | null => {
  if (value === null) {
    return null
  }
  const record = asRecord(value, label)
  assertKnownKeys(record, ASSIGNMENT_KEYS, label)
  if (
    Object.keys(record).length !== ASSIGNMENT_KEYS.size ||
    (record.publicationStatus !== "draft" &&
      record.publicationStatus !== "published") ||
    typeof record.publicSlug !== "string" ||
    record.publicSlug.length > 200 ||
    !PUBLIC_SLUG.test(record.publicSlug)
  ) {
    throw new UrlRegistryOutboxInputError(`${label} is invalid`)
  }
  return {
    publicationStatus: record.publicationStatus,
    publicSlug: record.publicSlug,
    salesChannelId: identifier(
      record.salesChannelId,
      `${label}.salesChannelId`
    ),
  }
}

const marketAssignments = (
  value: unknown,
  affectedMarkets: readonly UrlRegistryOutboxMarket[]
) => {
  if (!Array.isArray(value) || value.length !== affectedMarkets.length) {
    throw new UrlRegistryOutboxInputError("marketAssignments is invalid")
  }
  const result = {} as Record<
    UrlRegistryOutboxMarket,
    ProductLifecycleMarketAssignment
  >
  for (const [index, candidate] of value.entries()) {
    const record = asRecord(candidate, `marketAssignments[${index}]`)
    assertKnownKeys(
      record,
      MARKET_ASSIGNMENT_KEYS,
      `marketAssignments[${index}]`
    )
    if (Object.keys(record).length !== MARKET_ASSIGNMENT_KEYS.size) {
      throw new UrlRegistryOutboxInputError(
        `marketAssignments[${index}] is invalid`
      )
    }
    const marketCode = record.marketCode
    if (typeof marketCode !== "string" || !MARKET_SET.has(marketCode)) {
      throw new UrlRegistryOutboxInputError(
        `marketAssignments[${index}].marketCode is invalid`
      )
    }
    if (result[marketCode as UrlRegistryOutboxMarket]) {
      throw new UrlRegistryOutboxInputError(
        "marketAssignments contains duplicate markets"
      )
    }
    result[marketCode as UrlRegistryOutboxMarket] = {
      assignment: publicationAssignment(
        record.assignment,
        `marketAssignments[${index}].assignment`
      ),
      marketCode: marketCode as UrlRegistryOutboxMarket,
      sourceVersion: identifier(
        record.sourceVersion,
        `marketAssignments[${index}].sourceVersion`
      ),
    }
  }
  if (affectedMarkets.some((market) => !result[market])) {
    throw new UrlRegistryOutboxInputError(
      "marketAssignments does not match affectedMarketCodes"
    )
  }
  return result
}

export const normalizeProductLifecycleEventInput = (
  input: unknown
): NormalizedProductLifecycleEvent => {
  const record = asRecord(input, "input")
  assertKnownKeys(record, INPUT_KEYS, "input")
  const reason = record.reason
  if (typeof reason !== "string" || !REASON_SET.has(reason)) {
    throw new UrlRegistryOutboxInputError("reason is invalid")
  }
  const productId = identifier(record.productId, "productId")
  const normalizedTrace = trace(record.trace)

  const affectedMarketCodes = markets(record.affectedMarketCodes)
  const assignments = marketAssignments(
    record.marketAssignments,
    affectedMarketCodes
  )
  if (
    reason === "deleted" &&
    affectedMarketCodes.some(
      (market) => assignments[market].assignment !== null
    )
  ) {
    throw new UrlRegistryOutboxInputError(
      "deleted lifecycle events cannot carry publication assignments"
    )
  }
  const payloadByMarket = Object.fromEntries(
    affectedMarketCodes.map((market) => [
      market,
      {
        assignment: assignments[market].assignment,
        changeType: reason === "deleted" ? "delete" : "reconcile",
        productId,
        reason: reason as ProductLifecycleReason,
        schemaVersion: 1 as const,
        sourceVersion: assignments[market].sourceVersion,
        ...(normalizedTrace ? { trace: normalizedTrace } : {}),
      },
    ])
  ) as Record<UrlRegistryOutboxMarket, ProductLifecycleEventPayloadV1>

  return {
    affectedMarketCodes,
    eventId: identifier(record.eventId, "eventId"),
    occurredAt: timestamp(record.occurredAt),
    payloadByMarket,
    productId,
    source: "medusa",
  }
}

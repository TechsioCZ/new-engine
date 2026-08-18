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

export type ProductLifecycleEventTrace = Readonly<{
  stepIdempotencyKey?: string
  transactionId?: string
  workflowId?: string
}>

export type ProductLifecycleEventPayloadV1 = Readonly<{
  changeType: "delete" | "reconcile"
  productId: string
  reason: ProductLifecycleReason
  schemaVersion: 1
  trace?: ProductLifecycleEventTrace
}>

export type NormalizedProductLifecycleEvent = Readonly<{
  affectedMarketCodes: readonly UrlRegistryOutboxMarket[]
  eventId: string
  occurredAt: string
  payload: ProductLifecycleEventPayloadV1
  productId: string
  source: "medusa"
}>

const INPUT_KEYS = new Set([
  "affectedMarketCodes",
  "eventId",
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

  return {
    affectedMarketCodes: markets(record.affectedMarketCodes),
    eventId: identifier(record.eventId, "eventId"),
    occurredAt: timestamp(record.occurredAt),
    payload: {
      changeType: reason === "deleted" ? "delete" : "reconcile",
      productId,
      reason: reason as ProductLifecycleReason,
      schemaVersion: 1,
      ...(normalizedTrace ? { trace: normalizedTrace } : {}),
    },
    productId,
    source: "medusa",
  }
}

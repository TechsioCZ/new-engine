const MARKETS = ["sk", "cz", "hu", "ro"] as const
const REASONS = [
  "created",
  "updated",
  "channel-linked",
  "channel-unlinked",
  "deleted",
] as const
const CHANGE_TYPES = ["delete", "reconcile"] as const
const DELIVERY_KEYS = [
  "schemaVersion",
  "outboxEventId",
  "eventId",
  "envelopeFingerprint",
  "source",
  "entityKind",
  "entityId",
  "marketCode",
  "streamSequence",
  "changeType",
  "occurredAt",
  "payload",
] as const
const PAYLOAD_KEYS = [
  "schemaVersion",
  "productId",
  "reason",
  "changeType",
  "trace",
] as const
const REQUIRED_PAYLOAD_KEYS = PAYLOAD_KEYS.slice(0, -1)
const TRACE_KEYS = [
  "stepIdempotencyKey",
  "transactionId",
  "workflowId",
] as const
const VISIBLE_ASCII = /^[\x21-\x7e]{1,255}$/
const SHA256 = /^sha256:[0-9a-f]{64}$/

export type ProductLifecycleChangeType = (typeof CHANGE_TYPES)[number]
export type ProductLifecycleReason = (typeof REASONS)[number]
export type ProductLifecycleTraceV1 = Readonly<{
  stepIdempotencyKey?: string
  transactionId?: string
  workflowId?: string
}>
export type ProductLifecyclePayloadV1 = Readonly<{
  schemaVersion: 1
  productId: string
  reason: ProductLifecycleReason
  changeType: ProductLifecycleChangeType
  trace?: ProductLifecycleTraceV1
}>
export type ProductLifecycleDeliveryV1 = Readonly<{
  schemaVersion: 1
  outboxEventId: string
  eventId: string
  envelopeFingerprint: `sha256:${string}`
  source: "medusa"
  entityKind: "product"
  entityId: string
  marketCode: (typeof MARKETS)[number]
  streamSequence: number
  changeType: ProductLifecycleChangeType
  occurredAt: string
  payload: ProductLifecyclePayloadV1
}>

export class ProductLifecycleDeliveryValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ProductLifecycleDeliveryValidationError"
  }
}

type UnknownRecord = Record<string, unknown>

const exactRecord = (
  value: unknown,
  allowedKeys: readonly string[],
  requiredKeys: readonly string[],
  label: string
): UnknownRecord => {
  if (!(value && typeof value === "object" && !Array.isArray(value))) {
    throw new ProductLifecycleDeliveryValidationError(
      `${label} must be an object`
    )
  }
  const record = value as UnknownRecord
  const unexpected = Object.keys(record).find(
    (key) => !allowedKeys.includes(key)
  )
  const missing = requiredKeys.find((key) => !Object.hasOwn(record, key))
  if (unexpected || missing) {
    throw new ProductLifecycleDeliveryValidationError(
      unexpected
        ? `${label} contains unexpected field ${unexpected}`
        : `${label} is missing field ${missing}`
    )
  }
  return record
}

const identifier = (value: unknown, label: string): string => {
  if (typeof value !== "string" || !VISIBLE_ASCII.test(value)) {
    throw new ProductLifecycleDeliveryValidationError(`${label} is invalid`)
  }
  return value
}

const oneOf = <Value extends string>(
  value: unknown,
  allowed: readonly Value[],
  label: string
): Value => {
  if (typeof value !== "string" || !allowed.includes(value as Value)) {
    throw new ProductLifecycleDeliveryValidationError(`${label} is invalid`)
  }
  return value as Value
}

const trace = (value: unknown): ProductLifecycleTraceV1 | undefined => {
  if (value === undefined) {
    return
  }
  const record = exactRecord(value, TRACE_KEYS, [], "payload.trace")
  const presentKeys = TRACE_KEYS.filter((key) => Object.hasOwn(record, key))
  if (presentKeys.length === 0) {
    throw new ProductLifecycleDeliveryValidationError(
      "payload.trace must not be empty"
    )
  }
  return Object.fromEntries(
    presentKeys.map((key) => [
      key,
      identifier(record[key], `payload.trace.${key}`),
    ])
  )
}

const changeTypeForReason = (
  reason: ProductLifecycleReason
): ProductLifecycleChangeType => (reason === "deleted" ? "delete" : "reconcile")

const parsePayload = (value: unknown): ProductLifecyclePayloadV1 => {
  const record = exactRecord(
    value,
    PAYLOAD_KEYS,
    REQUIRED_PAYLOAD_KEYS,
    "payload"
  )
  if (record.schemaVersion !== 1) {
    throw new ProductLifecycleDeliveryValidationError(
      "payload.schemaVersion is invalid"
    )
  }
  const reason = oneOf(record.reason, REASONS, "payload.reason")
  const changeType = oneOf(
    record.changeType,
    CHANGE_TYPES,
    "payload.changeType"
  )
  const parsedTrace = trace(record.trace)
  if (changeType !== changeTypeForReason(reason)) {
    throw new ProductLifecycleDeliveryValidationError(
      "payload reason does not match changeType"
    )
  }
  return {
    schemaVersion: 1,
    productId: identifier(record.productId, "payload.productId"),
    reason,
    changeType,
    ...(parsedTrace === undefined ? {} : { trace: parsedTrace }),
  }
}

const canonicalTimestamp = (value: unknown): string => {
  if (typeof value !== "string") {
    throw new ProductLifecycleDeliveryValidationError("occurredAt is invalid")
  }
  const timestamp = new Date(value)
  if (Number.isNaN(timestamp.getTime()) || timestamp.toISOString() !== value) {
    throw new ProductLifecycleDeliveryValidationError("occurredAt is invalid")
  }
  return value
}

export const parseProductLifecycleDeliveryV1 = (
  input: unknown
): ProductLifecycleDeliveryV1 => {
  const record = exactRecord(input, DELIVERY_KEYS, DELIVERY_KEYS, "delivery")
  if (
    record.schemaVersion !== 1 ||
    record.source !== "medusa" ||
    record.entityKind !== "product"
  ) {
    throw new ProductLifecycleDeliveryValidationError(
      "delivery fixed fields are invalid"
    )
  }
  const payload = parsePayload(record.payload)
  const entityId = identifier(record.entityId, "entityId")
  const changeType = oneOf(record.changeType, CHANGE_TYPES, "changeType")
  if (entityId !== payload.productId || changeType !== payload.changeType) {
    throw new ProductLifecycleDeliveryValidationError(
      "delivery fields do not match payload"
    )
  }
  if (
    typeof record.envelopeFingerprint !== "string" ||
    !SHA256.test(record.envelopeFingerprint)
  ) {
    throw new ProductLifecycleDeliveryValidationError(
      "envelopeFingerprint is invalid"
    )
  }
  if (
    !(
      Number.isSafeInteger(record.streamSequence) &&
      Number(record.streamSequence) > 0
    )
  ) {
    throw new ProductLifecycleDeliveryValidationError(
      "streamSequence is invalid"
    )
  }
  return {
    schemaVersion: 1,
    outboxEventId: identifier(record.outboxEventId, "outboxEventId"),
    eventId: identifier(record.eventId, "eventId"),
    envelopeFingerprint: record.envelopeFingerprint as `sha256:${string}`,
    source: "medusa",
    entityKind: "product",
    entityId,
    marketCode: oneOf(record.marketCode, MARKETS, "marketCode"),
    streamSequence: record.streamSequence as number,
    changeType,
    occurredAt: canonicalTimestamp(record.occurredAt),
    payload,
  }
}

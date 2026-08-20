import type { ProductPublicationAssignmentV1 } from "./product-lifecycle-parser"

const MARKETS = ["sk", "cz", "hu", "ro"] as const
export const CATALOG_LIFECYCLE_ENTITY_KINDS = [
  "category",
  "brand",
  "collection",
] as const
const REASONS = [
  "assignment-upsert",
  "assignment-backfill",
] as const
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
  "entityKind",
  "entityId",
  "reason",
  "changeType",
  "assignment",
  "sourceVersion",
  "trace",
] as const
const TRACE_KEYS = [
  "stepIdempotencyKey",
  "transactionId",
  "workflowId",
] as const
const ASSIGNMENT_KEYS = [
  "publicationStatus",
  "publicSlug",
  "salesChannelId",
] as const
const VISIBLE_ASCII = /^[\x21-\x7e]{1,255}$/
const SHA256 = /^sha256:[0-9a-f]{64}$/
const PUBLIC_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export type CatalogLifecycleEntityKind =
  (typeof CATALOG_LIFECYCLE_ENTITY_KINDS)[number]
export type CatalogLifecycleReason = (typeof REASONS)[number]
export type CatalogLifecyclePayloadV1 = Readonly<{
  assignment: ProductPublicationAssignmentV1 | null
  changeType: "reconcile"
  entityId: string
  entityKind: CatalogLifecycleEntityKind
  reason: CatalogLifecycleReason
  schemaVersion: 1
  sourceVersion: string
  trace?: Readonly<{
    stepIdempotencyKey?: string
    transactionId?: string
    workflowId?: string
  }>
}>
export type CatalogLifecycleDeliveryV1 = Readonly<{
  changeType: "reconcile"
  entityId: string
  entityKind: CatalogLifecycleEntityKind
  envelopeFingerprint: `sha256:${string}`
  eventId: string
  marketCode: (typeof MARKETS)[number]
  occurredAt: string
  outboxEventId: string
  payload: CatalogLifecyclePayloadV1
  schemaVersion: 1
  source: "medusa"
  streamSequence: number
}>

export class CatalogLifecycleDeliveryValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CatalogLifecycleDeliveryValidationError"
  }
}

type UnknownRecord = Record<string, unknown>

const exactRecord = (
  value: unknown,
  allowed: readonly string[],
  required: readonly string[],
  label: string
): UnknownRecord => {
  if (!(value && typeof value === "object" && !Array.isArray(value))) {
    throw new CatalogLifecycleDeliveryValidationError(`${label} is invalid`)
  }
  const record = value as UnknownRecord
  const unexpected = Object.keys(record).find((key) => !allowed.includes(key))
  const missing = required.find((key) => !Object.hasOwn(record, key))
  if (unexpected || missing) {
    throw new CatalogLifecycleDeliveryValidationError(`${label} is invalid`)
  }
  return record
}

const identifier = (value: unknown, label: string): string => {
  if (typeof value !== "string" || !VISIBLE_ASCII.test(value)) {
    throw new CatalogLifecycleDeliveryValidationError(`${label} is invalid`)
  }
  return value
}

const oneOf = <Value extends string>(
  value: unknown,
  allowed: readonly Value[],
  label: string
): Value => {
  if (typeof value !== "string" || !allowed.includes(value as Value)) {
    throw new CatalogLifecycleDeliveryValidationError(`${label} is invalid`)
  }
  return value as Value
}

const parseAssignment = (
  value: unknown
): ProductPublicationAssignmentV1 | null => {
  if (value === null) {
    return null
  }
  const record = exactRecord(
    value,
    ASSIGNMENT_KEYS,
    ASSIGNMENT_KEYS,
    "payload.assignment"
  )
  if (
    (record.publicationStatus !== "draft" &&
      record.publicationStatus !== "published") ||
    typeof record.publicSlug !== "string" ||
    record.publicSlug.length > 200 ||
    !PUBLIC_SLUG.test(record.publicSlug)
  ) {
    throw new CatalogLifecycleDeliveryValidationError(
      "payload.assignment is invalid"
    )
  }
  return {
    publicationStatus: record.publicationStatus,
    publicSlug: record.publicSlug,
    salesChannelId: identifier(
      record.salesChannelId,
      "payload.assignment.salesChannelId"
    ),
  }
}

const parseTrace = (value: unknown) => {
  if (value === undefined) {
    return
  }
  const record = exactRecord(value, TRACE_KEYS, [], "payload.trace")
  const present = TRACE_KEYS.filter((key) => Object.hasOwn(record, key))
  if (present.length === 0) {
    throw new CatalogLifecycleDeliveryValidationError(
      "payload.trace is invalid"
    )
  }
  return Object.fromEntries(
    present.map((key) => [key, identifier(record[key], `payload.trace.${key}`)])
  )
}

const timestamp = (value: unknown): string => {
  if (typeof value !== "string") {
    throw new CatalogLifecycleDeliveryValidationError("occurredAt is invalid")
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    throw new CatalogLifecycleDeliveryValidationError("occurredAt is invalid")
  }
  return value
}

export const parseCatalogLifecycleDeliveryV1 = (
  input: unknown
): CatalogLifecycleDeliveryV1 => {
  const record = exactRecord(input, DELIVERY_KEYS, DELIVERY_KEYS, "delivery")
  const entityKind = oneOf(
    record.entityKind,
    CATALOG_LIFECYCLE_ENTITY_KINDS,
    "entityKind"
  )
  const entityId = identifier(record.entityId, "entityId")
  const payloadRecord = exactRecord(
    record.payload,
    PAYLOAD_KEYS,
    PAYLOAD_KEYS.slice(0, -1),
    "payload"
  )
  const payloadKind = oneOf(
    payloadRecord.entityKind,
    CATALOG_LIFECYCLE_ENTITY_KINDS,
    "payload.entityKind"
  )
  const payloadId = identifier(payloadRecord.entityId, "payload.entityId")
  const parsedTrace = parseTrace(payloadRecord.trace)
  if (
    record.schemaVersion !== 1 ||
    record.source !== "medusa" ||
    record.changeType !== "reconcile" ||
    payloadRecord.schemaVersion !== 1 ||
    payloadRecord.changeType !== "reconcile" ||
    entityKind !== payloadKind ||
    entityId !== payloadId
  ) {
    throw new CatalogLifecycleDeliveryValidationError(
      "delivery fields do not match payload"
    )
  }
  if (
    typeof record.envelopeFingerprint !== "string" ||
    !SHA256.test(record.envelopeFingerprint) ||
    !(
      Number.isSafeInteger(record.streamSequence) &&
      Number(record.streamSequence) > 0
    )
  ) {
    throw new CatalogLifecycleDeliveryValidationError(
      "delivery envelope is invalid"
    )
  }
  return {
    changeType: "reconcile",
    entityId,
    entityKind,
    envelopeFingerprint: record.envelopeFingerprint as `sha256:${string}`,
    eventId: identifier(record.eventId, "eventId"),
    marketCode: oneOf(record.marketCode, MARKETS, "marketCode"),
    occurredAt: timestamp(record.occurredAt),
    outboxEventId: identifier(record.outboxEventId, "outboxEventId"),
    payload: {
      assignment: parseAssignment(payloadRecord.assignment),
      changeType: "reconcile",
      entityId,
      entityKind,
      reason: oneOf(payloadRecord.reason, REASONS, "payload.reason"),
      schemaVersion: 1,
      sourceVersion: identifier(
        payloadRecord.sourceVersion,
        "payload.sourceVersion"
      ),
      ...(parsedTrace ? { trace: parsedTrace } : {}),
    },
    schemaVersion: 1,
    source: "medusa",
    streamSequence: record.streamSequence as number,
  }
}

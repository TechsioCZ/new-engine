import { MedusaError } from "@medusajs/framework/utils"

const MAX_BATCH_SIZE = 100
const MAX_ERROR_CODE_LENGTH = 128
const MAX_IDENTIFIER_LENGTH = 255
const MAX_LEASE_DURATION_MS = 15 * 60 * 1000
const MAX_RETRY_DELAY_MS = 24 * 60 * 60 * 1000
const MAX_WORKER_ID_LENGTH = 128
const VISIBLE_ASCII = /^[\x21-\x7e]+$/

export type UrlRegistryOutboxDeliveryOutcome =
  | "already-applied"
  | "applied"
  | "noop-stale"

export type ClaimedUrlRegistryOutboxEvent = Readonly<{
  attemptCount: number
  changeType: "delete" | "reconcile"
  claimToken: string
  claimedAt: string
  claimedBy: string
  entityId: string
  entityKind: string
  envelopeFingerprint: string
  eventId: string
  id: string
  leaseExpiresAt: string
  marketCode: "cz" | "hu" | "ro" | "sk"
  occurredAt: string
  payload: unknown
  source: string
  status: "processing"
  streamId: string
  streamSequence: number
}>

export type UrlRegistryOutboxDeliveryTransition = Readonly<{
  attemptCount: number
  id: string
  status: "delivered" | "failed" | "pending"
}>

export class UrlRegistryOutboxDeliveryInputError extends MedusaError {
  constructor(message: string) {
    super(MedusaError.Types.INVALID_DATA, message)
    this.name = "UrlRegistryOutboxDeliveryInputError"
  }
}

export class UrlRegistryOutboxClaimConflictError extends MedusaError {
  constructor() {
    super(
      MedusaError.Types.CONFLICT,
      "URL registry outbox claim is stale or no longer processing"
    )
    this.name = "UrlRegistryOutboxClaimConflictError"
  }
}

export const asRecord = (input: unknown): Record<string, unknown> => {
  if (!(input && typeof input === "object" && !Array.isArray(input))) {
    throw new UrlRegistryOutboxDeliveryInputError("input must be an object")
  }
  return input as Record<string, unknown>
}

export const assertKnownKeys = (
  input: Record<string, unknown>,
  knownKeys: ReadonlySet<string>
) => {
  const unexpected = Object.keys(input).find((key) => !knownKeys.has(key))
  if (unexpected) {
    throw new UrlRegistryOutboxDeliveryInputError(
      `input contains unexpected field ${unexpected}`
    )
  }
}

export const boundedInteger = (
  value: unknown,
  label: string,
  minimum: number,
  maximum: number
) => {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new UrlRegistryOutboxDeliveryInputError(`${label} is invalid`)
  }
  return value
}

export const identifier = (value: unknown, label: string, maximum: number) => {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maximum ||
    !VISIBLE_ASCII.test(value)
  ) {
    throw new UrlRegistryOutboxDeliveryInputError(`${label} is invalid`)
  }
  return value
}

export const instant = (value: unknown, label: string) => {
  if (
    value !== undefined &&
    !(value instanceof Date) &&
    typeof value !== "string"
  ) {
    throw new UrlRegistryOutboxDeliveryInputError(`${label} is invalid`)
  }
  const date = value === undefined ? new Date() : new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new UrlRegistryOutboxDeliveryInputError(`${label} is invalid`)
  }
  return date
}

export const plusMilliseconds = (
  date: Date,
  milliseconds: number,
  label: string
) => {
  const result = new Date(date.getTime() + milliseconds)
  if (Number.isNaN(result.getTime())) {
    throw new UrlRegistryOutboxDeliveryInputError(`${label} is invalid`)
  }
  return result
}

export const normalizeClaimInput = (input: unknown) => {
  const record = asRecord(input)
  assertKnownKeys(
    record,
    new Set(["claimedBy", "leaseDurationMs", "limit", "now"])
  )
  const now = instant(record.now, "now")
  const leaseDurationMs = boundedInteger(
    record.leaseDurationMs,
    "leaseDurationMs",
    1,
    MAX_LEASE_DURATION_MS
  )
  return {
    claimedBy: identifier(record.claimedBy, "claimedBy", MAX_WORKER_ID_LENGTH),
    leaseExpiresAt: plusMilliseconds(now, leaseDurationMs, "leaseDurationMs"),
    limit: boundedInteger(record.limit, "limit", 1, MAX_BATCH_SIZE),
    now,
  }
}

export const normalizeReclaimInput = (input: unknown) => {
  const record = asRecord(input)
  assertKnownKeys(record, new Set(["limit", "now"]))
  return {
    limit: boundedInteger(record.limit, "limit", 1, MAX_BATCH_SIZE),
    now: instant(record.now, "now"),
  }
}

export const normalizeTransitionIdentity = (
  record: Record<string, unknown>
) => ({
  claimToken: identifier(
    record.claimToken,
    "claimToken",
    MAX_IDENTIFIER_LENGTH
  ),
  id: identifier(record.id, "id", MAX_IDENTIFIER_LENGTH),
  now: instant(record.now, "now"),
})

export const normalizeErrorCode = (value: unknown) =>
  identifier(value, "errorCode", MAX_ERROR_CODE_LENGTH)

export const normalizeRetryDelay = (value: unknown) =>
  boundedInteger(value, "retryAfterMs", 0, MAX_RETRY_DELAY_MS)

export const normalizeOutcome = (
  value: unknown
): UrlRegistryOutboxDeliveryOutcome => {
  if (
    value !== "applied" &&
    value !== "already-applied" &&
    value !== "noop-stale"
  ) {
    throw new UrlRegistryOutboxDeliveryInputError("outcome is invalid")
  }
  return value
}

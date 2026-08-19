import type {
  ClaimedInvalidationOutboxEvent,
  InvalidationOutboxStore,
} from "../postgres/invalidation-outbox-store"
import type { InvalidationDeliveryAttempt } from "./invalidation-delivery-client"

export const INVALIDATION_DISPATCH_BATCH_SIZE = 20
export const INVALIDATION_DISPATCH_CONCURRENCY = 5
export const INVALIDATION_DISPATCH_LEASE_MS = 60_000
export const INVALIDATION_RETRY_MAX_MS = 3_600_000

const RETRY_BASE_MS = 5000

type DispatcherDependencies = Readonly<{
  deliver(
    event: ClaimedInvalidationOutboxEvent
  ): Promise<InvalidationDeliveryAttempt>
  logger: Readonly<{
    error(message: string): unknown
    info(message: string): unknown
  }>
  now?: () => Date
  store: InvalidationOutboxStore
  workerId: string
}>

export type InvalidationDispatchResult = Readonly<{
  claimed: number
  delivered: number
  failed: number
  reclaimed: number
  retried: number
  transitionConflicts: number
}>

export const invalidationRetryDelayMs = (
  attemptCount: number,
  retryAfterMs?: number
): number => {
  const attempt =
    Number.isSafeInteger(attemptCount) && attemptCount > 0 ? attemptCount : 1
  const exponential = Math.min(
    INVALIDATION_RETRY_MAX_MS,
    RETRY_BASE_MS * 2 ** Math.min(attempt - 1, 20)
  )
  const hinted =
    Number.isFinite(retryAfterMs) && Number(retryAfterMs) >= 0
      ? Number(retryAfterMs)
      : 0
  return Math.min(INVALIDATION_RETRY_MAX_MS, Math.max(exponential, hinted))
}

const processEvent = async (
  event: ClaimedInvalidationOutboxEvent,
  dependencies: DispatcherDependencies
): Promise<"delivered" | "failed" | "retried" | "transitionConflicts"> => {
  let attempt: InvalidationDeliveryAttempt
  try {
    attempt = await dependencies.deliver(event)
  } catch {
    attempt = { errorCode: "delivery-error", kind: "retry" }
  }
  const now = (dependencies.now ?? (() => new Date()))()
  const identity = { claimToken: event.claimToken, id: event.id, now }
  if (attempt.kind === "delivered") {
    return (await dependencies.store.markDelivered(identity))
      ? "delivered"
      : "transitionConflicts"
  }
  if (attempt.kind === "failed") {
    dependencies.logger.error(
      `URL registry invalidation dispatcher permanently failed event ${event.id} (${attempt.errorCode})`
    )
    return (await dependencies.store.fail({
      ...identity,
      errorCode: attempt.errorCode,
    }))
      ? "failed"
      : "transitionConflicts"
  }
  return (await dependencies.store.retry({
    ...identity,
    errorCode: attempt.errorCode,
    retryAfterMs: invalidationRetryDelayMs(
      event.attemptCount,
      attempt.retryAfterMs
    ),
  }))
    ? "retried"
    : "transitionConflicts"
}

export const dispatchInvalidationOutboxBatch = async (
  dependencies: DispatcherDependencies
): Promise<InvalidationDispatchResult> => {
  const cycleNow = (dependencies.now ?? (() => new Date()))()
  const reclaimed = await dependencies.store.reclaimExpired({
    batchSize: INVALIDATION_DISPATCH_BATCH_SIZE,
    leaseDurationMs: INVALIDATION_DISPATCH_LEASE_MS,
    now: cycleNow,
  })
  const claims = await dependencies.store.claim({
    batchSize: INVALIDATION_DISPATCH_BATCH_SIZE,
    now: cycleNow,
    workerId: dependencies.workerId,
  })
  const counts = {
    claimed: claims.length,
    delivered: 0,
    failed: 0,
    reclaimed,
    retried: 0,
    transitionConflicts: 0,
  }
  for (
    let offset = 0;
    offset < claims.length;
    offset += INVALIDATION_DISPATCH_CONCURRENCY
  ) {
    const settled = await Promise.allSettled(
      claims
        .slice(offset, offset + INVALIDATION_DISPATCH_CONCURRENCY)
        .map((event) => processEvent(event, dependencies))
    )
    for (const transition of settled) {
      if (transition.status === "fulfilled") {
        counts[transition.value] += 1
      } else {
        counts.transitionConflicts += 1
      }
    }
  }
  dependencies.logger.info(
    `URL registry invalidation dispatcher claimed ${counts.claimed}, delivered ${counts.delivered}, retried ${counts.retried}, failed ${counts.failed}, reclaimed ${counts.reclaimed}, conflicts ${counts.transitionConflicts}`
  )
  return counts
}

import type { ClaimedUrlRegistryOutboxEvent } from "../../modules/url-registry-outbox/delivery-state-contracts"
import {
  URL_REGISTRY_MAX_RETRY_DELAY_MS,
  type UrlRegistryDeliveryAttempt,
} from "./delivery-client"

export const URL_REGISTRY_CLAIM_BATCH_SIZE = 25
export const URL_REGISTRY_LEASE_DURATION_MS = 30_000

const RETRY_BASE_DELAY_MS = 5000

export type UrlRegistryOutboxDeliveryService = Readonly<{
  acknowledgeUrlRegistryOutboxEvent(input: unknown): Promise<unknown>
  claimUrlRegistryOutboxEvents(
    input: unknown
  ): Promise<readonly ClaimedUrlRegistryOutboxEvent[]>
  failUrlRegistryOutboxEvent(input: unknown): Promise<unknown>
  reclaimExpiredUrlRegistryOutboxEvents(input: unknown): Promise<unknown>
  retryUrlRegistryOutboxEvent(input: unknown): Promise<unknown>
}>

type DispatcherLogger = Readonly<{
  error(message: string): unknown
  info(message: string): unknown
}>

type DispatcherDependencies = Readonly<{
  deliver(
    event: ClaimedUrlRegistryOutboxEvent
  ): Promise<UrlRegistryDeliveryAttempt>
  logger: DispatcherLogger
  now?: () => Date
  service: UrlRegistryOutboxDeliveryService
  workerId: string
}>

export type UrlRegistryDispatchResult = Readonly<{
  acknowledged: number
  claimed: number
  failed: number
  retried: number
  transitionErrors: number
}>

type TransitionKind = "acknowledged" | "failed" | "retried"

export const computeUrlRegistryRetryDelayMs = (
  attemptCount: number,
  retryAfterMs?: number
): number => {
  const normalizedAttempt =
    Number.isSafeInteger(attemptCount) && attemptCount > 0 ? attemptCount : 1
  const exponential = Math.min(
    URL_REGISTRY_MAX_RETRY_DELAY_MS,
    RETRY_BASE_DELAY_MS * 2 ** Math.min(normalizedAttempt - 1, 20)
  )
  const hint =
    Number.isFinite(retryAfterMs) && Number(retryAfterMs) >= 0
      ? Number(retryAfterMs)
      : 0
  return Math.min(URL_REGISTRY_MAX_RETRY_DELAY_MS, Math.max(exponential, hint))
}

const transitionClaim = async (
  event: ClaimedUrlRegistryOutboxEvent,
  attempt: UrlRegistryDeliveryAttempt,
  dependencies: DispatcherDependencies
): Promise<TransitionKind> => {
  const now = (dependencies.now ?? (() => new Date()))()
  const identity = {
    claimToken: event.claimToken,
    id: event.id,
    now,
  }
  if (attempt.kind === "acknowledge") {
    await dependencies.service.acknowledgeUrlRegistryOutboxEvent({
      ...identity,
      outcome: attempt.outcome,
    })
    return "acknowledged"
  }
  if (attempt.kind === "fail") {
    dependencies.logger.error(
      `URL registry dispatcher: permanently failed outbox event ${event.id} (${event.marketCode}, ${attempt.errorCode})`
    )
    await dependencies.service.failUrlRegistryOutboxEvent({
      ...identity,
      errorCode: attempt.errorCode,
    })
    return "failed"
  }
  await dependencies.service.retryUrlRegistryOutboxEvent({
    ...identity,
    errorCode: attempt.errorCode,
    retryAfterMs: computeUrlRegistryRetryDelayMs(
      event.attemptCount,
      attempt.retryAfterMs
    ),
  })
  return "retried"
}

const processClaim = async (
  event: ClaimedUrlRegistryOutboxEvent,
  dependencies: DispatcherDependencies
): Promise<TransitionKind> => {
  let attempt: UrlRegistryDeliveryAttempt
  try {
    attempt = await dependencies.deliver(event)
  } catch {
    attempt = { errorCode: "delivery-error", kind: "retry" }
  }
  return await transitionClaim(event, attempt, dependencies)
}

export const dispatchUrlRegistryOutboxBatch = async (
  dependencies: DispatcherDependencies
): Promise<UrlRegistryDispatchResult> => {
  const cycleNow = (dependencies.now ?? (() => new Date()))()
  await dependencies.service.reclaimExpiredUrlRegistryOutboxEvents({
    limit: URL_REGISTRY_CLAIM_BATCH_SIZE,
    now: cycleNow,
  })
  const claims = await dependencies.service.claimUrlRegistryOutboxEvents({
    claimedBy: dependencies.workerId,
    leaseDurationMs: URL_REGISTRY_LEASE_DURATION_MS,
    limit: URL_REGISTRY_CLAIM_BATCH_SIZE,
    now: cycleNow,
  })

  const settled = await Promise.allSettled(
    claims.map((event) => processClaim(event, dependencies))
  )
  const result = {
    acknowledged: 0,
    claimed: claims.length,
    failed: 0,
    retried: 0,
    transitionErrors: 0,
  }
  for (let index = 0; index < settled.length; index += 1) {
    const transition = settled[index]
    if (transition?.status === "fulfilled") {
      result[transition.value] += 1
      continue
    }
    result.transitionErrors += 1
    dependencies.logger.error(
      `URL registry dispatcher: transition failed for outbox event ${claims[index]?.id ?? "unknown"}`
    )
  }
  dependencies.logger.info(
    `URL registry dispatcher: claimed ${result.claimed}, acknowledged ${result.acknowledged}, retried ${result.retried}, failed ${result.failed}, transition errors ${result.transitionErrors}`
  )
  return result
}

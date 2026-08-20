// Strict runtime contract for the "herbatika-ro-urlr-convergence-proof"
// artifact. Field list, nesting, and cross-field invariants mirror
// `validateUrlRegistryProof` in `./cutover-receipt.mjs` (the release gate's
// own consumer of this artifact). That function is not exported, so this
// module re-derives the same checks instead of loosening them; if the gate's
// shape changes, update both together. Canonical byte serialization reuses
// the gate's own `canonicalCutoverValue` so output is guaranteed to satisfy
// the gate's byte-exact canonical-JSON check.
import { canonicalCutoverValue } from "./cutover-receipt.mjs"

const SHA256_PATTERN = /^[a-f0-9]{64}$/

export type UrlrConvergenceProof = Readonly<{
  boundary: Readonly<{
    expectedEntityCount: number
    expectedEntityKeysHash: string
    expectedEventCount: number
    expectedEventIdsHash: string
    expectedStreamCount: number
    expectedStreamKeysHash: string
  }>
  catalogScopeSha256: string
  generatedAt: string
  kind: "herbatika-ro-urlr-convergence-proof"
  market: "ro"
  outbox: Readonly<{
    blockedStreamCount: number
    deliveredCount: number
    deliveryOutcomeCounts: Readonly<{
      alreadyApplied: number
      applied: number
      noopStale: number
    }>
    expectedIdsObservedHash: string
    failedCount: number
    lastErrorCodeCounts: Readonly<Record<string, number>>
    pendingFutureCount: number
    pendingReadyCount: number
    processingCount: number
    processingExpiredCount: number
    statusCounts: Readonly<{
      delivered: number
      failed: number
      pending: number
      processing: number
    }>
  }>
  releaseId: string
  routeProjection: Readonly<{
    activeEntityCount: number
    activeEntityKeysHash: string
    assignmentSetHash: string
    extraCount: number
    missingCount: number
  }>
  schemaVersion: 1
  staticTaxonomyConvergenceSha256: string
  streams: Readonly<{
    count: number
    keysHash: string
    notDeliveredThroughLastSequenceCount: number
    sequenceStateHash: string
  }>
  urlrReceipts: Readonly<{
    actionCounts: Readonly<Record<string, number>>
    count: number
    cursorMismatchCount: number
    identityHash: string
    missingCommandBindingCount: number
  }>
}>

export type UrlrConvergenceProofBinding = Readonly<{
  catalogScopeSha256: string
  releaseId: string
  staticTaxonomyConvergenceSha256: string
}>

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value))

const exactRecord = (
  value: unknown,
  expectedKeys: readonly string[],
  label: string
): Record<string, unknown> => {
  if (
    !isRecord(value) ||
    JSON.stringify(Object.keys(value).sort()) !==
      JSON.stringify([...expectedKeys].sort())
  ) {
    throw new Error(`urlr-convergence: ${label} has invalid fields`)
  }
  return value
}

const sha256Value = (value: unknown, label: string): string => {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    throw new Error(`urlr-convergence: ${label} must be a lowercase SHA-256`)
  }
  return value
}

const nonnegativeInteger = (value: unknown, label: string): number => {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new Error(`urlr-convergence: ${label} must be a nonnegative integer`)
  }
  return value as number
}

const nonblank = (value: unknown, label: string): string => {
  if (typeof value !== "string" || !value.trim() || value.trim() !== value) {
    throw new Error(`urlr-convergence: ${label} must be a nonblank string`)
  }
  return value
}

const timestampValue = (value: unknown, label: string): string => {
  const parsed = new Date(typeof value === "string" ? value : "")
  if (
    typeof value !== "string" ||
    Number.isNaN(parsed.valueOf()) ||
    parsed.toISOString() !== value
  ) {
    throw new Error(
      `urlr-convergence: ${label} must be an ISO-8601 UTC timestamp`
    )
  }
  return value
}

/**
 * Parses and cross-validates a URLR convergence proof against the exact
 * field list and zero-drift invariants enforced by the release gate. Throws
 * on any missing/extra field, non-zero pending/processing/failed/blocked
 * counter, cursor/receipt mismatch, or route projection drift.
 */
export const parseUrlrConvergenceProof = (
  value: unknown,
  binding: UrlrConvergenceProofBinding
): UrlrConvergenceProof => {
  const proof = exactRecord(
    value,
    [
      "boundary",
      "catalogScopeSha256",
      "generatedAt",
      "kind",
      "market",
      "outbox",
      "releaseId",
      "routeProjection",
      "schemaVersion",
      "staticTaxonomyConvergenceSha256",
      "streams",
      "urlrReceipts",
    ],
    "URLR convergence proof"
  )
  const boundary = exactRecord(
    proof.boundary,
    [
      "expectedEntityCount",
      "expectedEntityKeysHash",
      "expectedEventCount",
      "expectedEventIdsHash",
      "expectedStreamCount",
      "expectedStreamKeysHash",
    ],
    "URLR boundary"
  )
  const outbox = exactRecord(
    proof.outbox,
    [
      "blockedStreamCount",
      "deliveredCount",
      "deliveryOutcomeCounts",
      "expectedIdsObservedHash",
      "failedCount",
      "lastErrorCodeCounts",
      "pendingFutureCount",
      "pendingReadyCount",
      "processingCount",
      "processingExpiredCount",
      "statusCounts",
    ],
    "URLR outbox"
  )
  const statusCounts = exactRecord(
    outbox.statusCounts,
    ["delivered", "failed", "pending", "processing"],
    "URLR outbox.statusCounts"
  )
  const outcomes = exactRecord(
    outbox.deliveryOutcomeCounts,
    ["alreadyApplied", "applied", "noopStale"],
    "URLR outbox.deliveryOutcomeCounts"
  )
  const streams = exactRecord(
    proof.streams,
    [
      "count",
      "keysHash",
      "notDeliveredThroughLastSequenceCount",
      "sequenceStateHash",
    ],
    "URLR streams"
  )
  const receipts = exactRecord(
    proof.urlrReceipts,
    [
      "actionCounts",
      "count",
      "cursorMismatchCount",
      "identityHash",
      "missingCommandBindingCount",
    ],
    "URLR receipts"
  )
  const projection = exactRecord(
    proof.routeProjection,
    [
      "activeEntityCount",
      "activeEntityKeysHash",
      "assignmentSetHash",
      "extraCount",
      "missingCount",
    ],
    "URLR routeProjection"
  )
  if (
    !(isRecord(receipts.actionCounts) && isRecord(outbox.lastErrorCodeCounts))
  ) {
    throw new Error("urlr-convergence: URLR count maps are invalid")
  }
  for (const [key, count] of Object.entries(receipts.actionCounts)) {
    nonblank(key, "URLR receipt action")
    nonnegativeInteger(count, `URLR actionCounts.${key}`)
  }
  for (const [key, count] of Object.entries(outbox.lastErrorCodeCounts)) {
    nonblank(key, "URLR last error code")
    nonnegativeInteger(count, `URLR lastErrorCodeCounts.${key}`)
  }
  for (const [label, record] of [
    ["boundary", boundary],
    ["statusCounts", statusCounts],
    ["outcomes", outcomes],
    ["streams", streams],
    ["receipts", receipts],
    ["projection", projection],
  ] as const) {
    for (const [key, count] of Object.entries(record)) {
      if (!key.toLowerCase().includes("hash") && key !== "actionCounts") {
        nonnegativeInteger(count, `URLR ${label}.${key}`)
      }
    }
  }
  for (const [label, hash] of [
    ["boundary.expectedEntityKeysHash", boundary.expectedEntityKeysHash],
    ["boundary.expectedEventIdsHash", boundary.expectedEventIdsHash],
    ["boundary.expectedStreamKeysHash", boundary.expectedStreamKeysHash],
    ["outbox.expectedIdsObservedHash", outbox.expectedIdsObservedHash],
    ["streams.keysHash", streams.keysHash],
    ["streams.sequenceStateHash", streams.sequenceStateHash],
    ["receipts.identityHash", receipts.identityHash],
    ["projection.activeEntityKeysHash", projection.activeEntityKeysHash],
    ["projection.assignmentSetHash", projection.assignmentSetHash],
  ] as const) {
    sha256Value(hash, `URLR ${label}`)
  }
  const actionTotal = Object.values(
    receipts.actionCounts as Record<string, number>
  ).reduce((sum, count) => sum + count, 0)
  if (
    proof.schemaVersion !== 1 ||
    proof.kind !== "herbatika-ro-urlr-convergence-proof" ||
    proof.releaseId !== binding.releaseId ||
    proof.market !== "ro" ||
    proof.catalogScopeSha256 !== binding.catalogScopeSha256 ||
    proof.staticTaxonomyConvergenceSha256 !==
      binding.staticTaxonomyConvergenceSha256 ||
    outbox.expectedIdsObservedHash !== boundary.expectedEventIdsHash ||
    outbox.deliveredCount !== boundary.expectedEventCount ||
    statusCounts.delivered !== boundary.expectedEventCount ||
    streams.count !== boundary.expectedStreamCount ||
    streams.keysHash !== boundary.expectedStreamKeysHash ||
    projection.activeEntityCount !== boundary.expectedEntityCount ||
    projection.activeEntityKeysHash !== boundary.expectedEntityKeysHash ||
    receipts.count !== actionTotal ||
    [
      statusCounts.pending,
      statusCounts.processing,
      statusCounts.failed,
      outbox.failedCount,
      outbox.processingCount,
      outbox.processingExpiredCount,
      outbox.pendingReadyCount,
      outbox.pendingFutureCount,
      outbox.blockedStreamCount,
      streams.notDeliveredThroughLastSequenceCount,
      receipts.missingCommandBindingCount,
      receipts.cursorMismatchCount,
      projection.missingCount,
      projection.extraCount,
      ...Object.values(outbox.lastErrorCodeCounts as Record<string, number>),
    ].some((count) => (count as number) !== 0)
  ) {
    throw new Error(
      "urlr-convergence: URLR outbox and route projection are not converged"
    )
  }
  timestampValue(proof.generatedAt, "URLR generatedAt")
  return structuredClone(proof) as UrlrConvergenceProof
}

export const canonicalUrlrConvergenceProof = (value: unknown): string =>
  canonicalCutoverValue(value)

export const serializeUrlrConvergenceProof = (
  proof: UrlrConvergenceProof
): string => `${canonicalUrlrConvergenceProof(proof)}\n`

export const hashUrlrConvergenceProof = async (
  proof: UrlrConvergenceProof
): Promise<string> => {
  const { createHash } = await import("node:crypto")
  return createHash("sha256")
    .update(serializeUrlrConvergenceProof(proof))
    .digest("hex")
}

"use strict"
const { createHash } = require("node:crypto")

const SHA_256 = /^[a-f0-9]{64}$/
const GIT_SHA = /^[a-f0-9]{40}$/
const SAFE_ID = /^[\x21-\x7e]{1,255}$/
const MAX_CAPTURE_AGE_MS = 30 * 60 * 1000

const RO_POST_COMMERCE_ENVELOPE_KEYS = Object.freeze([
  "capturedAt",
  "commerceApplyReceiptSha256",
  "commerceManifestSha256",
  "commercePlanFileSha256",
  "commercePlanHash",
  "commerceRestoreArtifactSha256",
  "environment",
  "kind",
  "observedCommerceSnapshotSha256",
  "payload",
  "payloadSha256",
  "postCommerceSharedInventoryFingerprint",
  "postCommerceSkBaseline",
  "preCommerceSharedInventoryFingerprint",
  "preCommerceSkBaselineArtifactSha256",
  "preCommerceSkBaseline",
  "priceAuthoritySha256",
  "rawLiveInventorySha256",
  "schemaVersion",
  "sourceInventoryEnvelopeSha256",
])

const RO_POST_COMMERCE_ENVIRONMENT_KEYS = Object.freeze([
  "backendBuildHash",
  "backendDeploymentId",
  "backendReleaseSha",
  "backendSlot",
  "databaseFingerprint",
  "databaseInstanceFingerprint",
  "environmentId",
  "locale",
  "marketCode",
  "salesChannelId",
])

const record = (value, label) => {
  if (!(value && typeof value === "object" && !Array.isArray(value))) {
    throw new Error(`${label} must be an object`)
  }
  return value
}

const exactKeys = (value, keys, label) => {
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    throw new Error(`${label} fields are invalid`)
  }
}

const text = (value, label) => {
  if (typeof value !== "string" || value.trim() !== value || !value) {
    throw new Error(`${label} must be a nonblank trimmed string`)
  }
  return value
}

const safeId = (value, label) => {
  const parsed = text(value, label)
  if (!SAFE_ID.test(parsed)) {
    throw new Error(`${label} must be printable ASCII`)
  }
  return parsed
}

const hash = (value, label) => {
  const parsed = text(value, label)
  if (!SHA_256.test(parsed)) {
    throw new Error(`${label} must be a lowercase SHA-256`)
  }
  return parsed
}

const timestamp = (value, label) => {
  const parsed = text(value, label)
  const date = new Date(parsed)
  if (Number.isNaN(date.getTime()) || date.toISOString() !== parsed) {
    throw new Error(`${label} must be an ISO-8601 UTC timestamp`)
  }
  return parsed
}

const stablePostCommerceJson = (value) => {
  if (Array.isArray(value)) {
    return `[${value.map(stablePostCommerceJson).join(",")}]`
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right, "en"))
      .map(
        ([key, child]) =>
          `${JSON.stringify(key)}:${stablePostCommerceJson(child)}`
      )
      .join(",")}}`
  }
  const serialized = JSON.stringify(value)
  if (serialized === undefined) {
    throw new Error("post-commerce envelope contains a non-JSON value")
  }
  return serialized
}

const postCommerceSha256 = (value) =>
  createHash("sha256").update(value).digest("hex")

const parseFingerprint = (value, label) => {
  const parsed = record(value, label)
  exactKeys(parsed, ["count", "sha256"], label)
  if (!Number.isSafeInteger(parsed.count) || parsed.count < 0) {
    throw new Error(`${label}.count is invalid`)
  }
  return { count: parsed.count, sha256: hash(parsed.sha256, `${label}.sha256`) }
}

const parseProof = (value, label) => {
  const parsed = record(value, label)
  exactKeys(parsed, ["count", "errors", "sha256"], label)
  const fingerprint = parseFingerprint(
    { count: parsed.count, sha256: parsed.sha256 },
    label
  )
  if (
    !Array.isArray(parsed.errors) ||
    parsed.errors.some((error) => typeof error !== "string")
  ) {
    throw new Error(`${label}.errors is invalid`)
  }
  return { ...fingerprint, errors: parsed.errors }
}

const parseRoPostCommerceEnvelopeContract = (contents, options = {}) => {
  let parsed
  try {
    parsed = JSON.parse(contents)
  } catch {
    throw new Error("post-commerce envelope is not valid JSON")
  }
  const root = record(parsed, "post-commerce envelope")
  exactKeys(root, RO_POST_COMMERCE_ENVELOPE_KEYS, "post-commerce envelope")
  if (
    root.schemaVersion !== 1 ||
    root.kind !== "ro-demo-post-commerce-envelope"
  ) {
    throw new Error("post-commerce envelope kind/schemaVersion is invalid")
  }
  const capturedAt = timestamp(root.capturedAt, "capturedAt")
  const now = options.now ?? new Date()
  const maxAgeMs = options.maxAgeMs ?? MAX_CAPTURE_AGE_MS
  const age = now.getTime() - new Date(capturedAt).getTime()
  if (age < 0 || age > maxAgeMs) {
    throw new Error(
      "post-commerce envelope capture is stale or from the future"
    )
  }
  const preCommerceSkBaseline = parseProof(
    root.preCommerceSkBaseline,
    "preCommerceSkBaseline"
  )
  const postCommerceSkBaseline = parseProof(
    root.postCommerceSkBaseline,
    "postCommerceSkBaseline"
  )
  if (
    preCommerceSkBaseline.errors.length > 0 ||
    postCommerceSkBaseline.errors.length > 0 ||
    stablePostCommerceJson(preCommerceSkBaseline) !==
      stablePostCommerceJson(postCommerceSkBaseline)
  ) {
    throw new Error("SK commerce baseline changed during RO commerce apply")
  }
  const preCommerceSharedInventoryFingerprint = parseFingerprint(
    root.preCommerceSharedInventoryFingerprint,
    "preCommerceSharedInventoryFingerprint"
  )
  const postCommerceSharedInventoryFingerprint = parseFingerprint(
    root.postCommerceSharedInventoryFingerprint,
    "postCommerceSharedInventoryFingerprint"
  )
  if (
    stablePostCommerceJson(preCommerceSharedInventoryFingerprint) !==
    stablePostCommerceJson(postCommerceSharedInventoryFingerprint)
  ) {
    throw new Error("shared inventory changed during RO commerce apply")
  }
  const rawEnvironment = record(root.environment, "environment")
  exactKeys(rawEnvironment, RO_POST_COMMERCE_ENVIRONMENT_KEYS, "environment")
  if (rawEnvironment.locale !== "ro-RO" || rawEnvironment.marketCode !== "ro") {
    throw new Error("environment market/locale is invalid")
  }
  if (
    rawEnvironment.backendSlot !== "blue" &&
    rawEnvironment.backendSlot !== "green"
  ) {
    throw new Error("environment.backendSlot must be blue or green")
  }
  const backendReleaseSha = text(
    rawEnvironment.backendReleaseSha,
    "environment.backendReleaseSha"
  )
  if (!GIT_SHA.test(backendReleaseSha)) {
    throw new Error("environment.backendReleaseSha must be a full Git SHA")
  }
  const environment = {
    backendBuildHash: safeId(
      rawEnvironment.backendBuildHash,
      "environment.backendBuildHash"
    ),
    backendDeploymentId: safeId(
      rawEnvironment.backendDeploymentId,
      "environment.backendDeploymentId"
    ),
    backendReleaseSha,
    backendSlot: rawEnvironment.backendSlot,
    databaseFingerprint: hash(
      rawEnvironment.databaseFingerprint,
      "environment.databaseFingerprint"
    ),
    databaseInstanceFingerprint: hash(
      rawEnvironment.databaseInstanceFingerprint,
      "environment.databaseInstanceFingerprint"
    ),
    environmentId: safeId(
      rawEnvironment.environmentId,
      "environment.environmentId"
    ),
    locale: "ro-RO",
    marketCode: "ro",
    salesChannelId: safeId(
      rawEnvironment.salesChannelId,
      "environment.salesChannelId"
    ),
  }
  const payload = record(root.payload, "payload")
  const payloadSha256 = hash(root.payloadSha256, "payloadSha256")
  if (postCommerceSha256(stablePostCommerceJson(payload)) !== payloadSha256) {
    throw new Error("payloadSha256 does not match canonical payload")
  }
  return {
    capturedAt,
    commerceApplyReceiptSha256: hash(
      root.commerceApplyReceiptSha256,
      "commerceApplyReceiptSha256"
    ),
    commerceManifestSha256: hash(
      root.commerceManifestSha256,
      "commerceManifestSha256"
    ),
    commercePlanFileSha256: hash(
      root.commercePlanFileSha256,
      "commercePlanFileSha256"
    ),
    commercePlanHash: hash(root.commercePlanHash, "commercePlanHash"),
    commerceRestoreArtifactSha256: hash(
      root.commerceRestoreArtifactSha256,
      "commerceRestoreArtifactSha256"
    ),
    environment,
    kind: "ro-demo-post-commerce-envelope",
    observedCommerceSnapshotSha256: hash(
      root.observedCommerceSnapshotSha256,
      "observedCommerceSnapshotSha256"
    ),
    payload,
    payloadSha256,
    postCommerceSharedInventoryFingerprint,
    postCommerceSkBaseline,
    preCommerceSharedInventoryFingerprint,
    preCommerceSkBaselineArtifactSha256: hash(
      root.preCommerceSkBaselineArtifactSha256,
      "preCommerceSkBaselineArtifactSha256"
    ),
    preCommerceSkBaseline,
    priceAuthoritySha256: hash(
      root.priceAuthoritySha256,
      "priceAuthoritySha256"
    ),
    rawLiveInventorySha256: hash(
      root.rawLiveInventorySha256,
      "rawLiveInventorySha256"
    ),
    schemaVersion: 1,
    sourceInventoryEnvelopeSha256: hash(
      root.sourceInventoryEnvelopeSha256,
      "sourceInventoryEnvelopeSha256"
    ),
  }
}

module.exports = {
  parseRoPostCommerceEnvelopeContract,
  postCommerceSha256,
  RO_POST_COMMERCE_ENVELOPE_KEYS,
  RO_POST_COMMERCE_ENVIRONMENT_KEYS,
  stablePostCommerceJson,
}

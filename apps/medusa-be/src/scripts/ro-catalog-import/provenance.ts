import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import { buildRoDemoDatabaseInstanceFingerprint } from "../ro-demo-commerce/runtime"
import type {
  RoCatalogManifest,
  RoCatalogPostCommerceInventoryEvidence,
} from "./types"

const MAX_CAPTURE_AGE_MS = 30 * 60 * 1000

const asRecord = (value: unknown, label: string): Record<string, unknown> => {
  if (!(value && typeof value === "object" && !Array.isArray(value))) {
    throw new Error(`${label} must be an object`)
  }
  return value as Record<string, unknown>
}

const stableJson = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right, "en"))
      .map(([key, child]) => `${JSON.stringify(key)}:${stableJson(child)}`)
      .join(",")}}`
  }
  return JSON.stringify(value) ?? "null"
}

const sha256 = (value: string | Uint8Array) =>
  createHash("sha256").update(value).digest("hex")

const envelopeEvidence = (
  envelope: Record<string, unknown>,
  envelopeFileSha256: string
): Record<string, unknown> => {
  const { payload: _payload, ...proof } = envelope
  return { ...proof, postCommerceEnvelopeSha256: envelopeFileSha256 }
}

export const assertRoCatalogPostCommerceProvenance = async (
  envelopePath: string,
  manifest: RoCatalogManifest,
  now = new Date()
): Promise<RoCatalogPostCommerceInventoryEvidence> => {
  const bytes = await readFile(envelopePath)
  const envelopeFileSha256 = sha256(bytes)
  let parsed: unknown
  try {
    parsed = JSON.parse(bytes.toString("utf8"))
  } catch {
    throw new Error("post-commerce envelope is not valid JSON")
  }
  const envelope = asRecord(parsed, "post-commerce envelope")
  const payload = asRecord(envelope.payload, "post-commerce envelope.payload")
  const actualEvidence = envelopeEvidence(envelope, envelopeFileSha256)
  if (
    stableJson(actualEvidence) !==
    stableJson(manifest.postCommerceInventoryEvidence)
  ) {
    throw new Error(
      "post-commerce envelope proof does not exactly match catalog manifest evidence"
    )
  }
  if (sha256(stableJson(payload)) !== envelope.payloadSha256) {
    throw new Error("post-commerce envelope payload hash does not match")
  }
  const capturedAt = new Date(manifest.postCommerceInventoryEvidence.capturedAt)
  const age = now.getTime() - capturedAt.getTime()
  if (age < 0 || age > MAX_CAPTURE_AGE_MS) {
    throw new Error("post-commerce envelope is stale or from the future")
  }
  const payloadReadiness = asRecord(
    payload.readiness,
    "post-commerce envelope.payload.readiness"
  )
  if (
    stableJson(payloadReadiness) !== stableJson(manifest.readiness) ||
    payload.salesChannelId !==
      manifest.postCommerceInventoryEvidence.environment.salesChannelId
  ) {
    throw new Error(
      "post-commerce envelope environment/readiness does not match catalog manifest"
    )
  }
  return manifest.postCommerceInventoryEvidence
}

const requiredEnvironmentValue = (
  environment: NodeJS.ProcessEnv,
  name: string
): string => {
  const value = environment[name]
  if (!value?.trim()) {
    throw new Error(`${name} is required to bind RO import to this deployment`)
  }
  return value.trim()
}

export const assertRoCatalogRuntimeEnvironment = (
  manifest: RoCatalogManifest,
  environment: NodeJS.ProcessEnv = process.env
) => {
  const expected = manifest.postCommerceInventoryEvidence.environment
  const observed = {
    backendBuildHash: requiredEnvironmentValue(
      environment,
      "BACKEND_BUILD_HASH"
    ),
    backendDeploymentId: requiredEnvironmentValue(
      environment,
      "ZANE_DEPLOYMENT_ID"
    ),
    backendReleaseSha: requiredEnvironmentValue(environment, "RELEASE_SHA"),
    backendSlot: requiredEnvironmentValue(environment, "ZANE_DEPLOYMENT_SLOT"),
    databaseInstanceFingerprint:
      buildRoDemoDatabaseInstanceFingerprint(environment),
    environmentId: requiredEnvironmentValue(
      environment,
      "RO_DEMO_ENVIRONMENT_ID"
    ),
  }
  if (
    observed.backendBuildHash !== expected.backendBuildHash ||
    observed.backendDeploymentId !== expected.backendDeploymentId ||
    observed.backendReleaseSha !== expected.backendReleaseSha ||
    observed.backendSlot !== expected.backendSlot ||
    observed.databaseInstanceFingerprint !==
      expected.databaseInstanceFingerprint ||
    observed.environmentId !== expected.environmentId
  ) {
    throw new Error(
      "current environment/build does not match post-commerce evidence"
    )
  }
  return observed
}

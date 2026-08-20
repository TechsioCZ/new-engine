import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import { parseRoCatalogJson } from "./manifest"
import type {
  RoCatalogGenerationProof,
  RoCatalogImportPlan,
  RoCatalogManifest,
} from "./types"

const SHA_256 = /^[a-f0-9]{64}$/
const BUNDLE_KEYS = [
  "authorization",
  "bootstrap",
  "coverage",
  "demoOmissionLedger",
  "demoOmissionLedgerSha256",
  "exclusions",
  "generatedAt",
  "generationPlanSha256",
  "inputSha256",
  "manifest",
  "manifestSha256",
  "provenance",
  "warnings",
] as const

const asRecord = (value: unknown, label: string): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`)
  }
  return value as Record<string, unknown>
}

const stableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(stableValue)
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right, "en"))
        .map(([key, entry]) => [key, stableValue(entry)])
    )
  }
  return value
}

const stableJson = (value: unknown): string =>
  JSON.stringify(stableValue(value))
const sha256 = (value: unknown): string =>
  createHash("sha256").update(stableJson(value)).digest("hex")

const assertExactBundleKeys = (record: Record<string, unknown>) => {
  const expected = [...BUNDLE_KEYS].sort()
  const actual = Object.keys(record).sort()
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `generation plan must have exact keys ${BUNDLE_KEYS.join(", ")}`
    )
  }
}

const requiredSha = (value: unknown, label: string): string => {
  if (typeof value !== "string" || !SHA_256.test(value)) {
    throw new Error(`${label} must be a lowercase SHA-256`)
  }
  return value
}

export const assertRoCatalogGenerationProof = async (
  generationPlanPath: string,
  manifest: RoCatalogManifest
): Promise<RoCatalogGenerationProof> => {
  const bytes = await readFile(generationPlanPath, "utf8")
  let parsed: unknown
  try {
    parsed = JSON.parse(bytes)
  } catch {
    throw new Error("generation plan must be valid JSON")
  }
  const bundle = asRecord(parsed, "generation plan")
  assertExactBundleKeys(bundle)
  const generationPlanSha256 = requiredSha(
    bundle.generationPlanSha256,
    "generationPlanSha256"
  )
  const inputSha256 = requiredSha(bundle.inputSha256, "inputSha256")
  const manifestSha256 = requiredSha(bundle.manifestSha256, "manifestSha256")
  const demoOmissionLedgerSha256 = requiredSha(
    bundle.demoOmissionLedgerSha256,
    "demoOmissionLedgerSha256"
  )
  const { generationPlanSha256: _omitted, ...planWithoutHash } = bundle
  if (sha256(planWithoutHash) !== generationPlanSha256) {
    throw new Error("generationPlanSha256 does not match the generation plan")
  }
  if (sha256(bundle.demoOmissionLedger) !== demoOmissionLedgerSha256) {
    throw new Error(
      "demoOmissionLedgerSha256 does not match the embedded omission ledger"
    )
  }
  const embeddedManifest = parseRoCatalogJson(JSON.stringify(bundle.manifest))
  if (
    sha256(embeddedManifest) !== manifestSha256 ||
    stableJson(embeddedManifest) !== stableJson(manifest)
  ) {
    throw new Error(
      "generation plan manifest/hash does not match --manifest exactly"
    )
  }
  return { generationPlanSha256, inputSha256, manifestSha256 }
}

export const bindRoCatalogGenerationProof = (
  plan: RoCatalogImportPlan,
  generationProof: RoCatalogGenerationProof
): RoCatalogImportPlan => ({ ...plan, generationProof })

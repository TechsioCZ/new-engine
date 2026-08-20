import { createHash } from "node:crypto"
import { canonicalizePopulationValue } from "../../src/lib/url-registry/population/manifest-primitives"

const SHA256 = /^[a-f0-9]{64}$/
const SCOPE_KEYS = [
  "brandExcludedIds",
  "brandIds",
  "categoryExcludedIds",
  "categoryPublishedIds",
  "collectionIds",
  "productExcludedIds",
  "productPublishedIds",
] as const

export type UrlrConvergenceCatalogScope = Readonly<{
  brandExcludedIds: readonly string[]
  brandIds: readonly string[]
  categoryExcludedIds: readonly string[]
  categoryPublishedIds: readonly string[]
  collectionIds: readonly string[]
  productExcludedIds: readonly string[]
  productPublishedIds: readonly string[]
}>

const record = (value: unknown, label: string): Record<string, unknown> => {
  if (!(value && typeof value === "object" && !Array.isArray(value))) {
    throw new Error(`urlr-convergence: ${label} must be an object`)
  }
  return value as Record<string, unknown>
}

const exactKeys = (
  value: Record<string, unknown>,
  keys: readonly string[],
  label: string
) => {
  if (
    JSON.stringify(Object.keys(value).sort()) !==
    JSON.stringify([...keys].sort())
  ) {
    throw new Error(`urlr-convergence: ${label} has invalid fields`)
  }
}

const canonicalHash = (value: unknown): string =>
  createHash("sha256")
    .update(JSON.stringify(canonicalizePopulationValue(value)))
    .digest("hex")

const scopeIds = (
  value: Record<string, unknown>,
  key: (typeof SCOPE_KEYS)[number]
): readonly string[] => {
  const ids = value[key]
  if (
    !Array.isArray(ids) ||
    ids.some(
      (id) => typeof id !== "string" || id.length === 0 || id.trim() !== id
    ) ||
    new Set(ids).size !== ids.length ||
    JSON.stringify(ids) !== JSON.stringify([...ids].sort())
  ) {
    throw new Error(
      `urlr-convergence: import plan scope.${key} must be unique sorted IDs`
    )
  }
  return ids as string[]
}

/**
 * Parses only the hash-bound catalog scope required by convergence evidence.
 * The full nested plan is still hashed, so unrelated plan tampering cannot be
 * hidden by presenting a valid scope in a modified importer artifact.
 */
export const parseUrlrConvergenceImportPlan = (value: unknown) => {
  const artifact = record(value, "import plan artifact")
  exactKeys(
    artifact,
    ["plan", "planHash", "schemaVersion"],
    "import plan artifact"
  )
  if (
    artifact.schemaVersion !== 1 ||
    typeof artifact.planHash !== "string" ||
    !SHA256.test(artifact.planHash)
  ) {
    throw new Error("urlr-convergence: import plan envelope is invalid")
  }
  const plan = record(artifact.plan, "import plan")
  const scopeInput = record(plan.scope, "import plan scope")
  exactKeys(scopeInput, SCOPE_KEYS, "import plan scope")
  if (typeof plan.scopeSha256 !== "string" || !SHA256.test(plan.scopeSha256)) {
    throw new Error("urlr-convergence: import plan scope hash is invalid")
  }
  const planHash = canonicalHash(plan)
  if (artifact.planHash !== planHash) {
    throw new Error(
      "urlr-convergence: import plan hash does not match canonical plan"
    )
  }
  const scope = Object.fromEntries(
    SCOPE_KEYS.map((key) => [key, scopeIds(scopeInput, key)])
  ) as UrlrConvergenceCatalogScope
  const hash = canonicalHash(scope)
  if (plan.scopeSha256 !== hash) {
    throw new Error(
      "urlr-convergence: import plan scope hash does not match scope"
    )
  }
  return { hash, planHash, scope }
}

export const hashUrlrConvergenceImportPlanValue = canonicalHash

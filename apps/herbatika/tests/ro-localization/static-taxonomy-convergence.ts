import {
  APPROVED_STATIC_CUTOVER_PLAN_HASH,
  APPROVED_STATIC_TAXONOMY_HASH,
  RO_DEMO_STATIC_ROOTS,
} from "./static-taxonomy-approval"

const SHA256 = /^sha256:[a-f0-9]{64}$/
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/
const INDEXABLE_ROOT_KEYS = ["root:about", "root:faq"] as const
const NOINDEX_ROOT_KEYS = RO_DEMO_STATIC_ROOTS.map(
  ([key]) => `root:${key}`
).sort()

export type StaticTaxonomyConvergence = Readonly<{
  schemaVersion: 1
  kind: "ro-static-taxonomy-convergence"
  state: "converged"
  releaseId: string
  environmentId: string
  taxonomyApprovalHash: string
  planHash: string
  actionsRequired: 0
  blockers: 0
  populationManifestSha256: string
  capturedAt: string
  policy: Readonly<{
    market: "ro"
    indexable: Readonly<{ count: 2; routeKeys: readonly string[] }>
    noindex: Readonly<{ count: 11; routeKeys: readonly string[] }>
  }>
}>

const record = (value: unknown, label: string): Record<string, unknown> => {
  if (value === null || Array.isArray(value) || typeof value !== "object") {
    throw new Error(`${label} must be an object`)
  }
  return value as Record<string, unknown>
}

const exactKeys = (
  value: Record<string, unknown>,
  expected: readonly string[],
  label: string
) => {
  if (
    JSON.stringify(Object.keys(value).sort()) !==
    JSON.stringify([...expected].sort())
  ) {
    throw new Error(`${label} has unexpected keys`)
  }
}

const exactPolicy = (value: unknown) => {
  const policy = record(value, "policy")
  exactKeys(policy, ["indexable", "market", "noindex"], "policy")
  if (policy.market !== "ro") {
    throw new Error("policy.market must be ro")
  }
  for (const [name, count, routeKeys] of [
    ["indexable", 2, INDEXABLE_ROOT_KEYS],
    ["noindex", 11, NOINDEX_ROOT_KEYS],
  ] as const) {
    const set = record(policy[name], `policy.${name}`)
    exactKeys(set, ["count", "routeKeys"], `policy.${name}`)
    if (
      set.count !== count ||
      JSON.stringify(set.routeKeys) !== JSON.stringify(routeKeys)
    ) {
      throw new Error(`policy.${name} does not match the approved route set`)
    }
  }
}

export const parseStaticTaxonomyConvergence = (
  value: unknown
): StaticTaxonomyConvergence => {
  const artifact = record(value, "convergence artifact")
  exactKeys(
    artifact,
    [
      "actionsRequired",
      "blockers",
      "capturedAt",
      "environmentId",
      "kind",
      "planHash",
      "policy",
      "populationManifestSha256",
      "releaseId",
      "schemaVersion",
      "state",
      "taxonomyApprovalHash",
    ],
    "convergence artifact"
  )
  if (
    artifact.schemaVersion !== 1 ||
    artifact.kind !== "ro-static-taxonomy-convergence" ||
    artifact.state !== "converged" ||
    artifact.actionsRequired !== 0 ||
    artifact.blockers !== 0
  ) {
    throw new Error("convergence state must be the exact approved GO state")
  }
  if (
    artifact.taxonomyApprovalHash !== APPROVED_STATIC_TAXONOMY_HASH ||
    artifact.planHash !== APPROVED_STATIC_CUTOVER_PLAN_HASH ||
    typeof artifact.populationManifestSha256 !== "string" ||
    !SHA256.test(artifact.populationManifestSha256)
  ) {
    throw new Error("convergence hashes do not match the approved release")
  }
  if (
    typeof artifact.releaseId !== "string" ||
    !SAFE_ID.test(artifact.releaseId) ||
    typeof artifact.environmentId !== "string" ||
    !SAFE_ID.test(artifact.environmentId)
  ) {
    throw new Error("convergence release identity is invalid")
  }
  if (
    typeof artifact.capturedAt !== "string" ||
    new Date(artifact.capturedAt).toISOString() !== artifact.capturedAt
  ) {
    throw new Error("capturedAt must be a canonical ISO timestamp")
  }
  exactPolicy(artifact.policy)
  return structuredClone(artifact) as StaticTaxonomyConvergence
}

export const serializeStaticTaxonomyConvergence = (value: unknown) =>
  `${JSON.stringify(parseStaticTaxonomyConvergence(value), null, 2)}\n`

export const approvedStaticTaxonomyPolicy = () => ({
  market: "ro" as const,
  indexable: { count: 2 as const, routeKeys: INDEXABLE_ROOT_KEYS },
  noindex: { count: 11 as const, routeKeys: NOINDEX_ROOT_KEYS },
})

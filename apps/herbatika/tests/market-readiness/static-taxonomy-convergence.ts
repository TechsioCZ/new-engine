import { createHash } from "node:crypto"
import {
  hashPopulationManifest,
  parsePopulationManifest,
} from "../../src/lib/url-registry/population/manifest"
import {
  POPULATION_MARKETS,
  type PopulationManifest,
} from "../../src/lib/url-registry/population/manifest-contracts"
import { canonicalizePopulationValue } from "../../src/lib/url-registry/population/manifest-primitives"
import {
  buildPopulationStaticTaxonomy,
  hashPopulationStaticTaxonomy,
  staticRoutePath,
} from "../../src/lib/url-registry/population/static-taxonomy"
import type { ReadinessMarket } from "./urlr-convergence"

export const FOUR_MARKET_STATIC_TAXONOMY_CONVERGENCE_KIND =
  "herbatika-four-market-static-taxonomy-convergence" as const

export type StaticTaxonomyProjection = Readonly<{
  equivalenceKey: string
  indexPolicy: "indexable" | "noindex"
  market: ReadinessMarket
  matchMode: "exact" | "prefix"
  parentRouteKey: string | null
  path: string
  routeKey: string
  segment: string
}>

export type StaticTaxonomyMarketHealth = Readonly<{
  conflictCount: number
  failedCount: number
  market: ReadinessMarket
  pendingCount: number
}>

export type SegmentRegistryArtifactRef = Readonly<{
  ref: string
  sha256: string
}>

export type StaticTaxonomyMarketConvergence = Readonly<{
  approval: Readonly<{
    editorialApproval: string
    legalApproval: string
  }>
  binding: Readonly<{
    locale: string
    market: ReadinessMarket
    salesChannelId: string
  }>
  conflictCount: 0
  expectedCount: number
  extraCount: 0
  failedCount: 0
  missingCount: 0
  observedCount: number
  pendingCount: 0
  projectionSha256: string
  projections: readonly StaticTaxonomyProjection[]
  segmentRegistry: SegmentRegistryArtifactRef
}>

export type FourMarketStaticTaxonomyConvergence = Readonly<{
  aggregateSha256: string
  environmentId: string
  generatedAt: string
  kind: typeof FOUR_MARKET_STATIC_TAXONOMY_CONVERGENCE_KIND
  markets: Readonly<Record<ReadinessMarket, StaticTaxonomyMarketConvergence>>
  migrationLedgerSha256: string
  populationManifestSha256: `sha256:${string}`
  releaseId: string
  schemaVersion: 1
  state: "converged"
  taxonomySha256: string
}>

const SHA256 = /^[a-f0-9]{64}$/
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/
const canonical = (value: unknown): string =>
  JSON.stringify(canonicalizePopulationValue(value))
const sha256 = (value: unknown): string =>
  createHash("sha256").update(canonical(value)).digest("hex")

const record = (value: unknown, label: string): Record<string, unknown> => {
  if (!(value && typeof value === "object" && !Array.isArray(value))) {
    throw new Error(`four-market-static-taxonomy: ${label} must be an object`)
  }
  return value as Record<string, unknown>
}

const exactKeys = (
  value: Record<string, unknown>,
  keys: readonly string[],
  label: string
) => {
  if (canonical(Object.keys(value).sort()) !== canonical([...keys].sort())) {
    throw new Error(`four-market-static-taxonomy: ${label} has invalid fields`)
  }
}

const count = (value: unknown, label: string): number => {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new Error(`four-market-static-taxonomy: ${label} must be nonnegative`)
  }
  return value as number
}

const timestamp = (value: unknown): string => {
  if (typeof value !== "string") {
    throw new Error("four-market-static-taxonomy: generatedAt is invalid")
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString() !== value) {
    throw new Error("four-market-static-taxonomy: generatedAt is invalid")
  }
  return value
}

const safeId = (value: unknown, label: string): string => {
  if (typeof value !== "string" || !SAFE_ID.test(value)) {
    throw new Error(`four-market-static-taxonomy: ${label} is invalid`)
  }
  return value
}

const rawSha256 = (value: unknown, label: string): string => {
  if (typeof value !== "string" || !SHA256.test(value)) {
    throw new Error(`four-market-static-taxonomy: ${label} is invalid`)
  }
  return value
}

const segmentRegistryRef = (
  value: unknown,
  market: ReadinessMarket,
  label: string
): SegmentRegistryArtifactRef => {
  const input = record(value, label)
  exactKeys(input, ["ref", "sha256"], label)
  const ref = `segment-registry-g1/${market}.json`
  if (input.ref !== ref) {
    throw new Error(`four-market-static-taxonomy: ${label}.ref is invalid`)
  }
  return { ref, sha256: rawSha256(input.sha256, `${label}.sha256`) }
}

const normalizeProjection = (
  value: unknown,
  label: string
): StaticTaxonomyProjection => {
  const projection = record(value, label)
  exactKeys(
    projection,
    [
      "equivalenceKey",
      "indexPolicy",
      "market",
      "matchMode",
      "parentRouteKey",
      "path",
      "routeKey",
      "segment",
    ],
    label
  )
  if (
    !(
      POPULATION_MARKETS.includes(projection.market as ReadinessMarket) &&
      ["indexable", "noindex"].includes(projection.indexPolicy as string) &&
      ["exact", "prefix"].includes(projection.matchMode as string)
    ) ||
    (projection.parentRouteKey !== null &&
      typeof projection.parentRouteKey !== "string") ||
    [
      projection.equivalenceKey,
      projection.path,
      projection.routeKey,
      projection.segment,
    ].some((item) => typeof item !== "string" || !item)
  ) {
    throw new Error(`four-market-static-taxonomy: ${label} is invalid`)
  }
  return projection as StaticTaxonomyProjection
}

const projectionKey = (projection: StaticTaxonomyProjection): string =>
  projection.routeKey

export const expectedStaticTaxonomyProjections =
  (): readonly StaticTaxonomyProjection[] => {
    const routes = buildPopulationStaticTaxonomy()
    return routes
      .map((route) => ({ ...route, path: staticRoutePath(route, routes) }))
      .sort((left, right) =>
        `${left.market}:${left.routeKey}`.localeCompare(
          `${right.market}:${right.routeKey}`,
          "en"
        )
      )
  }

const healthByMarket = (
  healthValues: readonly StaticTaxonomyMarketHealth[]
): ReadonlyMap<ReadinessMarket, StaticTaxonomyMarketHealth> => {
  const result = new Map<ReadinessMarket, StaticTaxonomyMarketHealth>()
  for (const [index, value] of healthValues.entries()) {
    const health = record(value, `health[${index}]`)
    exactKeys(
      health,
      ["conflictCount", "failedCount", "market", "pendingCount"],
      `health[${index}]`
    )
    const market = health.market as ReadinessMarket
    if (!POPULATION_MARKETS.includes(market) || result.has(market)) {
      throw new Error(
        "four-market-static-taxonomy: invalid or duplicate health market"
      )
    }
    result.set(market, {
      conflictCount: count(health.conflictCount, "conflictCount"),
      failedCount: count(health.failedCount, "failedCount"),
      market,
      pendingCount: count(health.pendingCount, "pendingCount"),
    })
  }
  if (result.size !== POPULATION_MARKETS.length) {
    throw new Error(
      "four-market-static-taxonomy: health must cover every market"
    )
  }
  return result
}

const buildMarketConvergence = (
  input: Readonly<{
    expected: readonly StaticTaxonomyProjection[]
    health: StaticTaxonomyMarketHealth
    manifest: PopulationManifest
    market: ReadinessMarket
    observedValues: readonly StaticTaxonomyProjection[]
    segmentRegistry: SegmentRegistryArtifactRef
  }>
): StaticTaxonomyMarketConvergence => {
  const { expected, health, manifest, market, observedValues } = input
  const observed = observedValues.map((value, index) =>
    normalizeProjection(value, `${market}.projections[${index}]`)
  )
  const expectedMap = new Map(
    expected.map((item) => [projectionKey(item), item])
  )
  const observedMap = new Map<string, StaticTaxonomyProjection>()
  const observedPaths = new Set<string>()
  let duplicateCount = 0
  for (const item of observed) {
    if (
      item.market !== market ||
      observedMap.has(projectionKey(item)) ||
      observedPaths.has(item.path)
    ) {
      duplicateCount += 1
    } else {
      observedMap.set(projectionKey(item), item)
      observedPaths.add(item.path)
    }
  }
  const missingCount = [...expectedMap.keys()].filter(
    (key) => !observedMap.has(key)
  ).length
  const extraCount = [...observedMap.keys()].filter(
    (key) => !expectedMap.has(key)
  ).length
  const mismatchCount = [...expectedMap].filter(([key, expectedItem]) => {
    const actual = observedMap.get(key)
    return actual && canonical(actual) !== canonical(expectedItem)
  }).length
  const conflictCount = duplicateCount + mismatchCount + health.conflictCount
  if (
    missingCount ||
    extraCount ||
    conflictCount ||
    health.pendingCount ||
    health.failedCount
  ) {
    throw new Error(
      `four-market-static-taxonomy: ${market} is not converged (missing=${missingCount}, extra=${extraCount}, conflict=${conflictCount}, pending=${health.pendingCount}, failed=${health.failedCount})`
    )
  }
  const binding = manifest.bindings.find((item) => item.market === market)
  if (!binding) {
    throw new Error(`four-market-static-taxonomy: no binding for ${market}`)
  }
  const projections = [...expected].sort((left, right) =>
    left.routeKey.localeCompare(right.routeKey, "en")
  )
  return {
    approval: manifest.taxonomyApproval.markets[market],
    binding,
    conflictCount: 0,
    expectedCount: projections.length,
    extraCount: 0,
    failedCount: 0,
    missingCount: 0,
    observedCount: observed.length,
    pendingCount: 0,
    projectionSha256: sha256(projections),
    projections,
    segmentRegistry: segmentRegistryRef(
      input.segmentRegistry,
      market,
      `${market}.segmentRegistry`
    ),
  }
}

export const buildFourMarketStaticTaxonomyConvergence = (
  input: Readonly<{
    environmentId: string
    generatedAt: string
    health: readonly StaticTaxonomyMarketHealth[]
    manifest: unknown
    migrationLedgerSha256: string
    observedProjections: readonly StaticTaxonomyProjection[]
    releaseId: string
    segmentRegistryByMarket: Readonly<
      Record<ReadinessMarket, SegmentRegistryArtifactRef>
    >
  }>
): FourMarketStaticTaxonomyConvergence => {
  const manifest = parsePopulationManifest(input.manifest)
  const expected = expectedStaticTaxonomyProjections()
  const health = healthByMarket(input.health)
  const normalized = input.observedProjections.map((value, index) =>
    normalizeProjection(value, `observedProjections[${index}]`)
  )
  const markets = Object.fromEntries(
    POPULATION_MARKETS.map((market) => [
      market,
      buildMarketConvergence({
        expected: expected.filter((item) => item.market === market),
        health: health.get(market) as StaticTaxonomyMarketHealth,
        manifest,
        market,
        observedValues: normalized.filter((item) => item.market === market),
        segmentRegistry: input.segmentRegistryByMarket[market],
      }),
    ])
  ) as Record<ReadinessMarket, StaticTaxonomyMarketConvergence>
  const populationManifestSha256 = hashPopulationManifest(manifest)
  const taxonomySha256 = hashPopulationStaticTaxonomy().slice("sha256:".length)
  const core = {
    environmentId: safeId(input.environmentId, "environmentId"),
    kind: FOUR_MARKET_STATIC_TAXONOMY_CONVERGENCE_KIND,
    markets,
    migrationLedgerSha256: rawSha256(
      input.migrationLedgerSha256,
      "migrationLedgerSha256"
    ),
    populationManifestSha256,
    releaseId: safeId(input.releaseId, "releaseId"),
    schemaVersion: 1,
    state: "converged",
    taxonomySha256,
  } as const
  return {
    ...core,
    aggregateSha256: sha256(core),
    generatedAt: timestamp(input.generatedAt),
  }
}

export const parseFourMarketStaticTaxonomyConvergence = (
  value: unknown,
  manifest: unknown
): FourMarketStaticTaxonomyConvergence => {
  const proof = record(value, "proof")
  exactKeys(
    proof,
    [
      "aggregateSha256",
      "environmentId",
      "generatedAt",
      "kind",
      "markets",
      "migrationLedgerSha256",
      "populationManifestSha256",
      "releaseId",
      "schemaVersion",
      "state",
      "taxonomySha256",
    ],
    "proof"
  )
  const marketValues = record(proof.markets, "proof.markets")
  exactKeys(marketValues, POPULATION_MARKETS, "proof.markets")
  const observedProjections: StaticTaxonomyProjection[] = []
  const health: StaticTaxonomyMarketHealth[] = []
  const segmentRegistryByMarket = {} as Record<
    ReadinessMarket,
    SegmentRegistryArtifactRef
  >
  for (const market of POPULATION_MARKETS) {
    const item = record(marketValues[market], `proof.markets.${market}`)
    exactKeys(
      item,
      [
        "approval",
        "binding",
        "conflictCount",
        "expectedCount",
        "extraCount",
        "failedCount",
        "missingCount",
        "observedCount",
        "pendingCount",
        "projectionSha256",
        "projections",
        "segmentRegistry",
      ],
      `proof.markets.${market}`
    )
    if (!Array.isArray(item.projections)) {
      throw new Error(
        `four-market-static-taxonomy: ${market}.projections must be an array`
      )
    }
    observedProjections.push(
      ...item.projections.map((projection, index) =>
        normalizeProjection(projection, `${market}.projections[${index}]`)
      )
    )
    segmentRegistryByMarket[market] = segmentRegistryRef(
      item.segmentRegistry,
      market,
      `${market}.segmentRegistry`
    )
    health.push({
      conflictCount: count(item.conflictCount, `${market}.conflictCount`),
      failedCount: count(item.failedCount, `${market}.failedCount`),
      market,
      pendingCount: count(item.pendingCount, `${market}.pendingCount`),
    })
  }
  const rebuilt = buildFourMarketStaticTaxonomyConvergence({
    environmentId: safeId(proof.environmentId, "environmentId"),
    generatedAt: timestamp(proof.generatedAt),
    health,
    manifest,
    migrationLedgerSha256: rawSha256(
      proof.migrationLedgerSha256,
      "migrationLedgerSha256"
    ),
    observedProjections,
    releaseId: safeId(proof.releaseId, "releaseId"),
    segmentRegistryByMarket,
  })
  if (
    !SHA256.test(proof.aggregateSha256 as string) ||
    canonical(proof) !== canonical(rebuilt)
  ) {
    throw new Error(
      "four-market-static-taxonomy: proof does not match its manifest/build"
    )
  }
  return rebuilt
}

export const serializeFourMarketStaticTaxonomyConvergence = (
  proof: FourMarketStaticTaxonomyConvergence
): string => `${canonical(proof)}\n`

export const hashFourMarketStaticTaxonomyConvergenceFile = (
  proof: FourMarketStaticTaxonomyConvergence
): string =>
  createHash("sha256")
    .update(serializeFourMarketStaticTaxonomyConvergence(proof))
    .digest("hex")

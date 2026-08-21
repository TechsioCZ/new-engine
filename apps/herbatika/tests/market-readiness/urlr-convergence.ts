import { createHash } from "node:crypto"
import {
  hashPopulationManifest,
  parsePopulationManifest,
} from "../../src/lib/url-registry/population/manifest"
import {
  POPULATION_CATALOG_KINDS,
  POPULATION_MARKETS,
  type PopulationManifest,
} from "../../src/lib/url-registry/population/manifest-contracts"
import { canonicalizePopulationValue } from "../../src/lib/url-registry/population/manifest-primitives"

export const FOUR_MARKET_URLR_CONVERGENCE_KIND =
  "herbatika-four-market-urlr-convergence" as const

export type ReadinessMarket = (typeof POPULATION_MARKETS)[number]
export type ReadinessCatalogKind = (typeof POPULATION_CATALOG_KINDS)[number]

export type UrlrCatalogProjection = Readonly<{
  equivalenceKey: string
  indexPolicy: "indexable" | "noindex"
  kind: ReadinessCatalogKind
  locale: string
  market: ReadinessMarket
  publicSlug: string
  salesChannelId: string
  sourceId: string
  sourceVersion: string
}>

export type UrlrMarketHealth = Readonly<{
  conflictCount: number
  failedCount: number
  market: ReadinessMarket
  pendingCount: number
  processingCount: number
}>

type ProjectionSummary = Readonly<{ count: number; sha256: string }>

export type UrlrMarketConvergence = Readonly<{
  binding: Readonly<{
    locale: string
    market: ReadinessMarket
    salesChannelId: string
  }>
  byKind: Readonly<Record<ReadinessCatalogKind, ProjectionSummary>>
  conflictCount: 0
  expectedCount: number
  extraCount: 0
  failedCount: 0
  missingCount: 0
  observedCount: number
  pendingCount: 0
  processingCount: 0
  projectionSha256: string
  projections: readonly UrlrCatalogProjection[]
}>

export type FourMarketUrlrConvergence = Readonly<{
  aggregateSha256: string
  environmentId: string
  generatedAt: string
  kind: typeof FOUR_MARKET_URLR_CONVERGENCE_KIND
  markets: Readonly<Record<ReadinessMarket, UrlrMarketConvergence>>
  migrationLedgerSha256: string
  populationManifestSha256: `sha256:${string}`
  releaseId: string
  schemaVersion: 1
  state: "converged"
}>

const SHA256 = /^[a-f0-9]{64}$/
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/

const canonical = (value: unknown): string =>
  JSON.stringify(canonicalizePopulationValue(value))

export const sha256MarketReadinessValue = (value: unknown): string =>
  createHash("sha256").update(canonical(value)).digest("hex")

const record = (value: unknown, label: string): Record<string, unknown> => {
  if (!(value && typeof value === "object" && !Array.isArray(value))) {
    throw new Error(`four-market-urlr: ${label} must be an object`)
  }
  return value as Record<string, unknown>
}

const exactKeys = (
  value: Record<string, unknown>,
  keys: readonly string[],
  label: string
) => {
  if (canonical(Object.keys(value).sort()) !== canonical([...keys].sort())) {
    throw new Error(`four-market-urlr: ${label} has invalid fields`)
  }
}

const timestamp = (value: unknown): string => {
  if (typeof value !== "string") {
    throw new Error("four-market-urlr: generatedAt is invalid")
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString() !== value) {
    throw new Error("four-market-urlr: generatedAt is invalid")
  }
  return value
}

const safeId = (value: unknown, label: string): string => {
  if (typeof value !== "string" || !SAFE_ID.test(value)) {
    throw new Error(`four-market-urlr: ${label} is invalid`)
  }
  return value
}

const rawSha256 = (value: unknown, label: string): string => {
  if (typeof value !== "string" || !SHA256.test(value)) {
    throw new Error(`four-market-urlr: ${label} is invalid`)
  }
  return value
}

const count = (value: unknown, label: string): number => {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new Error(`four-market-urlr: ${label} must be nonnegative`)
  }
  return value as number
}

const asMarket = (value: unknown, label: string): ReadinessMarket => {
  if (!POPULATION_MARKETS.includes(value as ReadinessMarket)) {
    throw new Error(`four-market-urlr: ${label} is invalid`)
  }
  return value as ReadinessMarket
}

const normalizeProjection = (
  value: unknown,
  label: string
): UrlrCatalogProjection => {
  const projection = record(value, label)
  exactKeys(
    projection,
    [
      "equivalenceKey",
      "indexPolicy",
      "kind",
      "locale",
      "market",
      "publicSlug",
      "salesChannelId",
      "sourceId",
      "sourceVersion",
    ],
    label
  )
  const market = asMarket(projection.market, `${label}.market`)
  if (
    !(
      POPULATION_CATALOG_KINDS.includes(
        projection.kind as ReadinessCatalogKind
      ) && ["indexable", "noindex"].includes(projection.indexPolicy as string)
    ) ||
    [
      projection.equivalenceKey,
      projection.locale,
      projection.publicSlug,
      projection.salesChannelId,
      projection.sourceId,
      projection.sourceVersion,
    ].some((item) => typeof item !== "string" || !item)
  ) {
    throw new Error(`four-market-urlr: ${label} is invalid`)
  }
  return { ...projection, market } as UrlrCatalogProjection
}

const projectionKey = (projection: UrlrCatalogProjection): string =>
  `${projection.kind}:${projection.sourceId}`

const projectionOrder = (
  left: UrlrCatalogProjection,
  right: UrlrCatalogProjection
): number => projectionKey(left).localeCompare(projectionKey(right), "en")

export const expectedUrlrCatalogProjections = (
  manifestValue: unknown
): readonly UrlrCatalogProjection[] => {
  const manifest = parsePopulationManifest(manifestValue)
  const bindings = new Map(
    manifest.bindings.map((binding) => [binding.market, binding])
  )
  return manifest.entities
    .filter((entity) =>
      POPULATION_CATALOG_KINDS.includes(entity.kind as ReadinessCatalogKind)
    )
    .map((entity) => {
      const binding = bindings.get(entity.market)
      if (!binding) {
        throw new Error(
          `four-market-urlr: no binding for market ${entity.market}`
        )
      }
      return {
        equivalenceKey: entity.equivalenceKey,
        indexPolicy: entity.indexPolicy,
        kind: entity.kind as ReadinessCatalogKind,
        locale: binding.locale,
        market: entity.market,
        publicSlug: entity.publicSlug,
        salesChannelId: binding.salesChannelId,
        sourceId: entity.sourceId,
        sourceVersion: entity.sourceVersion,
      }
    })
    .sort((left, right) =>
      `${left.market}:${projectionKey(left)}`.localeCompare(
        `${right.market}:${projectionKey(right)}`,
        "en"
      )
    )
}

const healthByMarket = (
  healthValues: readonly UrlrMarketHealth[]
): ReadonlyMap<ReadinessMarket, UrlrMarketHealth> => {
  const result = new Map<ReadinessMarket, UrlrMarketHealth>()
  for (const [index, value] of healthValues.entries()) {
    const health = record(value, `health[${index}]`)
    exactKeys(
      health,
      [
        "conflictCount",
        "failedCount",
        "market",
        "pendingCount",
        "processingCount",
      ],
      `health[${index}]`
    )
    const market = asMarket(health.market, `health[${index}].market`)
    if (result.has(market)) {
      throw new Error(`four-market-urlr: duplicate health for ${market}`)
    }
    result.set(market, {
      conflictCount: count(health.conflictCount, "conflictCount"),
      failedCount: count(health.failedCount, "failedCount"),
      market,
      pendingCount: count(health.pendingCount, "pendingCount"),
      processingCount: count(health.processingCount, "processingCount"),
    })
  }
  if (result.size !== POPULATION_MARKETS.length) {
    throw new Error("four-market-urlr: health must cover every market")
  }
  return result
}

const buildMarketConvergence = (
  input: Readonly<{
    expected: readonly UrlrCatalogProjection[]
    health: UrlrMarketHealth
    manifest: PopulationManifest
    market: ReadinessMarket
    observedValues: readonly UrlrCatalogProjection[]
  }>
): UrlrMarketConvergence => {
  const { expected, health, manifest, market, observedValues } = input
  const observed = observedValues.map((value, index) =>
    normalizeProjection(value, `${market}.projections[${index}]`)
  )
  const expectedMap = new Map(
    expected.map((item) => [projectionKey(item), item])
  )
  const observedMap = new Map<string, UrlrCatalogProjection>()
  let duplicateCount = 0
  for (const item of observed) {
    if (item.market !== market || observedMap.has(projectionKey(item))) {
      duplicateCount += 1
    } else {
      observedMap.set(projectionKey(item), item)
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
    health.processingCount ||
    health.failedCount
  ) {
    throw new Error(
      `four-market-urlr: ${market} is not converged (missing=${missingCount}, extra=${extraCount}, conflict=${conflictCount}, pending=${health.pendingCount}, processing=${health.processingCount}, failed=${health.failedCount})`
    )
  }
  const projections = [...expected].sort(projectionOrder)
  const binding = manifest.bindings.find((item) => item.market === market)
  if (!binding) {
    throw new Error(`four-market-urlr: no binding for market ${market}`)
  }
  const byKind = Object.fromEntries(
    POPULATION_CATALOG_KINDS.map((kind) => {
      const items = projections.filter((item) => item.kind === kind)
      return [
        kind,
        { count: items.length, sha256: sha256MarketReadinessValue(items) },
      ]
    })
  ) as Record<ReadinessCatalogKind, ProjectionSummary>
  return {
    binding,
    byKind,
    conflictCount: 0,
    expectedCount: projections.length,
    extraCount: 0,
    failedCount: 0,
    missingCount: 0,
    observedCount: observed.length,
    pendingCount: 0,
    processingCount: 0,
    projectionSha256: sha256MarketReadinessValue(projections),
    projections,
  }
}

export const buildFourMarketUrlrConvergence = (
  input: Readonly<{
    environmentId: string
    generatedAt: string
    health: readonly UrlrMarketHealth[]
    manifest: unknown
    migrationLedgerSha256: string
    observedProjections: readonly UrlrCatalogProjection[]
    releaseId: string
  }>
): FourMarketUrlrConvergence => {
  const manifest = parsePopulationManifest(input.manifest)
  const expected = expectedUrlrCatalogProjections(manifest)
  const health = healthByMarket(input.health)
  const normalized = input.observedProjections.map((value, index) =>
    normalizeProjection(value, `observedProjections[${index}]`)
  )
  const markets = Object.fromEntries(
    POPULATION_MARKETS.map((market) => [
      market,
      buildMarketConvergence({
        expected: expected.filter((item) => item.market === market),
        health: health.get(market) as UrlrMarketHealth,
        manifest,
        market,
        observedValues: normalized.filter((item) => item.market === market),
      }),
    ])
  ) as Record<ReadinessMarket, UrlrMarketConvergence>
  const populationManifestSha256 = hashPopulationManifest(manifest)
  const core = {
    environmentId: safeId(input.environmentId, "environmentId"),
    kind: FOUR_MARKET_URLR_CONVERGENCE_KIND,
    markets,
    migrationLedgerSha256: rawSha256(
      input.migrationLedgerSha256,
      "migrationLedgerSha256"
    ),
    populationManifestSha256,
    releaseId: safeId(input.releaseId, "releaseId"),
    schemaVersion: 1,
    state: "converged",
  } as const
  return {
    ...core,
    aggregateSha256: sha256MarketReadinessValue(core),
    generatedAt: timestamp(input.generatedAt),
  }
}

export const parseFourMarketUrlrConvergence = (
  value: unknown,
  manifest: unknown
): FourMarketUrlrConvergence => {
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
    ],
    "proof"
  )
  const marketValues = record(proof.markets, "proof.markets")
  exactKeys(marketValues, POPULATION_MARKETS, "proof.markets")
  const observedProjections: UrlrCatalogProjection[] = []
  const health: UrlrMarketHealth[] = []
  for (const market of POPULATION_MARKETS) {
    const item = record(marketValues[market], `proof.markets.${market}`)
    exactKeys(
      item,
      [
        "binding",
        "byKind",
        "conflictCount",
        "expectedCount",
        "extraCount",
        "failedCount",
        "missingCount",
        "observedCount",
        "pendingCount",
        "processingCount",
        "projectionSha256",
        "projections",
      ],
      `proof.markets.${market}`
    )
    if (!Array.isArray(item.projections)) {
      throw new Error(
        `four-market-urlr: ${market}.projections must be an array`
      )
    }
    observedProjections.push(
      ...item.projections.map((projection, index) =>
        normalizeProjection(projection, `${market}.projections[${index}]`)
      )
    )
    health.push({
      conflictCount: count(item.conflictCount, `${market}.conflictCount`),
      failedCount: count(item.failedCount, `${market}.failedCount`),
      market,
      pendingCount: count(item.pendingCount, `${market}.pendingCount`),
      processingCount: count(item.processingCount, `${market}.processingCount`),
    })
  }
  const rebuilt = buildFourMarketUrlrConvergence({
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
  })
  if (
    !SHA256.test(proof.aggregateSha256 as string) ||
    canonical(proof) !== canonical(rebuilt)
  ) {
    throw new Error("four-market-urlr: proof does not match its manifest")
  }
  return rebuilt
}

export const serializeFourMarketUrlrConvergence = (
  proof: FourMarketUrlrConvergence
): string => `${canonical(proof)}\n`

export const hashFourMarketUrlrConvergenceFile = (
  proof: FourMarketUrlrConvergence
): string =>
  createHash("sha256")
    .update(serializeFourMarketUrlrConvergence(proof))
    .digest("hex")

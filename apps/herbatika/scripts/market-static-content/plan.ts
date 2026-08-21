import { parseMarketStaticContentManifest } from "./manifest"
import {
  canonicalStaticContentJson,
  hashStaticContentBytes,
} from "./primitives"
import {
  type MarketStaticContentOperation,
  type MarketStaticContentPlan,
  type MarketStaticContentPlanBuild,
  STATIC_CONTENT_KINDS,
  STATIC_CONTENT_LOCALE_BY_MARKET,
  STATIC_CONTENT_MARKETS,
  type StaticContentKind,
} from "./types"

export type MarketStaticContentManifestInput = Readonly<{
  contents: string
  label: string
}>

const emptyCounts = (): Record<StaticContentKind, number> => ({
  about: 0,
  "cms-legal": 0,
  "cms-static": 0,
  faq: 0,
  footer: 0,
  "homepage-hero": 0,
  "operator-identity": 0,
})

const operationOrder = (
  left: MarketStaticContentOperation,
  right: MarketStaticContentOperation
) => left.entityKey.localeCompare(right.entityKey, "en")

export const buildMarketStaticContentPlan = (
  inputs: readonly MarketStaticContentManifestInput[]
): MarketStaticContentPlanBuild => {
  if (inputs.length !== STATIC_CONTENT_MARKETS.length) {
    throw new Error("exactly one manifest per supported market is required")
  }
  const parsed = inputs.map((input) => ({
    manifest: parseMarketStaticContentManifest(input.contents, input.label),
    manifestSha256: hashStaticContentBytes(input.contents),
  }))
  const byMarket = new Map(
    parsed.map((item) => [item.manifest.market, item] as const)
  )
  if (byMarket.size !== STATIC_CONTENT_MARKETS.length) {
    throw new Error("source manifests contain duplicate markets")
  }
  for (const market of STATIC_CONTENT_MARKETS) {
    if (!byMarket.has(market)) {
      throw new Error(`source manifest for market ${market} is missing`)
    }
  }
  if (
    new Set(parsed.map(({ manifest }) => manifest.segmentRegistry.sha256))
      .size !== 1
  ) {
    throw new Error("source manifests are bound to different route registries")
  }
  const operations = parsed
    .flatMap(({ manifest }) =>
      manifest.entries.map(
        (entry): MarketStaticContentOperation => ({
          approvals: entry.approvals,
          artifact: entry.artifact,
          contentKind: entry.contentKind,
          entityKey: `${manifest.market}:${entry.contentKind}:${entry.id}`,
          locale: manifest.locale,
          market: manifest.market,
          ready: true,
          source: entry.source,
        })
      )
    )
    .sort(operationOrder)
  if (
    new Set(operations.map(({ entityKey }) => entityKey)).size !==
    operations.length
  ) {
    throw new Error("source manifests produce duplicate operation keys")
  }
  const markets = STATIC_CONTENT_MARKETS.map((market) => {
    const counts = emptyCounts()
    for (const operation of operations) {
      if (operation.market === market) {
        counts[operation.contentKind] += 1
      }
    }
    return {
      counts,
      locale: STATIC_CONTENT_LOCALE_BY_MARKET[market],
      market,
      ready: true as const,
    }
  })
  const sourceManifests = STATIC_CONTENT_MARKETS.map((market) => {
    const item = byMarket.get(market)
    if (!item) {
      throw new Error(`source manifest for market ${market} is missing`)
    }
    return {
      capturedAt: item.manifest.capturedAt,
      locale: item.manifest.locale,
      manifestSha256: item.manifestSha256,
      market,
      marketArtifacts: item.manifest.marketArtifacts,
      operatorContactAuthority: item.manifest.operatorContactAuthority,
      segmentRegistry: item.manifest.segmentRegistry,
    }
  })
  const withoutPlanHash = {
    authorization: "customer-reviewed-static-content" as const,
    kind: "market-static-content-import-readiness-plan" as const,
    operations,
    readiness: {
      markets,
      ready: true as const,
      requiredContentKinds: STATIC_CONTENT_KINDS,
    },
    schemaVersion: 1 as const,
    sourceManifests,
  }
  const planSha256 = hashStaticContentBytes(
    canonicalStaticContentJson(withoutPlanHash)
  )
  const plan: MarketStaticContentPlan = { ...withoutPlanHash, planSha256 }
  const canonicalJson = canonicalStaticContentJson(plan)
  return {
    canonicalJson,
    plan,
    sha256: hashStaticContentBytes(canonicalJson),
  }
}

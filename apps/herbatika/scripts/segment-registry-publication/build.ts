import {
  canonicalPublicationJson,
  currentPublicationTaxonomySha256,
  hashPublicationBytes,
  requiredPublicationRoutes,
  SEGMENT_REGISTRY_PUBLICATION_LOCALE,
  SEGMENT_REGISTRY_PUBLICATION_MARKETS,
  type SegmentRegistryPublicationArtifact,
} from "../../src/lib/url/segment-registry-publication"
import { entityKeyForStaticPage } from "../../src/lib/url/segment-registry-publication/parse-route"
import type { ParsedMarketStaticContentPlan } from "../market-static-content/plan-parser"
import type { MarketStaticContentOperation } from "../market-static-content/types"

export type BuiltSegmentRegistryPublication = Readonly<{
  artifact: SegmentRegistryPublicationArtifact
  canonicalJson: string
  market: (typeof SEGMENT_REGISTRY_PUBLICATION_MARKETS)[number]
  ref: string
  sha256: string
}>

const operationForRoute = (
  operations: readonly MarketStaticContentOperation[],
  market: BuiltSegmentRegistryPublication["market"],
  pageKey: Parameters<typeof entityKeyForStaticPage>[1]
) => {
  const entityKey = entityKeyForStaticPage(market, pageKey)
  const matches = operations.filter(
    (operation) => operation.entityKey === entityKey && operation.ready === true
  )
  if (matches.length !== 1) {
    throw new Error(
      `${entityKey} requires exactly one ready reviewed operation`
    )
  }
  return matches[0]
}

const approvalRef = (
  approval: MarketStaticContentOperation["approvals"]["editorial"]
) => ({
  artifact: approval.approvalArtifact,
  artifactSha256: approval.artifactSha256,
  reference: approval.reference,
  sourceSnapshotSha256: approval.sourceSnapshotSha256,
})

export const buildSegmentRegistryPublicationArtifacts = (
  parsed: ParsedMarketStaticContentPlan,
  sourcePlanRef: string
): readonly BuiltSegmentRegistryPublication[] => {
  if (!sourcePlanRef.trim() || sourcePlanRef.trim() !== sourcePlanRef) {
    throw new Error("source plan ref must be a nonblank trimmed string")
  }
  const registryHashes = new Set(
    parsed.plan.sourceManifests.map(({ segmentRegistry }) =>
      segmentRegistry.sha256.toLowerCase()
    )
  )
  if (registryHashes.size !== 1) {
    throw new Error("source plan is not bound to one frozen segment registry")
  }
  const frozenRegistrySha256 = [...registryHashes][0]
  const frozenRegistry = {
    kind: "market-route-segment-registry" as const,
    ref: "market-static-content/shared/segment-registry.json" as const,
    sha256: frozenRegistrySha256,
  }
  return SEGMENT_REGISTRY_PUBLICATION_MARKETS.map((market) => {
    const required = requiredPublicationRoutes(market)
    const routes = required.map(({ routeKey, staticPageKey }) => {
      const operation = operationForRoute(
        parsed.plan.operations,
        market,
        staticPageKey
      )
      return {
        editorialApproval: approvalRef(operation.approvals.editorial),
        frozenRegistrySha256,
        legalApproval: approvalRef(operation.approvals.legal),
        routeKey,
        staticContentArtifact: operation.artifact,
        staticPageKey,
      }
    })
    const artifact: SegmentRegistryPublicationArtifact = {
      authorization: "customer-reviewed-static-content",
      frozenRegistry,
      gate: "G1",
      kind: "market-segment-registry-g1-approval",
      locale: SEGMENT_REGISTRY_PUBLICATION_LOCALE[market],
      market,
      readiness: {
        approvedRouteCount: routes.length,
        ready: true,
        requiredRouteKeys: required.map(({ routeKey }) => routeKey),
      },
      routes,
      schemaVersion: 1,
      sourcePlan: {
        kind: "market-static-content-import-readiness-plan",
        planSha256: parsed.plan.planSha256,
        ref: sourcePlanRef,
        sha256: parsed.sha256,
      },
      status: "approved",
      taxonomySha256: currentPublicationTaxonomySha256(),
    }
    const canonicalJson = canonicalPublicationJson(artifact)
    return {
      artifact,
      canonicalJson,
      market,
      ref: `segment-registry-g1/${market}.json`,
      sha256: hashPublicationBytes(canonicalJson),
    }
  })
}

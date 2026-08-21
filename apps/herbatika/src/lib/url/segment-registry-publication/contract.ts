import type { Market, StaticRootPageKey } from "@/lib/url/types"

export const SEGMENT_REGISTRY_PUBLICATION_MARKETS = [
  "cz",
  "hu",
  "ro",
  "sk",
] as const satisfies readonly Market[]

export const SEGMENT_REGISTRY_PUBLICATION_LOCALE = {
  cz: "cs-CZ",
  hu: "hu-HU",
  ro: "ro-RO",
  sk: "sk-SK",
} as const satisfies Record<Market, string>

export const SEGMENT_REGISTRY_PUBLICATION_ENV =
  "HERBATIKA_SEGMENT_REGISTRY_G1_DIR"

export type PublicationArtifactRef = Readonly<{
  kind: "market-static-content"
  mediaType: "application/json"
  ref: string
  sha256: string
}>

export type PublicationApprovalRef = Readonly<{
  artifact: Readonly<{
    kind:
      | "market-static-content-editorial-approval"
      | "market-static-content-legal-approval"
    mediaType: "application/json"
    ref: string
    sha256: string
  }>
  artifactSha256: string
  reference: string
  sourceSnapshotSha256: string
}>

export type SegmentRegistryPublicationRoute = Readonly<{
  editorialApproval: PublicationApprovalRef
  frozenRegistrySha256: string
  legalApproval: PublicationApprovalRef
  routeKey: string
  staticContentArtifact: PublicationArtifactRef
  staticPageKey: StaticRootPageKey
}>

export type SegmentRegistryPublicationArtifact = Readonly<{
  authorization: "customer-reviewed-static-content"
  frozenRegistry: Readonly<{
    kind: "market-route-segment-registry"
    ref: "market-static-content/shared/segment-registry.json"
    sha256: string
  }>
  gate: "G1"
  kind: "market-segment-registry-g1-approval"
  locale: string
  market: Market
  readiness: Readonly<{
    approvedRouteCount: number
    ready: true
    requiredRouteKeys: readonly string[]
  }>
  routes: readonly SegmentRegistryPublicationRoute[]
  schemaVersion: 1
  sourcePlan: Readonly<{
    kind: "market-static-content-import-readiness-plan"
    planSha256: string
    ref: string
    sha256: string
  }>
  status: "approved"
  taxonomySha256: string
}>

export type ParsedSegmentRegistryPublication = Readonly<{
  artifact: SegmentRegistryPublicationArtifact
  sha256: string
}>

export type StaticRoutePublicationDecision =
  | Readonly<{
      evidence: Readonly<{
        editorialApprovalReference: string
        frozenRegistrySha256: string
        legalApprovalReference: string
        staticContentArtifactSha256: string
      }>
      kind: "approved"
    }>
  | Readonly<{
      kind: "not-required"
      reason: "route-not-indexable"
    }>
  | Readonly<{
      kind: "rejected"
      reason: "artifact-unavailable" | "market-mismatch" | "route-not-approved"
    }>

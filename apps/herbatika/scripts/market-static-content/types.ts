export const STATIC_CONTENT_MARKETS = ["cz", "hu", "ro", "sk"] as const
export type StaticContentMarket = (typeof STATIC_CONTENT_MARKETS)[number]

export const STATIC_CONTENT_LOCALE_BY_MARKET = {
  cz: "cs-CZ",
  hu: "hu-HU",
  ro: "ro-RO",
  sk: "sk-SK",
} as const satisfies Record<StaticContentMarket, string>

export type StaticContentLocale =
  (typeof STATIC_CONTENT_LOCALE_BY_MARKET)[StaticContentMarket]

export const STATIC_CONTENT_KINDS = [
  "about",
  "cms-legal",
  "cms-static",
  "faq",
  "footer",
  "homepage-hero",
  "operator-identity",
] as const
export type StaticContentKind = (typeof STATIC_CONTENT_KINDS)[number]

export type StaticContentApproval = Readonly<{
  approvalArtifact: Readonly<{
    kind:
      | "market-static-content-editorial-approval"
      | "market-static-content-legal-approval"
    mediaType: "application/json"
    ref: string
    sha256: string
  }>
  approvedAt: string
  approvedBy: string
  artifactSha256: string
  reference: string
  sourceSnapshotSha256: string
  status: "approved"
}>

export type StaticContentSourceEntry = Readonly<{
  approvals: Readonly<{
    editorial: StaticContentApproval
    legal: StaticContentApproval
  }>
  artifact: Readonly<{
    kind: "market-static-content"
    mediaType: "application/json"
    ref: string
    sha256: string
  }>
  contentKind: StaticContentKind
  id: string
  provenance: "reviewed-official-source"
  source: Readonly<{
    rawSnapshotSha256: string
    retrievedAt: string
    url: string
  }>
}>

export const OPERATOR_CONTACT_FIELDS = [
  "email",
  "legal-entity",
  "phone",
  "social-ids",
  "support-origin",
] as const
export type OperatorContactField = (typeof OPERATOR_CONTACT_FIELDS)[number]

export type OperatorContactAuthority = Readonly<{
  editorialApprovalReference: string
  entryId: string
  fieldCoverage: Readonly<Record<OperatorContactField, "approved">>
  legalApprovalReference: string
  market: StaticContentMarket
}>

export type SegmentRegistryAuthority = Readonly<{
  kind: "market-route-segment-registry"
  ref: "market-static-content/shared/segment-registry.json"
  sha256: string
}>

export type MarketStaticContentAggregateRefs = Readonly<{
  editorialApproval: Readonly<{
    kind: "market-static-content-editorial-approval-collection"
    mediaType: "application/json"
    ref: string
    sha256: string
  }>
  legalApproval: Readonly<{
    kind: "market-static-content-legal-approval-collection"
    mediaType: "application/json"
    ref: string
    sha256: string
  }>
  staticContent: Readonly<{
    kind: "market-static-content-collection"
    mediaType: "application/json"
    ref: string
    sha256: string
  }>
}>

export const STATIC_CONTENT_POLICY_VERSIONS = {
  checkoutConsent: "2026-08-21",
  registrationTerms: "2026-08-21",
} as const
export type StaticContentPolicyVersions = typeof STATIC_CONTENT_POLICY_VERSIONS

export type MarketStaticContentArtifact = Readonly<{
  contentKind: StaticContentKind
  entryId: string
  kind: "market-static-content"
  locale: StaticContentLocale
  market: StaticContentMarket
  payload: Readonly<{
    kind: "market-static-content-reviewed-payload"
    mediaType: "application/json"
    ref: string
    sha256: string
  }>
  policyVersions: StaticContentPolicyVersions
  provenance: "reviewed-official-source"
  schemaVersion: 1
  segmentRegistrySha256: string
  source: StaticContentSourceEntry["source"]
}>

export type MarketStaticContentApprovalArtifact = Readonly<{
  approvedAt: string
  approvedBy: string
  contentKind: StaticContentKind
  entryId: string
  kind:
    | "market-static-content-editorial-approval"
    | "market-static-content-legal-approval"
  locale: StaticContentLocale
  market: StaticContentMarket
  reference: string
  schemaVersion: 1
  status: "approved"
  subject: Readonly<{
    policyVersions: StaticContentPolicyVersions
    segmentRegistrySha256: string
    sourceSnapshotSha256: string
    staticContentArtifactRef: string
    staticContentArtifactSha256: string
  }>
}>

export type MarketStaticContentCollectionEntry = Readonly<{
  contentKind: StaticContentKind
  entryId: string
  payloadRef: string
  payloadSha256: string
  ref: string
  sha256: string
}>

export type MarketStaticContentApprovalCollectionEntry = Readonly<{
  contentKind: StaticContentKind
  entryId: string
  ref: string
  sha256: string
  sourceSnapshotSha256: string
  staticContentArtifactRef: string
  staticContentArtifactSha256: string
}>

export type MarketStaticContentCollectionArtifact = Readonly<{
  entries: readonly MarketStaticContentCollectionEntry[]
  kind: "market-static-content-collection"
  locale: StaticContentLocale
  market: StaticContentMarket
  policyVersions: StaticContentPolicyVersions
  ready: true
  schemaVersion: 1
  segmentRegistrySha256: string
}>

export type MarketStaticContentApprovalCollectionArtifact = Readonly<{
  entries: readonly MarketStaticContentApprovalCollectionEntry[]
  kind:
    | "market-static-content-editorial-approval-collection"
    | "market-static-content-legal-approval-collection"
  locale: StaticContentLocale
  market: StaticContentMarket
  policyVersions: StaticContentPolicyVersions
  ready: true
  schemaVersion: 1
  segmentRegistrySha256: string
}>

export type MarketStaticContentSourceManifest = Readonly<{
  authorization: "customer-reviewed-static-content"
  capturedAt: string
  entries: readonly StaticContentSourceEntry[]
  kind: "market-static-content-source-manifest"
  locale: StaticContentLocale
  market: StaticContentMarket
  marketArtifacts: MarketStaticContentAggregateRefs
  operatorContactAuthority: OperatorContactAuthority
  provenance: "reviewed-official-source"
  schemaVersion: 1
  segmentRegistry: SegmentRegistryAuthority
}>

export type MarketStaticContentOperation = Readonly<{
  approvals: StaticContentSourceEntry["approvals"]
  artifact: StaticContentSourceEntry["artifact"]
  contentKind: StaticContentKind
  entityKey: string
  locale: StaticContentLocale
  market: StaticContentMarket
  ready: true
  source: StaticContentSourceEntry["source"]
}>

export type MarketStaticContentPlan = Readonly<{
  authorization: "customer-reviewed-static-content"
  kind: "market-static-content-import-readiness-plan"
  operations: readonly MarketStaticContentOperation[]
  planSha256: string
  readiness: Readonly<{
    markets: readonly Readonly<{
      counts: Readonly<Record<StaticContentKind, number>>
      locale: StaticContentLocale
      market: StaticContentMarket
      ready: true
    }>[]
    ready: true
    requiredContentKinds: typeof STATIC_CONTENT_KINDS
  }>
  schemaVersion: 1
  sourceManifests: readonly Readonly<{
    capturedAt: string
    locale: StaticContentLocale
    manifestSha256: string
    market: StaticContentMarket
    marketArtifacts: MarketStaticContentAggregateRefs
    operatorContactAuthority: OperatorContactAuthority
    segmentRegistry: SegmentRegistryAuthority
  }>[]
}>

export type MarketStaticContentPlanBuild = Readonly<{
  canonicalJson: string
  plan: MarketStaticContentPlan
  sha256: string
}>

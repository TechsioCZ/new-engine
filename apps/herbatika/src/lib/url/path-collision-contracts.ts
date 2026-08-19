import type { Market } from "./types"

export type PublicPathClaimKind =
  | "account"
  | "alias"
  | "auth"
  | "checkout"
  | "current-slug"
  | "facet"
  | "gone"
  | "historical-combination"
  | "historical-prefix"
  | "prefix"
  | "review"
  | "static"

export type PublicPathClaimOwner = Readonly<{
  equivalenceKey?: string | null
  routeId: string
  routeKind: string
  sourceId: string
  sourceKind: string
}>

export type PublicPathClaim = Readonly<{
  claimId: string
  claimKind: PublicPathClaimKind
  market: Market
  owner: PublicPathClaimOwner
  /** A concrete public path. Templates, wildcards, queries, and origins fail. */
  path: string
}>

export type PublicHostAssignment = Readonly<{
  assignmentId: string
  host: string
  market: Market
}>

export type InvalidPublicPathReason =
  | "empty-segment"
  | "encoded-separator"
  | "malformed-percent-encoding"
  | "noncanonical-segment"
  | "query-or-fragment"
  | "relative-path"
  | "trailing-slash"
  | "unsafe-character"

export type InvalidHostAssignmentReason =
  | "invalid-hostname"
  | "malformed-percent-encoding"
  | "noncanonical-hostname"

export type PublicPathCollisionDiagnostic =
  | Readonly<{
      claimId: string
      code: "invalid-public-path"
      market: Market
      path: string
      reason: InvalidPublicPathReason
    }>
  | Readonly<{
      claimId: string
      code: "reserved-public-segment"
      market: Market
      path: string
      reservedSegment: string
    }>
  | Readonly<{
      claimIds: readonly string[]
      code: "duplicate-public-path"
      market: Market
      normalizedPath: string
    }>
  | Readonly<{
      assignmentId: string
      code: "invalid-host-assignment"
      host: string
      market: Market
      reason: InvalidHostAssignmentReason
    }>
  | Readonly<{
      assignmentIds: readonly string[]
      code: "conflicting-host-assignment"
      markets: readonly Market[]
      normalizedHost: string
    }>
  | Readonly<{
      claimIds: readonly string[]
      code: "conflicting-route-binding"
      market: Market
      routeId: string
    }>
  | Readonly<{
      claimIds: readonly string[]
      code: "conflicting-source-binding"
      market: Market
      sourceId: string
      sourceKind: string
    }>
  | Readonly<{
      claimIds: readonly string[]
      code: "conflicting-equivalence-mapping"
      equivalenceKey: string
    }>

export type PublicPathCollisionInput = Readonly<{
  hostAssignments?: readonly PublicHostAssignment[]
  pathClaims: readonly PublicPathClaim[]
}>

export type PublicPathCollisionResult =
  | Readonly<{ ok: true }>
  | Readonly<{
      diagnostics: readonly PublicPathCollisionDiagnostic[]
      ok: false
    }>

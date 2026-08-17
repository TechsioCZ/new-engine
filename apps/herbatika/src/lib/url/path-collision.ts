import {
  createPublishedSlug,
  MAX_PUBLISHED_SLUG_LENGTH,
  type PublishedSlugLocale,
  RESERVED_PUBLIC_PATH_SEGMENTS,
} from "./slug"
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

export class PublicPathCollisionError extends Error {
  override readonly name = "PublicPathCollisionError"
  readonly diagnostics: readonly PublicPathCollisionDiagnostic[]

  constructor(diagnostics: readonly PublicPathCollisionDiagnostic[]) {
    super(
      `Public URL collision validation failed with ${diagnostics.length} diagnostic(s)`
    )
    this.diagnostics = diagnostics
  }
}

const MARKET_SLUG_LOCALES = {
  cz: "cs-CZ",
  hu: "hu-HU",
  ro: "ro-RO",
  sk: "sk-SK",
} as const satisfies Readonly<Record<Market, PublishedSlugLocale>>

const CANONICAL_SEGMENT_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const CANONICAL_HOST_PATTERN =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/
const MALFORMED_PERCENT_PATTERN = /%(?![0-9a-f]{2})/i
const TRAILING_DOT_PATTERN = /\.$/u
const UNSAFE_CODE_POINT_RANGES = [
  [0x00, 0x1f],
  [0x7f, 0x9f],
  [0x20_0b, 0x20_0f],
  [0x20_2a, 0x20_2e],
  [0x20_60, 0x20_60],
  [0x20_66, 0x20_69],
  [0xfe_ff, 0xfe_ff],
] as const

const RESERVED_SEGMENT_BY_FOLDED_VALUE = new Map(
  RESERVED_PUBLIC_PATH_SEGMENTS.map((segment) => [
    segment.toLowerCase(),
    segment,
  ])
)

type DecodeResult =
  | Readonly<{ changed: boolean; ok: true; value: string }>
  | Readonly<{ ok: false }>

type AnalyzedPath = Readonly<{
  diagnostics: readonly PublicPathCollisionDiagnostic[]
  normalizedPath?: string
}>

type AnalyzedSegment = Readonly<{
  invalidReason?: InvalidPublicPathReason
  normalizedSegment?: string
  reservedDiagnostic?: PublicPathCollisionDiagnostic
}>

const createGroupKey = (...parts: readonly string[]): string =>
  JSON.stringify(parts)

function decodeAtMostTwice(value: string): DecodeResult {
  let current = value
  let changed = false

  for (let pass = 0; pass < 2 && current.includes("%"); pass += 1) {
    if (MALFORMED_PERCENT_PATTERN.test(current)) {
      return { ok: false }
    }

    try {
      const decoded = decodeURIComponent(current)
      changed ||= decoded !== current
      current = decoded
    } catch {
      return { ok: false }
    }
  }

  return { changed, ok: true, value: current }
}

function foldReservedSegment(value: string): string {
  return value.normalize("NFKC").toLowerCase()
}

function normalizeSegmentForComparison(
  value: string,
  market: Market
): string | undefined {
  const folded = foldReservedSegment(value)
  if (RESERVED_SEGMENT_BY_FOLDED_VALUE.has(folded)) {
    return folded
  }

  try {
    return createPublishedSlug(value, { locale: MARKET_SLUG_LOCALES[market] })
  } catch {
    return
  }
}

function hasUnsafeCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0
    return UNSAFE_CODE_POINT_RANGES.some(
      ([minimum, maximum]) => codePoint >= minimum && codePoint <= maximum
    )
  })
}

function getStructuralPathReason(
  path: string
): InvalidPublicPathReason | undefined {
  if (!path.startsWith("/")) {
    return "relative-path"
  }
  if (path.includes("?") || path.includes("#")) {
    return "query-or-fragment"
  }
  if (path !== "/" && path.endsWith("/")) {
    return "trailing-slash"
  }
  return
}

function analyzeSegment(
  claim: PublicPathClaim,
  rawSegment: string
): AnalyzedSegment {
  const decoded = decodeAtMostTwice(rawSegment)
  if (!decoded.ok) {
    return { invalidReason: "malformed-percent-encoding" }
  }
  if (decoded.value.includes("/") || decoded.value.includes("\\")) {
    return { invalidReason: "encoded-separator" }
  }
  if (hasUnsafeCharacter(decoded.value)) {
    return { invalidReason: "unsafe-character" }
  }

  const folded = foldReservedSegment(decoded.value)
  const reservedSegment = RESERVED_SEGMENT_BY_FOLDED_VALUE.get(folded)
  const isCanonicalSegment =
    !decoded.changed &&
    rawSegment.length <= MAX_PUBLISHED_SLUG_LENGTH &&
    CANONICAL_SEGMENT_PATTERN.test(rawSegment)
  const isCanonicalReservedSegment = rawSegment === reservedSegment
  const invalidReason =
    isCanonicalSegment || isCanonicalReservedSegment
      ? undefined
      : "noncanonical-segment"
  const reservedDiagnostic = reservedSegment
    ? {
        claimId: claim.claimId,
        code: "reserved-public-segment" as const,
        market: claim.market,
        path: claim.path,
        reservedSegment,
      }
    : undefined

  return {
    invalidReason,
    normalizedSegment: normalizeSegmentForComparison(
      decoded.value,
      claim.market
    ),
    reservedDiagnostic,
  }
}

function analyzePath(claim: PublicPathClaim): AnalyzedPath {
  const diagnostics: PublicPathCollisionDiagnostic[] = []
  let invalidReason = getStructuralPathReason(claim.path)
  const rawSegments = claim.path === "/" ? [] : claim.path.slice(1).split("/")
  const hasEmptySegment = rawSegments.some((segment) => segment.length === 0)
  invalidReason ??= hasEmptySegment ? "empty-segment" : undefined

  const normalizedSegments: string[] = []
  let canBuildComparisonPath = claim.path.startsWith("/")

  for (const rawSegment of rawSegments.filter(Boolean)) {
    const analyzed = analyzeSegment(claim, rawSegment)
    invalidReason ??= analyzed.invalidReason
    if (analyzed.reservedDiagnostic) {
      diagnostics.push(analyzed.reservedDiagnostic)
    }
    if (analyzed.normalizedSegment) {
      normalizedSegments.push(analyzed.normalizedSegment)
    } else {
      canBuildComparisonPath = false
    }
  }

  if (invalidReason) {
    diagnostics.unshift({
      claimId: claim.claimId,
      code: "invalid-public-path",
      market: claim.market,
      path: claim.path,
      reason: invalidReason,
    })
  }

  if (!canBuildComparisonPath) {
    return { diagnostics }
  }

  return {
    diagnostics,
    normalizedPath:
      normalizedSegments.length === 0
        ? "/"
        : `/${normalizedSegments.join("/")}`,
  }
}

function addPathDiagnostics(
  claims: readonly PublicPathClaim[],
  diagnostics: PublicPathCollisionDiagnostic[]
): void {
  const pathGroups = new Map<
    string,
    { market: Market; normalizedPath: string; claimIds: string[] }
  >()

  for (const claim of claims) {
    const analyzed = analyzePath(claim)
    diagnostics.push(...analyzed.diagnostics)
    if (!analyzed.normalizedPath) {
      continue
    }

    const key = createGroupKey(claim.market, analyzed.normalizedPath)
    const group = pathGroups.get(key)
    if (group) {
      group.claimIds.push(claim.claimId)
    } else {
      pathGroups.set(key, {
        claimIds: [claim.claimId],
        market: claim.market,
        normalizedPath: analyzed.normalizedPath,
      })
    }
  }

  for (const group of pathGroups.values()) {
    if (group.claimIds.length > 1) {
      diagnostics.push({
        claimIds: group.claimIds,
        code: "duplicate-public-path",
        market: group.market,
        normalizedPath: group.normalizedPath,
      })
    }
  }
}

function addRouteAndSourceDiagnostics(
  claims: readonly PublicPathClaim[],
  diagnostics: PublicPathCollisionDiagnostic[]
): void {
  const routeGroups = new Map<
    string,
    { claims: PublicPathClaim[]; market: Market; routeId: string }
  >()
  const sourceGroups = new Map<
    string,
    {
      claims: PublicPathClaim[]
      market: Market
      sourceId: string
      sourceKind: string
    }
  >()

  for (const claim of claims) {
    const routeKey = createGroupKey(claim.market, claim.owner.routeId)
    const routeGroup = routeGroups.get(routeKey)
    if (routeGroup) {
      routeGroup.claims.push(claim)
    } else {
      routeGroups.set(routeKey, {
        claims: [claim],
        market: claim.market,
        routeId: claim.owner.routeId,
      })
    }

    const sourceKey = createGroupKey(
      claim.market,
      claim.owner.sourceKind,
      claim.owner.sourceId
    )
    const sourceGroup = sourceGroups.get(sourceKey)
    if (sourceGroup) {
      sourceGroup.claims.push(claim)
    } else {
      sourceGroups.set(sourceKey, {
        claims: [claim],
        market: claim.market,
        sourceId: claim.owner.sourceId,
        sourceKind: claim.owner.sourceKind,
      })
    }
  }

  for (const group of routeGroups.values()) {
    const bindings = new Set(
      group.claims.map(({ owner }) =>
        createGroupKey(
          owner.routeKind,
          owner.sourceKind,
          owner.sourceId,
          owner.equivalenceKey ?? ""
        )
      )
    )
    if (bindings.size > 1) {
      diagnostics.push({
        claimIds: group.claims.map(({ claimId }) => claimId),
        code: "conflicting-route-binding",
        market: group.market,
        routeId: group.routeId,
      })
    }
  }

  for (const group of sourceGroups.values()) {
    const bindings = new Set(
      group.claims.map(({ owner }) =>
        createGroupKey(owner.routeId, owner.routeKind)
      )
    )
    if (bindings.size > 1) {
      diagnostics.push({
        claimIds: group.claims.map(({ claimId }) => claimId),
        code: "conflicting-source-binding",
        market: group.market,
        sourceId: group.sourceId,
        sourceKind: group.sourceKind,
      })
    }
  }
}

function addEquivalenceDiagnostics(
  claims: readonly PublicPathClaim[],
  diagnostics: PublicPathCollisionDiagnostic[]
): void {
  const groups = new Map<string, PublicPathClaim[]>()

  for (const claim of claims) {
    const equivalenceKey = claim.owner.equivalenceKey
    if (!equivalenceKey) {
      continue
    }
    const group = groups.get(equivalenceKey)
    if (group) {
      group.push(claim)
    } else {
      groups.set(equivalenceKey, [claim])
    }
  }

  for (const [equivalenceKey, group] of groups) {
    const marketRoutes = new Map<Market, Set<string>>()
    const routeKinds = new Set<string>()
    const sourceKinds = new Set<string>()

    for (const claim of group) {
      const routes = marketRoutes.get(claim.market) ?? new Set<string>()
      routes.add(claim.owner.routeId)
      marketRoutes.set(claim.market, routes)
      routeKinds.add(claim.owner.routeKind)
      sourceKinds.add(claim.owner.sourceKind)
    }

    const marketConflict = Array.from(marketRoutes.values()).some(
      (routes) => routes.size > 1
    )
    if (marketConflict || routeKinds.size > 1 || sourceKinds.size > 1) {
      diagnostics.push({
        claimIds: group.map(({ claimId }) => claimId),
        code: "conflicting-equivalence-mapping",
        equivalenceKey,
      })
    }
  }
}

function normalizeHost(assignment: PublicHostAssignment): Readonly<{
  diagnostic?: PublicPathCollisionDiagnostic
  normalizedHost?: string
}> {
  const trimmed = assignment.host.trim()
  const decoded = decodeAtMostTwice(trimmed)
  if (!decoded.ok) {
    return {
      diagnostic: {
        assignmentId: assignment.assignmentId,
        code: "invalid-host-assignment",
        host: assignment.host,
        market: assignment.market,
        reason: "malformed-percent-encoding",
      },
    }
  }

  const normalizedHost = decoded.value
    .toLowerCase()
    .replace(TRAILING_DOT_PATTERN, "")
  if (!CANONICAL_HOST_PATTERN.test(normalizedHost)) {
    return {
      diagnostic: {
        assignmentId: assignment.assignmentId,
        code: "invalid-host-assignment",
        host: assignment.host,
        market: assignment.market,
        reason: "invalid-hostname",
      },
      normalizedHost,
    }
  }

  if (assignment.host !== normalizedHost) {
    return {
      diagnostic: {
        assignmentId: assignment.assignmentId,
        code: "invalid-host-assignment",
        host: assignment.host,
        market: assignment.market,
        reason: "noncanonical-hostname",
      },
      normalizedHost,
    }
  }

  return { normalizedHost }
}

function addHostDiagnostics(
  assignments: readonly PublicHostAssignment[],
  diagnostics: PublicPathCollisionDiagnostic[]
): void {
  const hostGroups = new Map<
    string,
    { assignmentIds: string[]; markets: Market[] }
  >()

  for (const assignment of assignments) {
    const normalized = normalizeHost(assignment)
    if (normalized.diagnostic) {
      diagnostics.push(normalized.diagnostic)
    }
    if (!normalized.normalizedHost) {
      continue
    }

    const group = hostGroups.get(normalized.normalizedHost)
    if (group) {
      group.assignmentIds.push(assignment.assignmentId)
      group.markets.push(assignment.market)
    } else {
      hostGroups.set(normalized.normalizedHost, {
        assignmentIds: [assignment.assignmentId],
        markets: [assignment.market],
      })
    }
  }

  for (const [normalizedHost, group] of hostGroups) {
    if (new Set(group.markets).size > 1) {
      diagnostics.push({
        assignmentIds: group.assignmentIds,
        code: "conflicting-host-assignment",
        markets: group.markets,
        normalizedHost,
      })
    }
  }
}

/**
 * Validate a build/publish snapshot of explicit, complete public path claims.
 * Prefix templates and runtime precedence are deliberately outside this API.
 */
export function validatePublicPathCollisionSet(
  input: PublicPathCollisionInput
): PublicPathCollisionResult {
  const diagnostics: PublicPathCollisionDiagnostic[] = []

  addPathDiagnostics(input.pathClaims, diagnostics)
  addRouteAndSourceDiagnostics(input.pathClaims, diagnostics)
  addEquivalenceDiagnostics(input.pathClaims, diagnostics)
  addHostDiagnostics(input.hostAssignments ?? [], diagnostics)

  return diagnostics.length === 0 ? { ok: true } : { diagnostics, ok: false }
}

/** Hard build/publish gate. This function never repairs, suffixes, or rewrites. */
export function assertPublicPathCollisionFree(
  input: PublicPathCollisionInput
): void {
  const result = validatePublicPathCollisionSet(input)
  if (!result.ok) {
    throw new PublicPathCollisionError(result.diagnostics)
  }
}

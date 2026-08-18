import type {
  InvalidPublicPathReason,
  PublicPathClaim,
  PublicPathCollisionDiagnostic,
} from "./path-collision-contracts"
import {
  createPublishedSlug,
  MAX_PUBLISHED_SLUG_LENGTH,
  type PublishedSlugLocale,
  RESERVED_PUBLIC_PATH_SEGMENTS,
} from "./slug"
import type { Market } from "./types"

const MARKET_SLUG_LOCALES = {
  cz: "cs-CZ",
  hu: "hu-HU",
  ro: "ro-RO",
  sk: "sk-SK",
} as const satisfies Readonly<Record<Market, PublishedSlugLocale>>

const CANONICAL_SEGMENT_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const MALFORMED_PERCENT_PATTERN = /%(?![0-9a-f]{2})/i
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

export type DecodeResult =
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

export const createCollisionGroupKey = (...parts: readonly string[]): string =>
  JSON.stringify(parts)

export function decodeAtMostTwice(value: string): DecodeResult {
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

const foldReservedSegment = (value: string): string =>
  value.normalize("NFKC").toLowerCase()

const normalizeSegmentForComparison = (
  value: string,
  market: Market
): string | undefined => {
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

const hasUnsafeCharacter = (value: string): boolean =>
  Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0
    return UNSAFE_CODE_POINT_RANGES.some(
      ([minimum, maximum]) => codePoint >= minimum && codePoint <= maximum
    )
  })

const getStructuralPathReason = (
  path: string
): InvalidPublicPathReason | undefined => {
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

const analyzeSegment = (
  claim: PublicPathClaim,
  rawSegment: string
): AnalyzedSegment => {
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

export function analyzePublicPath(claim: PublicPathClaim): AnalyzedPath {
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

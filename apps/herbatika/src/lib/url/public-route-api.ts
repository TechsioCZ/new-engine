import { ROUTES } from "@/lib/market/market-runtime-definitions"
import type {
  ActiveEntityRouteTarget,
  ActiveRouteTarget,
  EntityUrlKind,
} from "@/lib/url-registry/model"
import type {
  ActiveEquivalenceLookup,
  SourceReadResult,
  UrlRegistryResolution,
  UrlRegistryResolveInput,
} from "@/lib/url-registry/reads"
import { classifySeo, type PublicSeoClassification } from "./public-seo"
import {
  buildAbsoluteUrl,
  buildPath,
  type PublicRouteTarget,
  resolveNavigationMode,
} from "./public-url"
import {
  normalizeQuery,
  type QueryNormalizationResult,
  type QueryNotFoundReason,
  type QueryRouteKind,
} from "./query-normalizer"
import {
  parseAccountChildSegment,
  parseCheckoutChildSegment,
  parseReviewChildSegment,
  parseRootSegment,
} from "./segments"
import { validatePublishedSlug } from "./slug"
import type { Market, TypePrefixKey } from "./types"

const ENCODED_SEPARATOR = /%(?:25)*(?:2f|5c)/iu
const INTERNAL_NAMESPACE = /^(?:~|%(?:25)*7e)sf$/iu
const MALFORMED_PERCENT_ENCODING = /%(?![\da-f]{2})/iu
const FORBIDDEN_FORMAT_CODE_POINTS = new Set([
  0x20_0b, 0x20_0c, 0x20_0d, 0x20_60, 0x20_66, 0x20_67, 0x20_68, 0x20_69,
])

const hasForbiddenCharacter = (value: string) =>
  [...value].some((character) => {
    const codePoint = character.codePointAt(0) ?? 0
    return (
      codePoint <= 0x1f ||
      codePoint === 0x7f ||
      (codePoint >= 0x20_2a && codePoint <= 0x20_2e) ||
      FORBIDDEN_FORMAT_CODE_POINTS.has(codePoint)
    )
  })

const ENTITY_KIND_BY_PREFIX = {
  advice: "article",
  brands: "brand",
  campaigns: "campaign",
  categories: "category",
  collections: "collection",
  information: "page",
  products: "product",
} as const satisfies Record<TypePrefixKey, EntityUrlKind | null>

const INDEX_QUERY_KIND = {
  article: "advice-index",
  brand: "brand-index",
  campaign: "campaign-index",
  category: "category-index",
  collection: "collection-index",
  page: null,
  product: "product-index",
} as const satisfies Record<EntityUrlKind, QueryRouteKind | null>

const DETAIL_QUERY_KIND = {
  article: "advice-article",
  brand: "brand-detail",
  campaign: "campaign-detail",
  category: "category-detail",
  collection: "collection-detail",
  page: "information-detail",
  product: "product-detail",
} as const satisfies Partial<Record<EntityUrlKind, QueryRouteKind>>

const NOINDEX_SEO = {
  alternateEligible: false,
  canonicalRawQuery: null,
  indexable: false,
  sitemapEligible: false,
} as const satisfies PublicSeoClassification

export type PublicPathNotFoundReason =
  | "internal-namespace"
  | "malformed-path"
  | "route-not-found"
  | "query-not-found"

export type PublicPathCanonicalization = Readonly<{
  canonicalPath: string
  destination: string
  pathRequired: boolean
  queryRequired: boolean
  required: boolean
}>

export type ParsedPublicRouteFound = Readonly<{
  canonicalization: PublicPathCanonicalization
  kind: "found"
  market: Market
  navigation: ReturnType<typeof resolveNavigationMode>
  query: Exclude<QueryNormalizationResult, { kind: "not-found" }> | null
  rawQuery: string
  routeKind: QueryRouteKind | null
  seo: PublicSeoClassification
  target: PublicRouteTarget
}>

export type ParsedPublicRoute =
  | ParsedPublicRouteFound
  | Readonly<{
      kind: "not-found"
      market: Market
      queryReason?: QueryNotFoundReason
      reason: PublicPathNotFoundReason
    }>

export type ParsePublicPathInput = Readonly<{
  lastPage?: number
  market: Market
  pathname: string
  rawQuery?: string
}>

type ParsedSegments = Readonly<{ decoded: readonly string[] }>

const parseSegments = (
  pathname: string
): ParsedSegments | PublicPathNotFoundReason => {
  if (
    pathname.length > 2048 ||
    !pathname.startsWith("/") ||
    pathname.includes("\\") ||
    pathname.includes("?") ||
    pathname.includes("#") ||
    hasForbiddenCharacter(pathname) ||
    ENCODED_SEPARATOR.test(pathname)
  ) {
    return "malformed-path"
  }

  const rawSegments = pathname.slice(1).split("/")
  while (rawSegments.at(-1) === "") {
    rawSegments.pop()
  }
  if (rawSegments.some((segment) => segment.length === 0)) {
    return "malformed-path"
  }
  if (rawSegments[0] && INTERNAL_NAMESPACE.test(rawSegments[0])) {
    return "internal-namespace"
  }

  try {
    const decoded = rawSegments.map((segment) => decodeURIComponent(segment))
    if (decoded[0] && INTERNAL_NAMESPACE.test(decoded[0])) {
      return "internal-namespace"
    }
    if (
      decoded.some(
        (segment) =>
          !segment ||
          segment === "." ||
          segment === ".." ||
          segment.includes("/") ||
          segment.includes("\\") ||
          ENCODED_SEPARATOR.test(segment) ||
          hasForbiddenCharacter(segment)
      )
    ) {
      return "malformed-path"
    }
    return { decoded }
  } catch {
    return "malformed-path"
  }
}

const normalizedEntitySlug = (value: string): string | null => {
  try {
    return validatePublishedSlug(value.toLowerCase())
  } catch {
    return null
  }
}

const parseEntityTarget = (
  prefix: TypePrefixKey,
  segments: readonly string[]
): Readonly<{
  routeKind: QueryRouteKind
  target: PublicRouteTarget
}> | null => {
  const kind = ENTITY_KIND_BY_PREFIX[prefix]
  if (!kind) {
    return null
  }
  if (segments.length === 1) {
    const routeKind = INDEX_QUERY_KIND[kind]
    return routeKind ? { routeKind, target: { kind } } : null
  }
  if (segments.length !== 2 || !segments[1]) {
    return null
  }
  const slug = normalizedEntitySlug(segments[1])
  const routeKind = DETAIL_QUERY_KIND[kind]
  return slug && routeKind ? { routeKind, target: { kind, slug } } : null
}

type ParsedTarget = Readonly<{
  routeKind: QueryRouteKind | null
  target: PublicRouteTarget
}>

const parseCheckoutTarget = (
  market: Market,
  segments: readonly string[]
): ParsedTarget | null => {
  if (segments.length === 1) {
    return { routeKind: null, target: { kind: "checkout" } }
  }
  const step = segments[1]
    ? parseCheckoutChildSegment(market, segments[1].toLowerCase())
    : null
  if (!step) {
    return null
  }
  if (step === "confirmation") {
    return segments.length === 3 && segments[2]
      ? {
          routeKind: null,
          target: { kind: "checkout", step, value: segments[2] },
        }
      : null
  }
  return segments.length === 2
    ? { routeKind: null, target: { kind: "checkout", step } }
    : null
}

const optionalThirdSegment = (
  segments: readonly string[]
): Readonly<{ value?: string }> | null => {
  if (segments.length === 2) {
    return {}
  }
  return segments.length === 3 && segments[2] ? { value: segments[2] } : null
}

const parseAccountCollectionTarget = (
  section: "lists" | "orders",
  segments: readonly string[],
  optionalValue: Readonly<{ value?: string }> | null
): ParsedTarget | null => {
  if (section === "lists") {
    return segments.length === 2
      ? {
          routeKind: "account-lists",
          target: { kind: "account", section },
        }
      : null
  }
  return optionalValue !== null
    ? {
        routeKind: optionalValue.value === undefined ? "account-orders" : null,
        target: { kind: "account", section, value: optionalValue.value },
      }
    : null
}

const parseAccountTarget = (
  market: Market,
  segments: readonly string[]
): ParsedTarget | null => {
  if (segments.length === 1) {
    return { routeKind: null, target: { kind: "account" } }
  }
  const section = segments[1]
    ? parseAccountChildSegment(market, segments[1].toLowerCase())
    : null
  if (!section) {
    return null
  }
  const optionalValue = optionalThirdSegment(segments)
  if (section === "resetPassword") {
    return optionalValue !== null
      ? {
          routeKind: null,
          target: { kind: "account", section, value: optionalValue.value },
        }
      : null
  }
  if (section === "orders" || section === "lists") {
    return parseAccountCollectionTarget(section, segments, optionalValue)
  }
  return segments.length === 2
    ? { routeKind: null, target: { kind: "account", section } }
    : null
}

const parseReviewTarget = (
  market: Market,
  segments: readonly string[]
): ParsedTarget | null => {
  const child = segments[1]
    ? parseReviewChildSegment(market, segments[1].toLowerCase())
    : null
  return child === "product" && segments.length === 3 && segments[2]
    ? { routeKind: null, target: { kind: "review", token: segments[2] } }
    : null
}

const parseFlowTarget = (
  market: Market,
  flow: "account" | "cart" | "checkout" | "reviews" | "search",
  segments: readonly string[]
): ParsedTarget | null => {
  switch (flow) {
    case "search":
      return segments.length === 1
        ? { routeKind: "search", target: { kind: "search" } }
        : null
    case "cart":
      return segments.length === 1
        ? { routeKind: null, target: { kind: "cart" } }
        : null
    case "checkout":
      return parseCheckoutTarget(market, segments)
    case "account":
      return parseAccountTarget(market, segments)
    case "reviews":
      return parseReviewTarget(market, segments)
    default:
      return null
  }
}

const appendRawQuery = (pathname: string, rawQuery: string) =>
  rawQuery ? `${pathname}?${rawQuery}` : pathname

const withoutLeadingQuestion = (rawQuery: string) =>
  rawQuery.startsWith("?") ? rawQuery.slice(1) : rawQuery

const hasMalformedQuery = (rawQuery: string) => {
  if (MALFORMED_PERCENT_ENCODING.test(rawQuery)) {
    return true
  }
  const parameters = new URLSearchParams(rawQuery)
  return [...parameters].some(
    ([key, value]) => hasForbiddenCharacter(key) || hasForbiddenCharacter(value)
  )
}

const buildParsedResult = (
  input: ParsePublicPathInput,
  target: PublicRouteTarget,
  routeKind: QueryRouteKind | null
): ParsedPublicRoute => {
  const rawQuery = withoutLeadingQuestion(input.rawQuery ?? "")
  if (
    input.pathname.length + rawQuery.length + 1 > 2048 ||
    rawQuery.includes("#") ||
    hasForbiddenCharacter(rawQuery) ||
    hasMalformedQuery(rawQuery)
  ) {
    return { kind: "not-found", market: input.market, reason: "malformed-path" }
  }

  const query = routeKind
    ? normalizeQuery({ lastPage: input.lastPage, rawQuery, routeKind })
    : null
  if (query?.kind === "not-found") {
    return {
      kind: "not-found",
      market: input.market,
      queryReason: query.reason,
      reason: "query-not-found",
    }
  }

  const canonicalPath = buildPath(target, input.market).split("?", 1)[0] ?? "/"
  const effectiveRawQuery =
    query?.kind === "redirect" ? query.redirectRawQuery : rawQuery
  const pathRequired = input.pathname !== canonicalPath
  const queryRequired = query?.kind === "redirect"
  const seo =
    query && routeKind
      ? classifySeo({
          canonicalRawQuery: query.canonicalRawQuery,
          routeKind,
          values: query.values,
        })
      : NOINDEX_SEO

  return {
    canonicalization: {
      canonicalPath,
      destination: appendRawQuery(canonicalPath, effectiveRawQuery),
      pathRequired,
      queryRequired,
      required: pathRequired || queryRequired,
    },
    kind: "found",
    market: input.market,
    navigation: resolveNavigationMode(target),
    query,
    rawQuery,
    routeKind,
    seo,
    target,
  }
}

export const parsePublicPath = (
  input: ParsePublicPathInput
): ParsedPublicRoute => {
  const parsed = parseSegments(input.pathname)
  if (typeof parsed === "string") {
    return { kind: "not-found", market: input.market, reason: parsed }
  }
  const segments = parsed.decoded
  if (segments.length === 0) {
    return buildParsedResult(input, { kind: "home" }, "homepage")
  }

  const root = parseRootSegment(input.market, (segments[0] ?? "").toLowerCase())
  if (!root) {
    return {
      kind: "not-found",
      market: input.market,
      reason: "route-not-found",
    }
  }
  if (root.group === "type-prefix") {
    const entity = parseEntityTarget(root.key, segments)
    return entity
      ? buildParsedResult(input, entity.target, entity.routeKind)
      : { kind: "not-found", market: input.market, reason: "route-not-found" }
  }
  if (root.group === "static-root-page") {
    return segments.length === 1
      ? buildParsedResult(
          input,
          { kind: "static", page: root.key },
          "static-page"
        )
      : { kind: "not-found", market: input.market, reason: "route-not-found" }
  }

  const flow = parseFlowTarget(input.market, root.key, segments)
  return flow
    ? buildParsedResult(input, flow.target, flow.routeKind)
    : { kind: "not-found", market: input.market, reason: "route-not-found" }
}

export type ResolvePublicRouteInput = Readonly<{
  parsed: ParsedPublicRoute
  resolveEntity: (
    input: UrlRegistryResolveInput
  ) => Promise<SourceReadResult<UrlRegistryResolution>>
}>

export type ResolvedPublicRoute =
  | Readonly<{
      activeEntity?: ActiveEntityRouteTarget
      kind: "current"
      parsed: ParsedPublicRouteFound
      seo: PublicSeoClassification
      target: PublicRouteTarget
    }>
  | Readonly<{
      destination: string
      kind: "redirect"
      status: 308
      target: PublicRouteTarget
    }>
  | Readonly<{ kind: "gone" }>
  | Readonly<{ kind: "not-found"; reason: PublicPathNotFoundReason }>
  | Readonly<{
      causeCode?: string
      kind: "unavailable"
      retryAfterSeconds?: number
    }>

const isResolvedEntityTarget = (
  target: PublicRouteTarget
): target is Extract<PublicRouteTarget, { slug?: string }> & { slug: string } =>
  "slug" in target && target.slug !== undefined

const effectiveRedirectQuery = (parsed: ParsedPublicRouteFound) =>
  parsed.query?.kind === "redirect"
    ? parsed.query.redirectRawQuery
    : parsed.rawQuery

const absoluteDestination = (
  target: PublicRouteTarget,
  parsed: ParsedPublicRouteFound
) => {
  const destination = buildAbsoluteUrl(target, parsed.market)
  destination.search = effectiveRedirectQuery(parsed)
  return destination.href
}

const activeTargetFromResolution = (
  resolution: Exclude<UrlRegistryResolution, { disposition: "gone" }>
): ActiveEntityRouteTarget => ({
  currentSlug: resolution.currentSlug,
  projectionType: "entity",
  route:
    resolution.disposition === "superseded"
      ? resolution.successorRoute
      : resolution.route,
})

export const hasValidActiveProjection = (
  target: ActiveEntityRouteTarget,
  market: Market,
  kind: EntityUrlKind
) =>
  target.route.status === "active" &&
  target.route.market === market &&
  target.route.kind === kind &&
  target.currentSlug.disposition === "current" &&
  target.currentSlug.routeId === target.route.id &&
  target.currentSlug.market === market &&
  target.currentSlug.kind === kind &&
  normalizedEntitySlug(target.currentSlug.normalizedSlug) ===
    target.currentSlug.normalizedSlug

export const resolvePublicRoute = async ({
  parsed,
  resolveEntity,
}: ResolvePublicRouteInput): Promise<ResolvedPublicRoute> => {
  if (parsed.kind === "not-found") {
    return { kind: "not-found", reason: parsed.reason }
  }
  if (!isResolvedEntityTarget(parsed.target)) {
    return parsed.canonicalization.required
      ? {
          destination: absoluteDestination(parsed.target, parsed),
          kind: "redirect",
          status: 308,
          target: parsed.target,
        }
      : { kind: "current", parsed, seo: parsed.seo, target: parsed.target }
  }

  const lookup = await resolveEntity({
    kind: parsed.target.kind,
    market: parsed.market,
    normalizedSlug: parsed.target.slug,
  })
  if (lookup.kind === "missing") {
    return { kind: "not-found", reason: "route-not-found" }
  }
  if (lookup.kind === "unavailable") {
    return {
      kind: "unavailable",
      ...(lookup.retryAfterSeconds === undefined
        ? {}
        : { retryAfterSeconds: lookup.retryAfterSeconds }),
    }
  }
  if (lookup.kind === "invalid-response") {
    return { causeCode: lookup.causeCode, kind: "unavailable" }
  }
  if (lookup.value.disposition === "gone") {
    return { kind: "gone" }
  }

  const activeEntity = activeTargetFromResolution(lookup.value)
  if (
    !hasValidActiveProjection(activeEntity, parsed.market, parsed.target.kind)
  ) {
    return {
      causeCode: "url-registry-projection-mismatch",
      kind: "unavailable",
    }
  }
  const target = {
    kind: activeEntity.route.kind,
    slug: activeEntity.currentSlug.normalizedSlug,
  } as const satisfies PublicRouteTarget
  if (
    lookup.value.disposition !== "current" ||
    parsed.canonicalization.required ||
    parsed.target.slug !== target.slug
  ) {
    return {
      destination: absoluteDestination(target, parsed),
      kind: "redirect",
      status: 308,
      target,
    }
  }
  return {
    activeEntity,
    kind: "current",
    parsed,
    seo:
      activeEntity.route.indexPolicy === "indexable" ? parsed.seo : NOINDEX_SEO,
    target,
  }
}

export type AlternateMap = Readonly<
  Partial<Record<(typeof ROUTES)[Market]["locale"], string>>
>

export type BuildAlternatesInput = Readonly<{
  findActiveEquivalents: (
    input: ActiveEquivalenceLookup
  ) => Promise<SourceReadResult<readonly ActiveRouteTarget[]>>
  loadSource: (
    target: ActiveEntityRouteTarget
  ) => Promise<SourceReadResult<unknown>>
  target: ActiveEntityRouteTarget
}>

const alternateEntry = (target: ActiveEntityRouteTarget) =>
  [
    ROUTES[target.route.market].locale,
    buildAbsoluteUrl(
      { kind: target.route.kind, slug: target.currentSlug.normalizedSlug },
      target.route.market
    ).href,
  ] as const

type EquivalentCollectionResult =
  | Readonly<{
      kind: "found"
      value: ReadonlyMap<Market, ActiveEntityRouteTarget>
    }>
  | Readonly<{ causeCode: string; kind: "invalid-response" }>

const collectEquivalentMarkets = (
  current: ActiveEntityRouteTarget,
  candidates: readonly ActiveRouteTarget[]
): EquivalentCollectionResult => {
  const byMarket = new Map<Market, ActiveEntityRouteTarget>([
    [current.route.market, current],
  ])
  for (const candidate of candidates) {
    if (
      candidate.projectionType !== "entity" ||
      !hasValidActiveProjection(
        candidate,
        candidate.route.market,
        current.route.kind
      ) ||
      candidate.route.equivalenceKey !== current.route.equivalenceKey
    ) {
      return { causeCode: "invalid-equivalent-route", kind: "invalid-response" }
    }
    const existing = byMarket.get(candidate.route.market)
    if (existing && existing.route.id !== candidate.route.id) {
      return {
        causeCode: "duplicate-equivalent-market",
        kind: "invalid-response",
      }
    }
    if (candidate.route.indexPolicy === "indexable") {
      byMarket.set(candidate.route.market, candidate)
    }
  }
  return { kind: "found", value: byMarket }
}

const loadAlternateEntries = async (
  current: ActiveEntityRouteTarget,
  candidates: ReadonlyMap<Market, ActiveEntityRouteTarget>,
  loadSource: BuildAlternatesInput["loadSource"]
): Promise<SourceReadResult<readonly (readonly [string, string])[]>> => {
  const entries: (readonly [string, string])[] = [alternateEntry(current)]
  for (const candidate of candidates.values()) {
    if (candidate.route.id === current.route.id) {
      continue
    }
    const source = await loadSource(candidate)
    if (source.kind === "missing") {
      continue
    }
    if (source.kind === "unavailable" || source.kind === "invalid-response") {
      return source
    }
    entries.push(alternateEntry(candidate))
  }
  return { kind: "found", value: entries }
}

export const buildAlternates = async ({
  findActiveEquivalents,
  loadSource,
  target,
}: BuildAlternatesInput): Promise<SourceReadResult<AlternateMap>> => {
  if (
    !hasValidActiveProjection(target, target.route.market, target.route.kind) ||
    target.route.indexPolicy !== "indexable"
  ) {
    return { causeCode: "invalid-alternate-source", kind: "invalid-response" }
  }

  const self = alternateEntry(target)
  if (!target.route.equivalenceKey) {
    return { kind: "found", value: Object.fromEntries([self]) }
  }
  const equivalents = await findActiveEquivalents({
    equivalenceKey: target.route.equivalenceKey,
    kind: target.route.kind,
  })
  if (
    equivalents.kind === "unavailable" ||
    equivalents.kind === "invalid-response"
  ) {
    return equivalents
  }
  if (equivalents.kind === "missing") {
    return { kind: "found", value: Object.fromEntries([self]) }
  }

  const candidates = collectEquivalentMarkets(target, equivalents.value)
  if (candidates.kind === "invalid-response") {
    return candidates
  }
  const entries = await loadAlternateEntries(
    target,
    candidates.value,
    loadSource
  )
  return entries.kind === "found"
    ? { kind: "found", value: Object.fromEntries(entries.value) }
    : entries
}

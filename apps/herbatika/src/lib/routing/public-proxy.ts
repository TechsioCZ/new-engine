// biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: The proxy is an explicit closed grammar and fail-closed boundary for hosts, methods, paths, and canonicalization.
import { normalizeHost, ROUTES } from "@/lib/market/market-runtime-definitions"
import { parseAllowedMarkets } from "@/lib/market/market-runtime-environment"
import {
  parseAccountChildSegment,
  parseCheckoutChildSegment,
  parseReviewChildSegment,
  parseRootSegment,
  ROUTE_SEGMENT_REGISTRY,
} from "@/lib/url/segments"
import { validatePublishedSlug } from "@/lib/url/slug"
import type { Market, RootSegmentMatch } from "@/lib/url/types"
import { isPrivatePagesPath } from "./private-pages-path"

export type PublicProxyAction =
  | Readonly<{ kind: "next" }>
  | Readonly<{
      allow?: "GET, HEAD"
      kind: "respond"
      status: 204 | 400 | 404 | 405 | 421
    }>
  | Readonly<{
      canonicalOrigin: string
      canonicalizationRequired: boolean
      kind: "rewrite"
      market: Market
      pathname: string
      publicPath: string
      routeKey: string
    }>

type ResolvePublicProxyInput = Readonly<{
  enabled: boolean
  environment?: Readonly<Record<string, string | undefined>>
  host: string | null
  method: string
  pathname: string
}>

type ParsedPath = Readonly<{
  canonicalPath: string
  segments: readonly string[]
}>

const FORBIDDEN_CODE_POINT_RANGES = [
  [0x00, 0x1f],
  [0x7f, 0x7f],
  [0x20_0b, 0x20_0d],
  [0x20_2a, 0x20_2e],
  [0x20_60, 0x20_60],
  [0x20_66, 0x20_69],
] as const

const hasForbiddenDecodedCharacter = (value: string) =>
  [...value].some((character) => {
    const codePoint = character.codePointAt(0)
    return FORBIDDEN_CODE_POINT_RANGES.some(
      ([minimum, maximum]) =>
        codePoint !== undefined && codePoint >= minimum && codePoint <= maximum
    )
  })
const ENTITY_KINDS = {
  products: { detail: "products", index: "products/index", route: "product" },
  categories: {
    detail: "category",
    index: "categories/index",
    route: "category",
  },
  brands: { detail: "brand", index: "brands/index", route: "brand" },
  collections: {
    detail: "collection",
    index: "collections/index",
    route: "collection",
  },
  advice: { detail: "advice", index: "advice/index", route: "article" },
  information: { detail: "information", index: null, route: "page" },
} as const

const isSystemRoute = (segments: readonly string[]) => {
  const first = segments[0]?.toLowerCase()
  return (
    segments.length > 0 &&
    (first === "robots.txt" ||
      first === "sitemap.xml" ||
      first === "manifest.webmanifest" ||
      first === "favicon.ico" ||
      first === "sitemaps" ||
      first === "feeds" ||
      first === ".well-known")
  )
}

const parsePath = (pathname: string): ParsedPath | null => {
  if (!pathname.startsWith("/") || pathname.includes("\\")) {
    return null
  }
  const rawSegments = pathname.slice(1).split("/")
  while (rawSegments.at(-1) === "") {
    rawSegments.pop()
  }
  if (rawSegments.some((segment) => segment.length === 0)) {
    return null
  }

  try {
    const segments = rawSegments.map((segment) => decodeURIComponent(segment))
    if (
      segments.some(
        (segment) =>
          !segment ||
          segment === "." ||
          segment === ".." ||
          segment.includes("/") ||
          segment.includes("\\") ||
          hasForbiddenDecodedCharacter(segment)
      )
    ) {
      return null
    }
    const canonicalPath = segments.length === 0 ? "/" : `/${segments.join("/")}`
    return { canonicalPath, segments }
  } catch {
    return null
  }
}

const hostOwnership = (
  environment: Readonly<Record<string, string | undefined>>
): Readonly<Record<string, Market>> => {
  let allowedMarkets: readonly Market[]
  try {
    allowedMarkets = parseAllowedMarkets(environment)
  } catch {
    return {}
  }
  const ownership: Record<string, Market> = {}
  for (const market of allowedMarkets) {
    ownership[new URL(ROUTES[market].canonicalOrigin).hostname] = market
    const extra =
      environment[`HERBATICA_ACCEPTED_HOSTS_${market.toUpperCase()}`]
    for (const value of extra?.split(",") ?? []) {
      const host = normalizeHost(value)
      if (!host) {
        continue
      }
      const existing = ownership[host]
      if (existing && existing !== market) {
        delete ownership[host]
      } else {
        ownership[host] = market
      }
    }
  }
  return ownership
}

const resolveMarket = (
  host: string | null,
  environment: Readonly<Record<string, string | undefined>>
) => {
  const normalized = normalizeHost(host)
  if (!normalized) {
    return null
  }
  const market = hostOwnership(environment)[normalized]
  return market ? { host: normalized, market } : null
}

const validEntitySlug = (value: string): string | null => {
  const normalized = value.toLowerCase()
  try {
    return validatePublishedSlug(normalized)
  } catch {
    return null
  }
}

const internalPath = (market: Market, suffix: string) =>
  `/~sf/${market}/${suffix}`

const entityRoute = (
  market: Market,
  match: Extract<RootSegmentMatch, { group: "type-prefix" }>,
  segments: readonly string[]
): Readonly<{ pathname: string; routeKey: string }> | null => {
  if (match.key === "campaigns") {
    return null
  }
  const definition = ENTITY_KINDS[match.key]
  if (segments.length === 1) {
    return definition.index
      ? {
          pathname: internalPath(market, definition.index),
          routeKey: `${definition.route}.index`,
        }
      : null
  }
  if (segments.length !== 2 || !segments[1]) {
    return null
  }
  const slug = validEntitySlug(segments[1])
  return slug
    ? {
        pathname: internalPath(market, `${definition.detail}/${slug}`),
        routeKey: `${definition.route}.detail`,
      }
    : null
}

const flowRoute = (
  market: Market,
  key: Extract<RootSegmentMatch, { group: "flow-root" }>["key"],
  segments: readonly string[]
): Readonly<{ pathname: string; routeKey: string }> | null => {
  if (key === "search" || key === "cart") {
    return segments.length === 1
      ? {
          pathname: internalPath(market, key),
          routeKey: key,
        }
      : null
  }
  if (key === "checkout") {
    if (segments.length === 1) {
      return {
        pathname: internalPath(market, "checkout/index"),
        routeKey: "checkout",
      }
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
            pathname: internalPath(
              market,
              `checkout/confirmation/${encodeURIComponent(segments[2])}`
            ),
            routeKey: "checkout.confirmation",
          }
        : null
    }
    if (segments.length !== 2) {
      return null
    }
    return {
      pathname: internalPath(
        market,
        step === "checkoutResult" ? "checkout/result" : `checkout/${step}`
      ),
      routeKey: `checkout.${step}`,
    }
  }
  if (key === "account") {
    if (segments.length === 1) {
      return {
        pathname: internalPath(market, "account/index"),
        routeKey: "account",
      }
    }
    const section = segments[1]
      ? parseAccountChildSegment(market, segments[1].toLowerCase())
      : null
    if (!section) {
      return null
    }
    if (["login", "register", "forgotPassword"].includes(section)) {
      return segments.length === 2
        ? {
            pathname: internalPath(market, `account/auth/${section}`),
            routeKey: `account.${section}`,
          }
        : null
    }
    if (section === "resetPassword") {
      return segments.length === 2 || segments.length === 3
        ? {
            pathname: internalPath(
              market,
              `account/auth/${section}${segments[2] ? `/${encodeURIComponent(segments[2])}` : ""}`
            ),
            routeKey: `account.${section}`,
          }
        : null
    }
    if (section === "deactivation") {
      return segments.length === 2
        ? {
            pathname: internalPath(market, "account/deactivation"),
            routeKey: "account.deactivation",
          }
        : null
    }
    if (section === "orders" && segments.length === 3 && segments[2]) {
      return {
        pathname: internalPath(
          market,
          `account/order/${encodeURIComponent(segments[2])}`
        ),
        routeKey: "account.order",
      }
    }
    return segments.length === 2
      ? {
          pathname: internalPath(market, `account/section/${section}`),
          routeKey: `account.${section}`,
        }
      : null
  }
  if (key === "reviews") {
    const child = segments[1]
      ? parseReviewChildSegment(market, segments[1].toLowerCase())
      : null
    return child === "product" && segments.length === 3 && segments[2]
      ? {
          pathname: internalPath(
            market,
            `reviews/product/${encodeURIComponent(segments[2])}`
          ),
          routeKey: "reviews.product",
        }
      : null
  }
  return null
}

export const resolvePublicProxyAction = ({
  enabled,
  environment = process.env,
  host,
  method,
  pathname,
}: ResolvePublicProxyInput): PublicProxyAction => {
  if (isPrivatePagesPath(pathname)) {
    return { kind: "respond", status: 404 }
  }
  const hostMarket = resolveMarket(host, environment)
  if (!hostMarket) {
    return { kind: "respond", status: 421 }
  }
  if (!enabled) {
    return { kind: "next" }
  }
  const parsed = parsePath(pathname)
  if (!parsed) {
    return { kind: "respond", status: 400 }
  }
  if (isSystemRoute(parsed.segments)) {
    return { kind: "next" }
  }
  let route: Readonly<{ pathname: string; routeKey: string }> | null = null
  if (parsed.segments.length === 0) {
    route = {
      pathname: internalPath(hostMarket.market, "home"),
      routeKey: "home",
    }
  } else {
    const first = parsed.segments[0] ?? ""
    const match = parseRootSegment(hostMarket.market, first.toLowerCase())
    if (match?.group === "type-prefix") {
      route = entityRoute(hostMarket.market, match, parsed.segments)
    } else if (match?.group === "flow-root") {
      route = flowRoute(hostMarket.market, match.key, parsed.segments)
    } else if (
      match?.group === "static-root-page" &&
      parsed.segments.length === 1
    ) {
      route = {
        pathname: internalPath(hostMarket.market, `static/${match.key}`),
        routeKey: `static.${match.key}`,
      }
    }
  }
  if (!route) {
    return { kind: "respond", status: 404 }
  }

  const normalizedMethod = method.toUpperCase()
  if (normalizedMethod === "OPTIONS") {
    return { allow: "GET, HEAD", kind: "respond", status: 204 }
  }
  if (normalizedMethod !== "GET" && normalizedMethod !== "HEAD") {
    return { allow: "GET, HEAD", kind: "respond", status: 405 }
  }

  const canonicalHost = new URL(ROUTES[hostMarket.market].canonicalOrigin)
    .hostname
  const canonicalPublicPath = (() => {
    if (parsed.segments.length === 0) {
      return "/"
    }
    const root = parseRootSegment(
      hostMarket.market,
      (parsed.segments[0] ?? "").toLowerCase()
    )
    if (!root) {
      return parsed.canonicalPath
    }
    const config = ROUTE_SEGMENT_REGISTRY[hostMarket.market]
    let first: string
    if (root.group === "type-prefix") {
      first = config.typePrefixes[root.key]
    } else if (root.group === "flow-root") {
      first = config.flowRoots[root.key]
    } else {
      first = config.staticRootPages[root.key]
    }
    const rest = parsed.segments
      .slice(1)
      .map((segment, index) =>
        index === 0 && root.group !== "static-root-page"
          ? segment.toLowerCase()
          : segment
      )
    return `/${[first, ...rest].join("/")}`
  })()

  return {
    canonicalOrigin: ROUTES[hostMarket.market].canonicalOrigin,
    canonicalizationRequired:
      hostMarket.host !== canonicalHost || pathname !== canonicalPublicPath,
    kind: "rewrite",
    market: hostMarket.market,
    pathname: route.pathname,
    publicPath: canonicalPublicPath,
    routeKey: route.routeKey,
  }
}

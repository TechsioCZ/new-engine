import { type NextRequest, NextResponse } from "next/server"
import { validateRouteQuery } from "@/lib/routing/query-validation"
import {
  CANONICALIZATION_REQUIRED_HEADER,
  ORIGINAL_PUBLIC_PATH_HEADER,
  TRUSTED_MARKET_HEADER,
} from "@/lib/routing/trusted-headers"
import { getMarketOrigin } from "@/lib/url/builder"
import {
  getSegment,
  type RouteKind,
  resolveKindFromSegment,
  type SegmentKey,
} from "@/lib/url/segments"
import { MARKETS, type Market } from "@/lib/url/types"

const INTERNAL_HEADER_NAMES = new Set([
  "x-market-code",
  "x-sales-channel-id",
  "x-canonical-origin",
  TRUSTED_MARKET_HEADER,
  ORIGINAL_PUBLIC_PATH_HEADER,
  CANONICALIZATION_REQUIRED_HEADER,
])
const INTERNAL_ROUTE_SEGMENTS = new Set<Market | "~sf">([...MARKETS, "~sf"])
const FLOW_KINDS = new Set<RouteKind>([
  "search",
  "cart",
  "checkout",
  "account",
  "reviews",
])
const CHECKOUT_SEGMENTS = [
  "checkout.contact",
  "checkout.shipping",
  "checkout.payment",
  "checkout.review",
  "checkout.paymentReturn",
  "checkout.confirmation",
] as const satisfies readonly SegmentKey[]
const ACCOUNT_SEGMENTS = [
  "account.orders",
  "account.lists",
  "account.settings",
  "account.login",
  "account.register",
  "account.forgotPassword",
  "account.resetPassword",
] as const satisfies readonly SegmentKey[]
const HOSTNAME_PATTERN =
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i
const PORT_PATTERN = /^\d+$/
const BRACKETED_HOST_PATTERN = /^\[([0-9a-f:.]+)\](?::(\d+))?$/i
const TRAILING_DOT_PATTERN = /\.$/
const SITEMAP_SHARD_PATTERN = /^[a-z]+-[1-9]\d*\.xml$/
const ENTITY_SEGMENT_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i

type FlowKind = Extract<
  RouteKind,
  "search" | "cart" | "checkout" | "account" | "reviews"
>

export type ParsedRequestHost = {
  hostname: string
  port: string | null
}

export type MarketHostBinding = {
  canonicalHost: string
  market: Market
  acceptedHosts: ReadonlySet<string>
}

export type ProxyRoute =
  | { type: "home"; normalizedPath: string }
  | {
      type: "entity"
      kind: Exclude<RouteKind, FlowKind>
      normalizedPath: string
      isDetail: boolean
    }
  | { type: "flow"; kind: FlowKind; normalizedPath: string }
  | { type: "system"; normalizedPath: string }
  | { type: "bad-request" }
  | { type: "not-found" }

const hasControlCharacter = (value: string, includeSpace: boolean) => {
  for (const character of value) {
    const code = character.charCodeAt(0)
    if (code === 127 || code < 32 || (includeSpace && code === 32)) {
      return true
    }
  }
  return false
}

const validPort = (port: string | undefined): string | null | undefined => {
  if (port === undefined) {
    return null
  }
  if (port.length > 5 || !PORT_PATTERN.test(port)) {
    return
  }
  const number = Number(port)
  return Number.isSafeInteger(number) && number <= 65_535 ? port : undefined
}

/** Parse one RFC-style Host authority without accepting forwarded-host lists or URLs. */
export const parseRequestHost = (
  host?: string | null
): ParsedRequestHost | null => {
  if (
    !host ||
    hasControlCharacter(host, true) ||
    host.includes(",") ||
    host.includes("/") ||
    host.includes("\\")
  ) {
    return null
  }

  if (host.startsWith("[")) {
    const match = BRACKETED_HOST_PATTERN.exec(host)
    const port = validPort(match?.[2])
    if (!match || port === undefined) {
      return null
    }
    try {
      const parsed = new URL(`http://${host}`)
      return { hostname: parsed.hostname.toLowerCase(), port }
    } catch {
      return null
    }
  }

  const parts = host.split(":")
  if (parts.length > 2) {
    return null
  }
  const port = validPort(parts[1])
  const hostname = (parts[0] ?? "")
    .toLowerCase()
    .replace(TRAILING_DOT_PATTERN, "")
  if (
    port === undefined ||
    hostname.length === 0 ||
    hostname.length > 253 ||
    !HOSTNAME_PATTERN.test(hostname)
  ) {
    return null
  }
  return { hostname, port }
}

export const normalizeRequestHost = (host?: string | null): string | null =>
  parseRequestHost(host)?.hostname ?? null

export const resolveAllowedMarkets = (
  raw = process.env.ALLOWED_MARKETS
): ReadonlySet<Market> => {
  if (!raw?.trim()) {
    return new Set(MARKETS)
  }

  const allowed = new Set<Market>()
  for (const value of raw.split(",")) {
    const normalized = value.trim().toLowerCase()
    if ((MARKETS as readonly string[]).includes(normalized)) {
      allowed.add(normalized as Market)
    }
  }
  return allowed
}

const additionalHostsForMarket = (
  market: Market,
  environment: Record<string, string | undefined>
) =>
  (environment[`HERBATICA_ALLOWED_HOSTS_${market.toUpperCase()}`] ?? "")
    .split(",")
    .map((value) => normalizeRequestHost(value.trim()))
    .filter((host): host is string => Boolean(host))

export const createMarketHostBindings = (
  environment: Record<string, string | undefined> = process.env
): MarketHostBinding[] => {
  const allowedMarkets = resolveAllowedMarkets(environment.ALLOWED_MARKETS)

  return MARKETS.flatMap((market) => {
    if (!allowedMarkets.has(market)) {
      return []
    }
    const canonicalHost = new URL(
      getMarketOrigin(market)
    ).hostname.toLowerCase()
    return [
      {
        market,
        canonicalHost,
        acceptedHosts: new Set([
          canonicalHost,
          ...additionalHostsForMarket(market, environment),
        ]),
      },
    ]
  })
}

export const resolveMarketFromHost = (
  host: string | null | undefined,
  bindings: readonly MarketHostBinding[] = createMarketHostBindings()
): MarketHostBinding | null => {
  const normalizedHost = normalizeRequestHost(host)
  if (!normalizedHost) {
    return null
  }
  const matches = bindings.filter((binding) =>
    binding.acceptedHosts.has(normalizedHost)
  )
  return matches.length === 1 ? (matches[0] ?? null) : null
}

export const scrubInternalHeaders = (source: Headers): Headers => {
  const headers = new Headers(source)
  for (const name of Array.from(headers.keys())) {
    const normalized = name.toLowerCase()
    if (
      normalized.startsWith("x-sf-") ||
      INTERNAL_HEADER_NAMES.has(normalized)
    ) {
      headers.delete(name)
    }
  }
  return headers
}

type ParsedPath = { valid: true; decoded: string[] } | { valid: false }

const parsePath = (pathname: string): ParsedPath => {
  if (!pathname.startsWith("/")) {
    return { valid: false }
  }
  const raw = pathname.slice(1).split("/")
  while (raw.at(-1) === "") {
    raw.pop()
  }
  if (raw.some((segment) => segment.length === 0)) {
    return { valid: false }
  }

  try {
    const decoded = raw.map(decodeURIComponent)
    return decoded.some(
      (segment) =>
        hasControlCharacter(segment, false) ||
        segment.includes("/") ||
        segment.includes("\\")
    )
      ? { valid: false }
      : { valid: true, decoded }
  } catch {
    return { valid: false }
  }
}

const joinPath = (segments: readonly string[]) =>
  segments.length === 0 ? "/" : `/${segments.join("/")}`

const isFlowKind = (kind: RouteKind): kind is FlowKind => FLOW_KINDS.has(kind)

const resolveSystemRoute = (segments: readonly string[]): ProxyRoute | null => {
  const lowered = segments.map((segment) => segment.toLowerCase())
  if (lowered.length === 1 && lowered[0] === "robots.txt") {
    return { type: "system", normalizedPath: "/robots.txt" }
  }
  if (lowered.length === 1 && lowered[0] === "sitemap.xml") {
    return { type: "system", normalizedPath: "/sitemap.xml" }
  }
  if (
    lowered.length === 2 &&
    lowered[0] === "sitemaps" &&
    SITEMAP_SHARD_PATTERN.test(lowered[1] ?? "")
  ) {
    return { type: "system", normalizedPath: joinPath(lowered) }
  }
  return null
}

const resolveCheckoutRoute = (
  market: Market,
  segments: readonly string[]
): ProxyRoute => {
  const kind = "checkout"
  const root = getSegment(market, kind)
  if (segments.length === 1) {
    return { type: "flow", kind, normalizedPath: `/${root}` }
  }
  const step = CHECKOUT_SEGMENTS.map((key) => getSegment(market, key)).find(
    (candidate) => candidate === segments[1]?.toLowerCase()
  )
  return segments.length === 2 && step
    ? { type: "flow", kind, normalizedPath: `/${root}/${step}` }
    : { type: "not-found" }
}

const resolveAccountRoute = (
  market: Market,
  segments: readonly string[]
): ProxyRoute => {
  const kind = "account"
  const root = getSegment(market, kind)
  if (segments.length === 1) {
    return { type: "flow", kind, normalizedPath: `/${root}` }
  }
  const section = ACCOUNT_SEGMENTS.map((key) => getSegment(market, key)).find(
    (candidate) => candidate === segments[1]?.toLowerCase()
  )
  const mayHaveValue =
    section === getSegment(market, "account.orders") ||
    section === getSegment(market, "account.resetPassword")
  const valid =
    Boolean(section) &&
    (segments.length === 2 || (mayHaveValue && segments.length === 3))
  return valid
    ? {
        type: "flow",
        kind,
        normalizedPath: joinPath([root, section ?? "", ...segments.slice(2)]),
      }
    : { type: "not-found" }
}

const resolveReviewsRoute = (
  market: Market,
  segments: readonly string[]
): ProxyRoute => {
  const kind = "reviews"
  const root = getSegment(market, kind)
  const productSegment = getSegment(market, "reviews.product")
  return segments.length === 3 &&
    segments[1]?.toLowerCase() === productSegment &&
    Boolean(segments[2])
    ? {
        type: "flow",
        kind,
        normalizedPath: joinPath([root, productSegment, segments[2] ?? ""]),
      }
    : { type: "not-found" }
}

const resolveFlowRoute = (
  market: Market,
  kind: FlowKind,
  segments: readonly string[]
): ProxyRoute => {
  if (kind === "checkout") {
    return resolveCheckoutRoute(market, segments)
  }
  if (kind === "account") {
    return resolveAccountRoute(market, segments)
  }
  if (kind === "reviews") {
    return resolveReviewsRoute(market, segments)
  }
  const root = getSegment(market, kind)
  return segments.length === 1
    ? { type: "flow", kind, normalizedPath: `/${root}` }
    : { type: "not-found" }
}

/** Pure static public-path parser used by Proxy and unit tests. */
export const resolveProxyRoute = (
  market: Market,
  pathname: string
): ProxyRoute => {
  const parsed = parsePath(pathname)
  if (!parsed.valid) {
    return { type: "bad-request" }
  }
  const segments = parsed.decoded
  if (segments.length === 0) {
    return { type: "home", normalizedPath: "/" }
  }

  const system = resolveSystemRoute(segments)
  if (system) {
    return system
  }

  const first = segments[0] ?? ""
  const normalizedFirst = first.toLowerCase()
  if (INTERNAL_ROUTE_SEGMENTS.has(normalizedFirst as Market | "~sf")) {
    return { type: "not-found" }
  }

  const kind = resolveKindFromSegment(market, first)
  if (!kind) {
    return { type: "not-found" }
  }
  if (isFlowKind(kind)) {
    return resolveFlowRoute(market, kind, segments)
  }

  const supportsIndex = kind !== "page"
  if (segments.length === 1 && supportsIndex) {
    return {
      type: "entity",
      kind,
      isDetail: false,
      normalizedPath: `/${normalizedFirst}`,
    }
  }
  if (
    segments.length !== 2 ||
    !segments[1] ||
    !ENTITY_SEGMENT_PATTERN.test(segments[1])
  ) {
    return { type: "not-found" }
  }
  return {
    type: "entity",
    kind,
    isDetail: true,
    normalizedPath: joinPath([normalizedFirst, segments[1].toLowerCase()]),
  }
}

const canonicalUrl = (
  binding: MarketHostBinding,
  pathname: string,
  searchParams: URLSearchParams
) => {
  const target = new URL(getMarketOrigin(binding.market))
  target.pathname = pathname
  target.search = searchParams.toString()
  return target
}

const publicSearchParams = (request: NextRequest) => {
  const searchParams = new URLSearchParams(request.nextUrl.searchParams)
  if (request.headers.get("rsc") === "1") {
    // Next Link navigation uses this cache-busting key internally when
    // skipProxyUrlNormalize is enabled. It is not part of the public contract.
    searchParams.delete("_rsc")
  }
  return searchParams
}

const isApiPath = (pathname: string) =>
  pathname === "/api" || pathname.startsWith("/api/")

const passThrough = (headers: Headers) =>
  NextResponse.next({ request: { headers } })

export function proxy(request: NextRequest) {
  const parsedHost = parseRequestHost(request.headers.get("host"))
  const binding = resolveMarketFromHost(request.headers.get("host"))
  if (!(parsedHost && binding)) {
    return new NextResponse("Misdirected Request", { status: 421 })
  }

  const requestHeaders = scrubInternalHeaders(request.headers)
  requestHeaders.set(TRUSTED_MARKET_HEADER, binding.market)
  requestHeaders.set(ORIGINAL_PUBLIC_PATH_HEADER, request.nextUrl.pathname)

  // APIs share the Host-derived market trust boundary, but retain their own
  // methods, path validation, and responses. There is no health/internal bypass.
  if (isApiPath(request.nextUrl.pathname)) {
    return passThrough(requestHeaders)
  }

  const route = resolveProxyRoute(binding.market, request.nextUrl.pathname)
  if (route.type === "bad-request") {
    return new NextResponse("Bad Request", { status: 400 })
  }
  if (route.type === "not-found") {
    return new NextResponse("Not Found", { status: 404 })
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new NextResponse("Method Not Allowed", {
      status: 405,
      headers: { Allow: "GET, HEAD" },
    })
  }

  const searchParams = publicSearchParams(request)
  const queryValidation = validateRouteQuery(
    binding.market,
    route,
    searchParams
  )
  if (!queryValidation.valid) {
    return new NextResponse("Bad Request", { status: 400 })
  }

  const canonicalizationRequired =
    parsedHost.hostname !== binding.canonicalHost ||
    request.nextUrl.pathname !== route.normalizedPath

  if (route.type === "entity" && route.isDetail) {
    if (canonicalizationRequired) {
      requestHeaders.set(CANONICALIZATION_REQUIRED_HEADER, "1")
    }
  } else if (canonicalizationRequired) {
    return NextResponse.redirect(
      canonicalUrl(binding, route.normalizedPath, searchParams),
      308
    )
  }

  return passThrough(requestHeaders)
}

export const config = {
  // API routes deliberately pass through Proxy for Host-derived market headers.
  // Next static/image internals and immutable public assets remain excluded.
  matcher: [
    "/api/:path*",
    "/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|woff|woff2)$).*)",
  ],
}

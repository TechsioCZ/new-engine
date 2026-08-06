import { type NextRequest, NextResponse } from "next/server"
import { validateEntityQuery } from "@/lib/routing/query-validation"
import { getMarketOrigin } from "@/lib/url/builder"
import {
  getSegment,
  type RouteKind,
  resolveKindFromSegment,
} from "@/lib/url/segments"
import { MARKETS, type Market } from "@/lib/url/types"

export const TRUSTED_MARKET_HEADER = "x-sf-market"
export const ORIGINAL_PUBLIC_PATH_HEADER = "x-sf-public-path"
export const CANONICALIZATION_REQUIRED_HEADER = "x-sf-canonicalization-required"

const INTERNAL_HEADER_NAMES = new Set([
  "x-market-code",
  "x-sales-channel-id",
  "x-canonical-origin",
  TRUSTED_MARKET_HEADER,
  ORIGINAL_PUBLIC_PATH_HEADER,
  CANONICALIZATION_REQUIRED_HEADER,
])
const SYSTEM_PATH_PATTERN =
  /^\/(?:robots\.txt|sitemap\.xml|sitemaps(?:\/|$)|manifest\.webmanifest|feeds(?:\/|$)|favicon\.ico|\.well-known(?:\/|$))/i
const INTERNAL_ROUTE_SEGMENTS = new Set<Market | "~sf">([...MARKETS, "~sf"])

export type MarketHostBinding = {
  canonicalHost: string
  market: Market
  acceptedHosts: ReadonlySet<string>
}

export type ProxyRoute =
  | { type: "home"; target: string; normalizedPath: string }
  | {
      type: "entity"
      kind: Exclude<
        RouteKind,
        "search" | "cart" | "checkout" | "account" | "reviews"
      >
      target: string
      normalizedPath: string
      isDetail: boolean
    }
  | {
      type: "flow"
      kind: Extract<
        RouteKind,
        "search" | "cart" | "checkout" | "account" | "reviews"
      >
      target: string
      normalizedPath: string
    }
  | { type: "system"; target: string; normalizedPath: string }
  | { type: "static"; target: string; normalizedPath: string }
  | { type: "not-found" }

const stripPort = (host: string) => {
  const value = host.trim().replace(/\.$/, "")
  if (value.startsWith("[")) {
    const close = value.indexOf("]")
    return close >= 0 ? value.slice(0, close + 1) : value
  }
  return value.replace(/:\d+$/, "")
}

export const normalizeRequestHost = (host?: string | null): string | null => {
  const first = host?.split(",")[0]?.trim()
  if (!first) {
    return null
  }
  return stripPort(
    first.replace(/^https?:\/\//i, "").replace(/\/.*$/, "")
  ).toLowerCase()
}

export const resolveAllowedMarkets = (
  raw = process.env.ALLOWED_MARKETS
): ReadonlySet<Market> => {
  if (!raw?.trim()) {
    return new Set(MARKETS)
  }

  const requested = raw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
  const allowed = new Set<Market>()
  for (const value of requested) {
    if ((MARKETS as readonly string[]).includes(value)) {
      allowed.add(value as Market)
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
    .map(normalizeRequestHost)
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
  return (
    bindings.find((binding) => binding.acceptedHosts.has(normalizedHost)) ??
    null
  )
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

const joinPath = (segments: readonly string[]) =>
  segments.length === 0 ? "/" : `/${segments.join("/")}`

const normalizeFlowSegments = (
  kind: Extract<
    RouteKind,
    "search" | "cart" | "checkout" | "account" | "reviews"
  >,
  segments: readonly string[]
) => {
  if (kind === "account") {
    return segments.map((segment, index) =>
      index < 2 ? segment.toLowerCase() : segment
    )
  }
  if (kind === "reviews") {
    return segments.map((segment, index) =>
      index < 2 ? segment.toLowerCase() : segment
    )
  }
  return segments.map((segment) => segment.toLowerCase())
}

/** Pure static public-path parser used by Proxy and unit tests. */
export const resolveProxyRoute = (
  market: Market,
  pathname: string
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Static taxonomy dispatch is intentionally centralized.
): ProxyRoute => {
  if (SYSTEM_PATH_PATTERN.test(pathname)) {
    return { type: "system", target: pathname, normalizedPath: pathname }
  }

  const _hadTrailingSlash = pathname.length > 1 && pathname.endsWith("/")
  const segments = pathname.split("/").filter(Boolean)
  if (segments.length === 0) {
    return { type: "home", target: `/~sf/${market}/home`, normalizedPath: "/" }
  }

  const first = segments[0] ?? ""
  if (INTERNAL_ROUTE_SEGMENTS.has(first.toLowerCase() as Market | "~sf")) {
    return { type: "not-found" }
  }

  if (segments.length === 1) {
    const staticPages = [
      {
        key: "about",
        current: getSegment(market, "about"),
        aliases: ["o-nas"],
      },
      { key: "faq", current: getSegment(market, "faq"), aliases: ["faq"] },
    ] as const
    const normalizedFirst = first.toLowerCase()
    const staticPage = staticPages.find(
      ({ current, aliases }) =>
        normalizedFirst === current ||
        aliases.includes(normalizedFirst as never)
    )
    if (staticPage) {
      return {
        type: "static",
        target: `/~sf/${market}/static/${staticPage.key}`,
        normalizedPath: `/${staticPage.current}`,
      }
    }
  }

  const kind = resolveKindFromSegment(market, first)
  if (!kind) {
    return { type: "not-found" }
  }

  const flowKinds = new Set<RouteKind>([
    "search",
    "cart",
    "checkout",
    "account",
    "reviews",
  ])
  const isFlowKind = (
    value: RouteKind
  ): value is Extract<
    RouteKind,
    "search" | "cart" | "checkout" | "account" | "reviews"
  > => flowKinds.has(value)
  if (isFlowKind(kind)) {
    const normalizedSegments = normalizeFlowSegments(kind, segments)
    const rest = segments.slice(1)
    let target: string
    switch (kind) {
      case "search":
      case "cart":
        target = `/~sf/${market}/${kind}`
        break
      case "checkout":
        target =
          rest[0]?.toLowerCase() ===
          getSegment(market, "checkout.paymentReturn")
            ? `/~sf/${market}/checkout/result`
            : `/~sf/${market}/checkout${rest.length ? `/${rest.join("/")}` : ""}`
        break
      case "account": {
        const section = rest[0]?.toLowerCase()
        if (!section) {
          target = `/~sf/${market}/account`
        } else if (
          section === getSegment(market, "account.orders") &&
          rest[1]
        ) {
          target = `/~sf/${market}/account/order/${rest.slice(1).join("/")}`
        } else if (
          [
            "account.login",
            "account.register",
            "account.forgotPassword",
            "account.resetPassword",
          ].some(
            (key) =>
              section ===
              getSegment(
                market,
                key as
                  | "account.login"
                  | "account.register"
                  | "account.forgotPassword"
                  | "account.resetPassword"
              )
          )
        ) {
          target = `/~sf/${market}/account/auth/${rest.join("/")}`
        } else {
          target = `/~sf/${market}/account/section/${rest.join("/")}`
        }
        break
      }
      case "reviews":
        target = `/~sf/${market}/reviews/product/${rest.slice(1).join("/")}`
        break
      default:
        target = `/~sf/${market}/${kind}`
    }
    return {
      type: "flow",
      kind,
      target,
      normalizedPath: joinPath(normalizedSegments),
    }
  }

  const normalizedSegments = segments.map((segment) => segment.toLowerCase())
  const detailDirectory: Record<
    Exclude<RouteKind, "search" | "cart" | "checkout" | "account" | "reviews">,
    string
  > = {
    product: "product",
    category: "category",
    brand: "brand",
    collection: "collection",
    campaign: "campaign",
    article: "advice",
    page: "information",
  }
  const indexDirectory: Partial<typeof detailDirectory> = {
    product: "products",
    category: "categories",
    brand: "brands",
    collection: "collections",
    campaign: "campaigns",
    article: "advice",
  }
  const isDetail = segments.length === 2
  const directory = isDetail ? detailDirectory[kind] : indexDirectory[kind]
  if (!directory || segments.length > 2) {
    return { type: "not-found" }
  }
  return {
    type: "entity",
    kind,
    isDetail,
    target: `/~sf/${market}/${directory}${isDetail ? `/${segments[1]}` : ""}`,
    normalizedPath: joinPath(normalizedSegments),
  }
}

const canonicalUrl = (
  request: NextRequest,
  binding: MarketHostBinding,
  pathname: string
) => {
  const target = new URL(getMarketOrigin(binding.market))
  target.pathname = pathname
  target.search = request.nextUrl.search
  return target
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The trust boundary keeps decisions explicit.
export function proxy(request: NextRequest) {
  const host = request.headers.get("host")
  const binding = resolveMarketFromHost(host)
  if (!binding) {
    return new NextResponse("Misdirected Request", { status: 421 })
  }

  const route = resolveProxyRoute(binding.market, request.nextUrl.pathname)
  if (route.type === "not-found") {
    return new NextResponse("Not Found", { status: 404 })
  }
  if (
    route.type !== "system" &&
    request.method !== "GET" &&
    request.method !== "HEAD"
  ) {
    return new NextResponse("Method Not Allowed", {
      status: 405,
      headers: { Allow: "GET, HEAD" },
    })
  }

  if (route.type === "entity") {
    const queryValidation = validateEntityQuery(
      route.kind,
      request.nextUrl.searchParams
    )
    if (!queryValidation.valid) {
      return new NextResponse("Bad Request", { status: 400 })
    }
  }

  const requestHeaders = scrubInternalHeaders(request.headers)
  requestHeaders.set(TRUSTED_MARKET_HEADER, binding.market)
  requestHeaders.set(ORIGINAL_PUBLIC_PATH_HEADER, request.nextUrl.pathname)

  const rawHost = stripPort(host ?? "")
  const canonicalizationRequired =
    rawHost !== binding.canonicalHost ||
    request.nextUrl.pathname !== route.normalizedPath

  if (route.type === "entity" && route.isDetail) {
    if (canonicalizationRequired) {
      requestHeaders.set(CANONICALIZATION_REQUIRED_HEADER, "1")
    }
  } else if (canonicalizationRequired) {
    return NextResponse.redirect(
      canonicalUrl(request, binding, route.normalizedPath),
      308
    )
  }

  if (route.type === "system") {
    const target = request.nextUrl.clone()
    if (/^\/robots\.txt$/i.test(route.target)) {
      target.pathname = `/~sf/${binding.market}/system/robots`
    } else if (/^\/sitemap\.xml$/i.test(route.target)) {
      target.pathname = `/~sf/${binding.market}/system/sitemap/index`
    } else {
      const shard = route.target.match(/^\/sitemaps\/(.+)\.xml$/i)?.[1]
      if (!shard) {
        return NextResponse.next({ request: { headers: requestHeaders } })
      }
      target.pathname = `/~sf/${binding.market}/system/sitemap/shard/${encodeURIComponent(shard)}`
    }
    return NextResponse.rewrite(target, {
      request: { headers: requestHeaders },
    })
  }

  const target = request.nextUrl.clone()
  target.pathname = route.target
  return NextResponse.rewrite(target, { request: { headers: requestHeaders } })
}

export const config = {
  matcher: [
    "/((?!api(?:/|$)|_next/static|_next/image|.*.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|woff|woff2)$).*)",
    "/favicon.ico",
  ],
}

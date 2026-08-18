import {
  MARKET_CODES,
  type MarketCode,
} from "@/lib/market/market-runtime-definitions"
import { ROUTE_SEGMENT_REGISTRY } from "@/lib/url/segments"
import { validatePublishedSlug } from "@/lib/url/slug"
import { resolveCanonicalMarket } from "./m00-proxy"

export type ProductProxyAction =
  | { kind: "next" }
  | { allow?: "GET, HEAD"; kind: "respond"; status: 204 | 404 | 405 | 421 }
  | {
      canonicalOrigin: string
      kind: "rewrite"
      market: MarketCode
      pathname: string
      publicPath: string
      routeKey: "product.detail"
    }

type ProductProxyInput = Readonly<{
  enabled: boolean
  host: string | null
  method: string
  pathname: string
}>

const PRODUCT_PREFIXES: ReadonlySet<string> = new Set(
  MARKET_CODES.map(
    (market) => ROUTE_SEGMENT_REGISTRY[market].typePrefixes.products
  )
)
const PRODUCT_DETAIL_PATH = /^\/([^/]+)\/([^/]+)$/

const parseProductPath = (
  pathname: string
): Readonly<{ prefix: string; slug: string }> | null => {
  const match = PRODUCT_DETAIL_PATH.exec(pathname)
  return match ? { prefix: match[1], slug: match[2] } : null
}

const isProductNamespace = (pathname: string) => {
  const firstSegment = pathname.split("/")[1]
  return firstSegment ? PRODUCT_PREFIXES.has(firstSegment) : false
}

const isCanonicalSlug = (slug: string) => {
  try {
    validatePublishedSlug(slug)
    return true
  } catch {
    return false
  }
}

export const resolveProductProxyAction = ({
  enabled,
  host,
  method,
  pathname,
}: ProductProxyInput): ProductProxyAction => {
  if (!isProductNamespace(pathname)) {
    return { kind: "next" }
  }
  if (!enabled) {
    return { kind: "next" }
  }

  const parsedPath = parseProductPath(pathname)
  if (!parsedPath) {
    return pathname.endsWith("/") || pathname.split("/").length > 3
      ? { kind: "respond", status: 404 }
      : { kind: "next" }
  }

  const marketContext = resolveCanonicalMarket(host)
  if (!marketContext) {
    return { kind: "respond", status: 421 }
  }
  if (host !== new URL(marketContext.canonicalOrigin).hostname) {
    return { kind: "respond", status: 421 }
  }
  const { market } = marketContext

  const expectedPrefix = ROUTE_SEGMENT_REGISTRY[market].typePrefixes.products
  if (parsedPath.prefix !== expectedPrefix) {
    return { kind: "respond", status: 404 }
  }

  const normalizedMethod = method.toUpperCase()
  if (normalizedMethod === "OPTIONS") {
    return { allow: "GET, HEAD", kind: "respond", status: 204 }
  }
  if (!(normalizedMethod === "GET" || normalizedMethod === "HEAD")) {
    return { allow: "GET, HEAD", kind: "respond", status: 405 }
  }
  if (!isCanonicalSlug(parsedPath.slug)) {
    return { kind: "respond", status: 404 }
  }
  return {
    canonicalOrigin: marketContext.canonicalOrigin,
    kind: "rewrite",
    market,
    pathname: `/~sf/${market}/products/${parsedPath.slug}`,
    publicPath: pathname,
    routeKey: "product.detail",
  }
}

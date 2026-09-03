import { createMarketRoutingRuntime } from "@/lib/market/market-runtime"
import { normalizeHost } from "@/lib/market/market-runtime-definitions"
import { isPrivatePagesPath } from "./private-pages-path"

export type M00Market = "sk" | "cz" | "hu" | "ro"

export type M00ProxyAction =
  | { kind: "next" }
  | { allow?: "GET, HEAD"; kind: "respond"; status: 204 | 404 | 405 | 421 }
  | {
      canonicalOrigin: string
      kind: "rewrite"
      market: M00Market
      pathname: string
      publicPath: string
      routeKey: "m00.status"
    }

type M00ProxyInput = {
  enabled: boolean
  environment?: Readonly<Record<string, string | undefined>>
  host: string | null
  method: string
  pathname: string
}

const PROBE_PATH = /^\/__url-m00\/(current|alias|missing|gone|unavailable)$/

export const isM00ProbePath = (pathname: string) => PROBE_PATH.test(pathname)

export const resolveCanonicalMarket = (
  host: string | null,
  environment: Readonly<Record<string, string | undefined>> = process.env
): { canonicalOrigin: string; market: M00Market } | null => {
  const hostname = normalizeHost(host)
  if (!hostname) {
    return null
  }
  try {
    const runtime = createMarketRoutingRuntime(environment)
    const market = runtime.marketByHost[hostname]
    const binding = market ? runtime.bindings[market] : undefined
    return binding
      ? { canonicalOrigin: binding.canonicalOrigin, market: binding.market }
      : null
  } catch {
    return null
  }
}

export const resolveM00ProxyAction = ({
  enabled,
  environment = process.env,
  host,
  method,
  pathname,
}: M00ProxyInput): M00ProxyAction => {
  if (isPrivatePagesPath(pathname)) {
    return { kind: "respond", status: 404 }
  }

  const probe = PROBE_PATH.exec(pathname)
  if (!probe) {
    return { kind: "next" }
  }

  if (!enabled) {
    return { kind: "respond", status: 404 }
  }

  const marketContext = resolveCanonicalMarket(host, environment)
  if (!marketContext) {
    return { kind: "respond", status: 421 }
  }

  const normalizedMethod = method.toUpperCase()
  if (normalizedMethod === "OPTIONS") {
    return { allow: "GET, HEAD", kind: "respond", status: 204 }
  }
  if (!(normalizedMethod === "GET" || normalizedMethod === "HEAD")) {
    return { allow: "GET, HEAD", kind: "respond", status: 405 }
  }

  return {
    canonicalOrigin: marketContext.canonicalOrigin,
    kind: "rewrite",
    market: marketContext.market,
    pathname: `/~sf/${marketContext.market}/__m00/${probe[1]}`,
    publicPath: pathname,
    routeKey: "m00.status",
  }
}

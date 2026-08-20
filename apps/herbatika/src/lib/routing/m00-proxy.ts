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
  host: string | null
  method: string
  pathname: string
}

const MARKET_BY_HOST: ReadonlyMap<
  string,
  { canonicalOrigin: string; market: M00Market }
> = new Map([
  ["herbatica.sk", { canonicalOrigin: "https://herbatica.sk", market: "sk" }],
  ["herbatica.cz", { canonicalOrigin: "https://herbatica.cz", market: "cz" }],
  ["herbatica.hu", { canonicalOrigin: "https://herbatica.hu", market: "hu" }],
  ["herbatica.ro", { canonicalOrigin: "https://herbatica.ro", market: "ro" }],
])

const PROBE_PATH = /^\/__url-m00\/(current|alias|missing|gone|unavailable)$/
const AUTHORITY = /^([a-z0-9.-]+)(?::([0-9]{1,5}))?$/i
const TRAILING_DOT = /\.$/

export const isM00ProbePath = (pathname: string) => PROBE_PATH.test(pathname)

export const resolveCanonicalMarket = (
  host: string | null
): { canonicalOrigin: string; market: M00Market } | null => {
  if (
    !host ||
    host.includes(",") ||
    host.includes("/") ||
    host.includes("\\") ||
    [...host].some((character) => character.charCodeAt(0) <= 32)
  ) {
    return null
  }

  const match = AUTHORITY.exec(host)
  if (!match) {
    return null
  }

  const [, rawHostname, rawPort] = match
  if (rawPort !== undefined) {
    const port = Number(rawPort)
    if (rawPort.startsWith("0") || port < 1 || port > 65_535) {
      return null
    }
  }

  const hostname = rawHostname.toLowerCase().replace(TRAILING_DOT, "")
  return MARKET_BY_HOST.get(hostname) ?? null
}

export const resolveM00ProxyAction = ({
  enabled,
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

  const marketContext = resolveCanonicalMarket(host)
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

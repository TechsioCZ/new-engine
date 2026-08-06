import { getMarketOrigin } from "@/lib/url/builder"
import { MARKETS, type Market } from "@/lib/url/types"

const TRAILING_DOT_PATTERN = /\.$/

const isMarket = (value: string): value is Market =>
  (MARKETS as readonly string[]).includes(value)

const resolveAllowedMarkets = (): ReadonlySet<Market> => {
  const configured = process.env.ALLOWED_MARKETS
  if (!configured?.trim()) {
    return new Set(MARKETS)
  }

  return new Set(
    configured
      .split(",")
      .map((candidate) => candidate.trim().toLowerCase())
      .filter(isMarket)
  )
}

const HOSTNAME_PATTERN =
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i
const INVALID_AUTHORITY_CHARACTERS = new Set([",", "/", "?", "#", "@", "\\"])
const PORT_PATTERN = /^\d+$/

/** Normalize one RFC-style Host authority without accepting lists or URLs. */
export function normalizeRequestHost(
  value: string | null | undefined
): string | null {
  const candidate = value?.trim()
  if (!candidate) {
    return null
  }
  for (const character of candidate) {
    const codePoint = character.codePointAt(0) ?? 0
    if (
      codePoint <= 32 ||
      codePoint === 127 ||
      INVALID_AUTHORITY_CHARACTERS.has(character)
    ) {
      return null
    }
  }

  const parts = candidate.split(":")
  if (parts.length > 2) {
    return null
  }
  const port = parts[1]
  if (
    port !== undefined &&
    (!PORT_PATTERN.test(port) || Number(port) > 65_535)
  ) {
    return null
  }

  const hostname = (parts[0] ?? "")
    .toLowerCase()
    .replace(TRAILING_DOT_PATTERN, "")
  if (
    hostname.length === 0 ||
    hostname.length > 253 ||
    !HOSTNAME_PATTERN.test(hostname)
  ) {
    return null
  }
  return hostname
}

const configuredHosts = (market: Market): string[] =>
  (process.env[`HERBATICA_ALLOWED_HOSTS_${market.toUpperCase()}`] ?? "")
    .split(",")
    .map((host) => normalizeRequestHost(host))
    .filter((host): host is string => host !== null)

/** Resolve a deployment-enabled market exclusively from a validated Host. */
export function resolveMarketFromHost(
  value: string | null | undefined
): Market | null {
  const host = normalizeRequestHost(value)
  if (host === null) {
    return null
  }

  const allowedMarkets = resolveAllowedMarkets()
  const matches = MARKETS.filter((market) => {
    if (!allowedMarkets.has(market)) {
      return false
    }
    const canonicalHost = new URL(getMarketOrigin(market)).hostname
      .toLowerCase()
      .replace(TRAILING_DOT_PATTERN, "")
    return host === canonicalHost || configuredHosts(market).includes(host)
  })
  return matches.length === 1 ? (matches[0] ?? null) : null
}

export function resolveAllowedMarketParam(value: string): Market | null {
  return isMarket(value) && resolveAllowedMarkets().has(value) ? value : null
}

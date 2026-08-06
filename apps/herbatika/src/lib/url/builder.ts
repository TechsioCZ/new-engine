import { getSegment, ROUTABLE_SEGMENT_KEYS, type SegmentKey } from "./segments"
import { validateSlug } from "./slug"
import { MARKETS, type Market, type UrlKind, type UrlRecord } from "./types"

export type BuildUrlInput = {
  market: Market
  kind: UrlKind
  slug: string
}

export type BuildIndexUrlInput = Omit<BuildUrlInput, "slug">

export type QueryInput =
  | string
  | URLSearchParams
  | Readonly<Record<string, string | readonly string[] | undefined>>

export type CanonicalQueryParam = "znacka" | "kategorie" | "strana"

export type BuildCanonicalInput = {
  market: Market
  kind?: UrlKind
  slug?: string
  pathname?: string
  searchParams?: QueryInput
  /** May only narrow the fixed SEO allowlist; it cannot introduce new keys. */
  allowedQueryParams?: readonly CanonicalQueryParam[]
}

export type CheckoutSegmentKey = Extract<SegmentKey, `checkout.${string}`>
export type AccountSegmentKey = Extract<SegmentKey, `account.${string}`>

export type FlowUrlInput =
  | { market: Market; flow: "cart" }
  | { market: Market; flow: "search"; query?: string }
  | { market: Market; flow: "checkout"; step?: CheckoutSegmentKey }
  | {
      market: Market
      flow: "account"
      section?: AccountSegmentKey
      value?: string
    }
  | { market: Market; flow: "reviews"; token: string }

export type Alternate = {
  hrefLang: "sk-SK" | "cs-CZ" | "hu-HU" | "ro-RO"
  href: string
}

const DEFAULT_MARKET_ORIGINS = {
  sk: "https://herbatica.sk",
  cz: "https://herbatica.cz",
  hu: "https://herbatica.hu",
  ro: "https://herbatica.ro",
} as const satisfies Record<Market, string>

export const MARKET_ORIGIN_ENV = {
  sk: "HERBATICA_ORIGIN_SK",
  cz: "HERBATICA_ORIGIN_CZ",
  hu: "HERBATICA_ORIGIN_HU",
  ro: "HERBATICA_ORIGIN_RO",
} as const satisfies Record<Market, string>

export const MARKET_HREF_LANG = {
  sk: "sk-SK",
  cz: "cs-CZ",
  hu: "hu-HU",
  ro: "ro-RO",
} as const satisfies Record<Market, Alternate["hrefLang"]>

const CANONICAL_QUERY_PARAMS = new Set<CanonicalQueryParam>([
  "znacka",
  "kategorie",
  "strana",
])
const WWW_PREFIX_PATTERN = /^www\./
const PAGINATION_PATTERN = /^[2-9]\d*$/

function normalizeOrigin(value: string, market: Market): string {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error(`Invalid canonical origin for market ${market}`)
  }

  if (!url.hostname || url.username || url.password) {
    throw new Error(`Invalid canonical origin for market ${market}`)
  }

  url.protocol = "https:"
  url.hostname = url.hostname.toLowerCase().replace(WWW_PREFIX_PATTERN, "")
  url.pathname = ""
  url.search = ""
  url.hash = ""

  return url.origin
}

/** Read the server-only market origin at call time so one build serves all markets. */
export function getMarketOrigin(
  market: Market,
  environment: Record<string, string | undefined> = process.env
): string {
  const configured = environment[MARKET_ORIGIN_ENV[market]]
  return normalizeOrigin(
    configured?.trim() || DEFAULT_MARKET_ORIGINS[market],
    market
  )
}

export function buildUrl({ market, kind, slug }: BuildUrlInput): string {
  const segmentKey = ROUTABLE_SEGMENT_KEYS[kind]
  return `/${getSegment(market, segmentKey)}/${validateSlug(slug)}`
}

export function buildIndexUrl({ market, kind }: BuildIndexUrlInput): string {
  return `/${getSegment(market, ROUTABLE_SEGMENT_KEYS[kind])}`
}

export function buildAbsoluteUrl(input: BuildUrlInput): string {
  return `${getMarketOrigin(input.market)}${buildUrl(input)}`
}

function encodeOpaquePathSegment(value: string, name: string): string {
  if (!value || value === "." || value === "..") {
    throw new Error(`${name} must be a non-empty path segment`)
  }
  return encodeURIComponent(value)
}

export function buildFlowUrl(input: FlowUrlInput): string {
  const root = `/${getSegment(input.market, input.flow)}`

  switch (input.flow) {
    case "cart":
      return root
    case "search": {
      if (input.query === undefined) {
        return root
      }
      const query = input.query.trim()
      return query ? `${root}?${new URLSearchParams({ q: query })}` : root
    }
    case "checkout":
      return input.step
        ? `${root}/${getSegment(input.market, input.step)}`
        : root
    case "account": {
      if (!input.section) {
        if (input.value !== undefined) {
          throw new Error("An account value requires an account section")
        }
        return root
      }
      const sectionPath = `${root}/${getSegment(input.market, input.section)}`
      return input.value === undefined
        ? sectionPath
        : `${sectionPath}/${encodeOpaquePathSegment(input.value, "Account value")}`
    }
    case "reviews":
      return `${root}/${getSegment(input.market, "reviews.product")}/${encodeOpaquePathSegment(input.token, "Review token")}`
    default:
      throw new Error(`Unsupported flow: ${input satisfies never}`)
  }
}

export function buildCartUrl(market: Market): string {
  return buildFlowUrl({ market, flow: "cart" })
}

export function buildSearchUrl(market: Market, query?: string): string {
  return buildFlowUrl({ market, flow: "search", query })
}

export function buildCheckoutUrl(
  market: Market,
  step?: CheckoutSegmentKey
): string {
  return buildFlowUrl({ market, flow: "checkout", step })
}

export function buildAccountUrl(
  market: Market,
  section?: AccountSegmentKey,
  value?: string
): string {
  return buildFlowUrl({ market, flow: "account", section, value })
}

export function buildReviewUrl(market: Market, token: string): string {
  return buildFlowUrl({ market, flow: "reviews", token })
}

export function buildProductVariantUrl(
  input: BuildUrlInput & { sku: string }
): string {
  if (input.kind !== "product") {
    throw new Error("Product variant URLs require kind=product")
  }
  if (!input.sku) {
    throw new Error("Product variant SKU cannot be empty")
  }

  const query = new URLSearchParams({ varianta: input.sku })
  return `${buildUrl(input)}?${query}`
}

function toSearchParams(input?: QueryInput): URLSearchParams {
  if (!input) {
    return new URLSearchParams()
  }
  if (typeof input === "string" || input instanceof URLSearchParams) {
    return new URLSearchParams(input)
  }

  const result = new URLSearchParams()
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) {
      continue
    }
    if (typeof value === "string") {
      result.append(key, value)
      continue
    }
    for (const item of value) {
      result.append(key, item)
    }
  }
  return result
}

function normalizeCanonicalPath(pathname: string): string {
  const segments = pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      let decoded: string
      try {
        decoded = decodeURIComponent(segment)
      } catch {
        throw new Error("Canonical pathname contains invalid percent encoding")
      }
      return encodeURIComponent(decoded.toLowerCase())
    })

  return segments.length === 0 ? "/" : `/${segments.join("/")}`
}

function defaultAllowedQueryParams(
  kind: UrlKind | undefined,
  hasSlug: boolean
): readonly CanonicalQueryParam[] {
  if (kind === "product" && hasSlug) {
    return []
  }
  if (kind === "article" && !hasSlug) {
    return ["strana"]
  }
  if (kind === "page" || (kind === "article" && hasSlug)) {
    return []
  }
  return ["znacka", "kategorie", "strana"]
}

function canonicalizeQuery(
  input: QueryInput | undefined,
  allowedParams: readonly CanonicalQueryParam[]
): string {
  const source = toSearchParams(input)
  const allowed = new Set(
    allowedParams.filter((key) => CANONICAL_QUERY_PARAMS.has(key))
  )
  const brandValues = allowed.has("znacka") ? source.getAll("znacka") : []
  const categoryValues = allowed.has("kategorie")
    ? source.getAll("kategorie")
    : []

  // Two or more filters canonicalize to the clean listing URL.
  if (brandValues.length + categoryValues.length > 1) {
    return ""
  }

  const result = new URLSearchParams()
  let filter: readonly ["znacka" | "kategorie", string] | undefined
  if (brandValues[0]) {
    filter = ["znacka", brandValues[0]]
  } else if (categoryValues[0]) {
    filter = ["kategorie", categoryValues[0]]
  }
  if (filter) {
    const value = filter[1].trim().toLowerCase()
    if (value) {
      result.set(filter[0], value)
    }
  }

  if (allowed.has("strana")) {
    const pages = source.getAll("strana")
    if (pages.length === 1 && PAGINATION_PATTERN.test(pages[0] ?? "")) {
      result.set("strana", String(Number(pages[0])))
    }
  }

  return result.toString()
}

/**
 * Build an absolute canonical from explicit trusted market context. Unknown,
 * tracking, and `varianta` parameters are omitted; only the fixed SEO query
 * allowlist can survive.
 */
export function buildCanonical(input: BuildCanonicalInput): string {
  if (!(input.pathname || input.kind)) {
    throw new Error("Canonical input requires pathname or kind")
  }
  if (input.pathname && input.kind) {
    throw new Error("Canonical input must use pathname or kind, not both")
  }
  if (input.slug && !input.kind) {
    throw new Error("Canonical slug requires a kind")
  }

  let pathname: string
  if (input.pathname) {
    pathname = normalizeCanonicalPath(input.pathname)
  } else if (input.kind && input.slug) {
    pathname = buildUrl({
      market: input.market,
      kind: input.kind,
      slug: input.slug,
    })
  } else if (input.kind) {
    pathname = buildIndexUrl({ market: input.market, kind: input.kind })
  } else {
    throw new Error("Canonical input requires a kind")
  }
  const allowed =
    input.allowedQueryParams ??
    defaultAllowedQueryParams(input.kind, input.slug !== undefined)
  const query = canonicalizeQuery(input.searchParams, allowed)
  const origin = getMarketOrigin(input.market)

  return `${origin}${pathname === "/" ? "" : pathname}${query ? `?${query}` : ""}`
}

export function buildAlternates(records: UrlRecord[]): Alternate[] {
  const recordsByMarket = new Map<Market, UrlRecord>()

  for (const record of records) {
    if (record.status !== "current" || !record.indexable) {
      continue
    }
    if (recordsByMarket.has(record.market)) {
      throw new Error(`Duplicate current alternate for market ${record.market}`)
    }
    recordsByMarket.set(record.market, record)
  }

  return MARKETS.flatMap((market) => {
    const record = recordsByMarket.get(market)
    return record
      ? [
          {
            hrefLang: MARKET_HREF_LANG[market],
            href: buildAbsoluteUrl(record),
          },
        ]
      : []
  })
}

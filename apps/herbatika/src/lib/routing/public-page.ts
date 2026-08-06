import type { GetServerSidePropsContext, GetServerSidePropsResult } from "next"
import type { AbstractIntlMessages } from "next-intl"
import {
  buildEntityPageMetadata,
  buildIndexPageMetadata,
  buildNoindexMetadata,
  type SeoPageMetadata,
} from "@/lib/seo/metadata"
import { assertServerOnly } from "@/lib/server-guard"
import {
  getHerbatikaMarketContext,
  type HerbatikaMarketContext,
} from "@/lib/storefront/market-context"
import type { RequestServerContext } from "@/lib/storefront/market-context.server"
import { fetchStorefrontTextMessages } from "@/lib/storefront/storefront-texts.server"
import { buildAbsoluteUrl } from "@/lib/url/builder"
import {
  MARKETS,
  type Market,
  URL_KINDS,
  type UrlKind,
  type UrlRecord,
} from "@/lib/url/types"
import type { UrlLookupResult, UrlRegistry } from "@/lib/url-registry/contracts"
import { getUrlRegistry } from "@/lib/url-registry/factory"
import { type RouteSearchParams, validateEntityQuery } from "./query-validation"

assertServerOnly("routing/public-page")

export type HardStatusCode = 400 | 410 | 503

export type StatusPage = {
  code: HardStatusCode
  message: string
}

export type StorefrontShellProps = {
  marketContext: HerbatikaMarketContext
  messages: AbstractIntlMessages
}

export type EntityPageProps<TSource> = StorefrontShellProps & {
  source: TSource | null
  status: StatusPage | null
  seo: SeoPageMetadata
}

export type SourceReadResult<T> =
  | { type: "found"; value: T }
  | { type: "not-found" }
  | { type: "unavailable"; retryAfterSeconds?: number }

const isMarket = (value: unknown): value is Market =>
  typeof value === "string" && (MARKETS as readonly string[]).includes(value)

const scalarHeader = (
  value: string | string[] | undefined
): string | undefined => (Array.isArray(value) ? value[0] : value)

export const createRequestServerContext = (
  context: GetServerSidePropsContext,
  market: Market
): RequestServerContext => ({
  cookieHeader: scalarHeader(context.req.headers.cookie),
  host: scalarHeader(context.req.headers.host),
  market,
  trustedMarket: scalarHeader(context.req.headers["x-sf-market"]),
})

export const isUrlKind = (value: unknown): value is UrlKind =>
  typeof value === "string" && (URL_KINDS as readonly string[]).includes(value)

const toRouteQuery = (
  context: GetServerSidePropsContext
): RouteSearchParams => {
  const query = new URL(context.resolvedUrl, "https://internal.invalid")
    .searchParams
  const result: RouteSearchParams = {}
  for (const key of new Set(query.keys())) {
    const values = query.getAll(key)
    result[key] = values.length > 1 ? values : values[0]
  }
  return result
}

const loadShell = async (market: Market): Promise<StorefrontShellProps> => {
  const marketContext = getHerbatikaMarketContext(market)
  let messages: AbstractIntlMessages = {}
  try {
    messages = await fetchStorefrontTextMessages(marketContext)
  } catch {
    // A source-specific request still owns its 503 classification. The status
    // view must remain renderable when localized UI messages are unavailable.
  }
  return { marketContext, messages }
}

const statusResult = async <TSource>({
  context,
  market,
  code,
  message,
  retryAfterSeconds,
}: {
  context: GetServerSidePropsContext
  market: Market
  code: HardStatusCode
  message: string
  retryAfterSeconds?: number
}): Promise<GetServerSidePropsResult<EntityPageProps<TSource>>> => {
  context.res.statusCode = code
  if (code === 503) {
    context.res.setHeader("Retry-After", String(retryAfterSeconds ?? 60))
  }
  return {
    props: {
      ...(await loadShell(market)),
      source: null,
      status: { code, message },
      seo: buildNoindexMetadata({ market, title: `${code} | Herbatica` }),
    },
  }
}

const canonicalDestination = (
  market: Market,
  kind: UrlKind,
  slug: string,
  resolvedUrl: string
) => {
  const suffix = new URL(resolvedUrl, "https://internal.invalid").search
  return `${buildAbsoluteUrl({ market, kind, slug })}${suffix}`
}

export async function resolveEntityPage<TSource>(
  context: GetServerSidePropsContext,
  expectedKind: UrlKind,
  loadSource: (input: {
    entityId: string
    market: Market
    requestContext: RequestServerContext
  }) => Promise<SourceReadResult<TSource>>
): Promise<GetServerSidePropsResult<EntityPageProps<TSource>>> {
  const marketParam = context.params?.market
  const slugParam = context.params?.slug
  if (!(isMarket(marketParam) && typeof slugParam === "string")) {
    return { notFound: true }
  }
  const requestContext = createRequestServerContext(context, marketParam)

  const query = toRouteQuery(context)
  if (!validateEntityQuery(expectedKind, query).valid) {
    return statusResult({
      context,
      market: marketParam,
      code: 400,
      message: "Bad Request",
    })
  }

  const lookupSlug = slugParam.toLowerCase()
  let registry: UrlRegistry
  let lookup: UrlLookupResult
  try {
    registry = await getUrlRegistry()
    lookup = await registry.lookup(marketParam, expectedKind, lookupSlug)
  } catch {
    return statusResult({
      context,
      market: marketParam,
      code: 503,
      message: "URL registry is temporarily unavailable",
    })
  }

  if (lookup.type === "missing") {
    return { notFound: true }
  }
  if (lookup.type === "tombstone") {
    return statusResult({
      context,
      market: marketParam,
      code: 410,
      message: "This content is gone",
    })
  }

  const currentRecord =
    lookup.type === "alias" ? lookup.currentRecord : lookup.record
  const mustCanonicalize =
    lookup.type === "alias" ||
    slugParam !== currentRecord.slug ||
    context.req.headers["x-sf-canonicalization-required"] === "1"
  if (mustCanonicalize) {
    return {
      redirect: {
        destination: canonicalDestination(
          marketParam,
          expectedKind,
          currentRecord.slug,
          context.resolvedUrl
        ),
        permanent: true,
      },
    }
  }

  let source: SourceReadResult<TSource>
  try {
    source = await loadSource({
      entityId: currentRecord.entityId,
      market: marketParam,
      requestContext,
    })
  } catch {
    source = { type: "unavailable" }
  }
  if (source.type === "not-found") {
    return { notFound: true }
  }
  if (source.type === "unavailable") {
    return statusResult({
      context,
      market: marketParam,
      code: 503,
      message: "Storefront source is temporarily unavailable",
      retryAfterSeconds: source.retryAfterSeconds,
    })
  }

  let alternates: UrlRecord[]
  try {
    alternates = await registry.findAlternates(currentRecord.equivalenceKey)
  } catch {
    return statusResult({
      context,
      market: marketParam,
      code: 503,
      message: "URL registry is temporarily unavailable",
    })
  }

  return {
    props: {
      ...(await loadShell(marketParam)),
      source: source.value,
      status: null,
      seo: buildEntityPageMetadata({
        market: marketParam,
        kind: expectedKind,
        record: currentRecord,
        alternates,
        query,
      }),
    },
  }
}

export const resolveMarketParam = (
  context: GetServerSidePropsContext
): Market | null => {
  const market = context.params?.market
  return isMarket(market) ? market : null
}

export { loadShell }

export type IndexPageProps<TSource> = StorefrontShellProps & {
  source: TSource | null
  status: StatusPage | null
  seo: SeoPageMetadata
}

export async function resolveIndexPage<TSource>(
  context: GetServerSidePropsContext,
  kind: UrlKind,
  loadSource: (
    market: Market,
    requestContext: RequestServerContext
  ) => Promise<SourceReadResult<TSource>>
): Promise<GetServerSidePropsResult<IndexPageProps<TSource>>> {
  const market = resolveMarketParam(context)
  if (!market) {
    return { notFound: true }
  }
  const requestContext = createRequestServerContext(context, market)
  const query = toRouteQuery(context)
  if (!validateEntityQuery(kind, query).valid) {
    return statusResult({ context, market, code: 400, message: "Bad Request" })
  }
  let source: SourceReadResult<TSource>
  try {
    source = await loadSource(market, requestContext)
  } catch {
    source = { type: "unavailable" }
  }
  if (source.type === "not-found") {
    return { notFound: true }
  }
  if (source.type === "unavailable") {
    return statusResult({
      context,
      market,
      code: 503,
      message: "Storefront source is temporarily unavailable",
      retryAfterSeconds: source.retryAfterSeconds,
    })
  }
  const pageRaw = query.strana
  const pageValue = Array.isArray(pageRaw) ? pageRaw[0] : pageRaw
  const page = pageValue ? Number.parseInt(pageValue, 10) : undefined
  return {
    props: {
      ...(await loadShell(market)),
      source: source.value,
      status: null,
      seo: buildIndexPageMetadata({ market, kind, page }),
    },
  }
}

export type FlowPageProps<TSource = null> = StorefrontShellProps & {
  source: TSource | null
  status: StatusPage | null
  seo: SeoPageMetadata
}

export async function resolveFlowPage<TSource = null>(
  context: GetServerSidePropsContext,
  loadSource?: (
    market: Market,
    requestContext: RequestServerContext
  ) => Promise<SourceReadResult<TSource>>
): Promise<GetServerSidePropsResult<FlowPageProps<TSource>>> {
  const market = resolveMarketParam(context)
  if (!market) {
    return { notFound: true }
  }
  const requestContext = createRequestServerContext(context, market)
  let source: SourceReadResult<TSource> = {
    type: "found",
    value: null as TSource,
  }
  if (loadSource) {
    try {
      source = await loadSource(market, requestContext)
    } catch {
      source = { type: "unavailable" }
    }
  }
  if (source.type === "not-found") {
    return { notFound: true }
  }
  if (source.type === "unavailable") {
    return statusResult({
      context,
      market,
      code: 503,
      message: "Storefront source is temporarily unavailable",
      retryAfterSeconds: source.retryAfterSeconds,
    })
  }
  return {
    props: {
      ...(await loadShell(market)),
      source: source.value,
      status: null,
      seo: buildNoindexMetadata({ market }),
    },
  }
}

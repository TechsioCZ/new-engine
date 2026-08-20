// biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: Public Pages resolvers are explicit fail-closed transaction boundaries for routing, source validation, canonicalization, and SEO.
// Pages Router rejects the App-Router-only `server-only` marker. This module
// is a Pages SSR boundary and must stay reachable only from getServerSideProps.

import type { RegionInfo } from "@techsio/storefront-data/shared/region"
import { nestStorefrontMessages } from "@techsio/storefront-i18n/core/messages"
import type { GetServerSidePropsContext, GetServerSidePropsResult } from "next"
import type { AbstractIntlMessages } from "next-intl"
import type { ReviewTrustSource } from "@/components/reviews/reviews.types"
import { getConfiguredMarketRoutingRuntime } from "@/lib/market/market-runtime.server"
import { fetchCmsFooterNavigation } from "@/lib/storefront/cms-footer-navigation"
import type { CmsFooterNavigation } from "@/lib/storefront/cms-types"
import { fetchExternalReviewTrustSources } from "@/lib/storefront/external-reviews.server"
import {
  getHerbatikaMarketContext,
  type HerbatikaMarketContext,
} from "@/lib/storefront/market-context"
import { getRegionServerContext } from "@/lib/storefront/ssr/context"
import type { PublicEntitySlugMap } from "@/lib/storefront/ssr/public-entity-projection-map"
import { readRequiredPublicEntitySlugs } from "@/lib/storefront/ssr/public-entity-projections"
import { fetchStorefrontTextMessages } from "@/lib/storefront/storefront-texts.server"
import { hasValidActiveProjection } from "@/lib/url/public-route-api"
import type { PublicSeoSchemaType } from "@/lib/url/public-seo"
import { classifySeo } from "@/lib/url/public-seo"
import { buildAbsoluteUrl, buildPath } from "@/lib/url/public-url"
import { normalizeQuery, type QueryRouteKind } from "@/lib/url/query-normalizer"
import { parseMarket } from "@/lib/url/segments"
import { validatePublishedSlug } from "@/lib/url/slug"
import type { Market } from "@/lib/url/types"
import type { SourceReadResult } from "@/lib/url-registry/contracts"
import type {
  ActiveEntityRouteTarget,
  EntityUrlKind,
} from "@/lib/url-registry/model"
import { getUrlRegistryRuntime } from "@/lib/url-registry/runtime/instance.server"

export type PublicSeo = Readonly<{
  alternates?: Readonly<Record<string, string>>
  canonical?: string
  description?: string
  robots: "index, follow" | "noindex, follow" | "noindex, nofollow"
  schemaType?: PublicSeoSchemaType
  title?: string
}>

export type StorefrontShellProps = Readonly<{
  categoryPublicSlugsById: PublicEntitySlugMap
  footerNavigation: CmsFooterNavigation
  initialRegion: RegionInfo | null
  marketContext: HerbatikaMarketContext
  messages: AbstractIntlMessages
  reviewTrustSources: readonly ReviewTrustSource[]
}>

export type PublicPageProps<Value> = StorefrontShellProps &
  Readonly<{
    page:
      | Readonly<{ kind: "found"; value: Value }>
      | Readonly<{ kind: "error"; status: 400 | 410 | 503 }>
    seo: PublicSeo
  }>

export type PublicSourceResult<Value> = SourceReadResult<Value>

const NO_STORE = "private, no-store, max-age=0, must-revalidate"
const HREF_LANG = {
  sk: "sk-SK",
  cz: "cs-CZ",
  hu: "hu-HU",
  ro: "ro-RO",
} as const satisfies Record<Market, string>

const singleValue = (value: string | string[] | undefined): string | null =>
  typeof value === "string" ? value : null

const rawQueryFromRequest = (url: string | undefined) => {
  if (!url) {
    return ""
  }
  const queryIndex = url.indexOf("?")
  return queryIndex < 0 ? "" : url.slice(queryIndex + 1)
}

const setNoStore = (context: GetServerSidePropsContext) => {
  context.res.setHeader("Cache-Control", NO_STORE)
}

export const loadPublicShell = async (
  market: Market,
  categoryPublicSlugsById?: PublicEntitySlugMap
): Promise<StorefrontShellProps> => {
  const marketContext = getHerbatikaMarketContext(
    market,
    new URL(configuredCanonicalOrigin(market)).hostname
  )
  const [
    flatMessages,
    reviewTrustSources,
    footerNavigation,
    categoryProjections,
    regionContext,
  ] = await Promise.all([
    fetchStorefrontTextMessages(marketContext),
    fetchExternalReviewTrustSources(market),
    fetchCmsFooterNavigation(marketContext.locale).catch(() => ({
      columns: [],
    })),
    categoryPublicSlugsById
      ? Promise.resolve({
          kind: "found" as const,
          value: categoryPublicSlugsById,
        })
      : readRequiredPublicEntitySlugs({ kind: "category", market }),
    getRegionServerContext({ market }),
  ])
  if (categoryProjections.kind !== "found") {
    throw new Error("Category URL projections are unavailable")
  }
  return {
    categoryPublicSlugsById: categoryProjections.value,
    footerNavigation,
    initialRegion: regionContext.region,
    marketContext,
    messages: nestStorefrontMessages(flatMessages),
    reviewTrustSources,
  }
}

export const loadPublicErrorShell = async (
  market: Market
): Promise<StorefrontShellProps> => {
  const marketContext = getHerbatikaMarketContext(
    market,
    new URL(configuredCanonicalOrigin(market)).hostname
  )
  const [flatMessages, reviewTrustSources] = await Promise.all([
    fetchStorefrontTextMessages(marketContext).catch(() => ({})),
    fetchExternalReviewTrustSources(market).catch(() => []),
  ])
  return {
    categoryPublicSlugsById: {},
    footerNavigation: { columns: [] },
    initialRegion: null,
    marketContext,
    messages: nestStorefrontMessages(flatMessages),
    reviewTrustSources,
  }
}

export const errorResult = async <Value>(
  context: GetServerSidePropsContext,
  market: Market,
  status: 400 | 410 | 503,
  retryAfterSeconds?: number
): Promise<GetServerSidePropsResult<PublicPageProps<Value>>> => {
  setNoStore(context)
  context.res.statusCode = status
  context.res.setHeader("X-Robots-Tag", "noindex, nofollow")
  if (status === 503) {
    const retry = Math.max(
      1,
      Math.min(300, Math.trunc(retryAfterSeconds ?? 30))
    )
    context.res.setHeader("Retry-After", String(retry))
  }
  return {
    props: {
      ...(await loadPublicErrorShell(market)),
      page: { kind: "error", status },
      seo: { robots: "noindex, nofollow" },
    },
  }
}

export const notFoundResult = <Value>(context: GetServerSidePropsContext) => {
  setNoStore(context)
  context.res.setHeader("X-Robots-Tag", "noindex, nofollow")
  return Promise.resolve({
    notFound: true,
  } as GetServerSidePropsResult<PublicPageProps<Value>>)
}

export const redirectResult = <Value>(
  context: GetServerSidePropsContext,
  destination: string,
  statusCode: 307 | 308 = 308
) => {
  setNoStore(context)
  return Promise.resolve({
    redirect: { destination, statusCode },
  } as GetServerSidePropsResult<PublicPageProps<Value>>)
}

const configuredCanonicalOrigin = (market: Market): string => {
  const binding = getConfiguredMarketRoutingRuntime().bindings[market]
  if (!binding) {
    throw new Error(`Market ${market} is not configured`)
  }
  return binding.canonicalOrigin
}

const trustedMarket = (
  context: GetServerSidePropsContext,
  expectedRouteKey: string
): Market | null => {
  const marketParam = singleValue(context.params?.market)
  const market = marketParam ? parseMarket(marketParam) : null
  if (!market) {
    return null
  }
  const headers = context.req.headers
  return headers["x-sf-market"] === market &&
    headers["x-sf-canonical-origin"] === configuredCanonicalOrigin(market) &&
    headers["x-sf-route-key"] === expectedRouteKey &&
    typeof headers["x-sf-public-path"] === "string"
    ? market
    : null
}

const urlWithQuery = (pathname: string, rawQuery: string) =>
  rawQuery ? `${pathname}?${rawQuery}` : pathname

const currentAbsoluteUrl = (
  market: Market,
  kind: EntityUrlKind,
  slug: string,
  rawQuery: string
) => urlWithQuery(buildAbsoluteUrl({ kind, slug }, market).href, rawQuery)

export const loadEntityAlternates = async <Value>(
  current: ActiveEntityRouteTarget,
  loadSource: (input: {
    market: Market
    sourceId: string
  }) => Promise<PublicSourceResult<Value>>,
  isIndexable?: (value: Value) => boolean
): Promise<Readonly<Record<string, string>>> => {
  if (
    !hasValidActiveProjection(
      current,
      current.route.market,
      current.route.kind
    ) ||
    current.route.indexPolicy !== "indexable"
  ) {
    throw new Error("Current route projection is invalid")
  }
  const self = [
    HREF_LANG[current.route.market],
    buildAbsoluteUrl(
      {
        kind: current.route.kind,
        slug: current.currentSlug.normalizedSlug,
      },
      current.route.market
    ).href,
  ] as const
  const equivalenceKey = current.route.equivalenceKey
  if (!equivalenceKey) {
    return Object.fromEntries([self])
  }
  try {
    const runtime = await getUrlRegistryRuntime()
    if (!runtime.enabled) {
      return Object.fromEntries([self])
    }
    const equivalents = await runtime.registry.findActiveEquivalents({
      equivalenceKey,
      kind: current.route.kind,
    })
    if (equivalents.kind !== "found") {
      return Object.fromEntries([self])
    }
    const allowedMarkets = new Set(
      getConfiguredMarketRoutingRuntime().allowedMarkets
    )
    const candidatesByMarket = new Map<Market, ActiveEntityRouteTarget>()
    const ambiguousMarkets = new Set<Market>()
    for (const candidate of equivalents.value) {
      if (
        candidate.projectionType !== "entity" ||
        candidate.route.market === current.route.market ||
        !allowedMarkets.has(candidate.route.market) ||
        !hasValidActiveProjection(
          candidate,
          candidate.route.market,
          current.route.kind
        ) ||
        candidate.route.equivalenceKey !== equivalenceKey ||
        candidate.route.indexPolicy !== "indexable"
      ) {
        continue
      }
      if (ambiguousMarkets.has(candidate.route.market)) {
        continue
      }
      const existing = candidatesByMarket.get(candidate.route.market)
      if (existing && existing.route.id !== candidate.route.id) {
        candidatesByMarket.delete(candidate.route.market)
        ambiguousMarkets.add(candidate.route.market)
        continue
      }
      candidatesByMarket.set(candidate.route.market, candidate)
    }

    const entries = await Promise.all(
      [...candidatesByMarket.values()].map(async (candidate) => {
        try {
          const source = await loadSource({
            market: candidate.route.market,
            sourceId: candidate.route.sourceId,
          })
          if (
            source.kind !== "found" ||
            !(isIndexable?.(source.value) ?? true)
          ) {
            return null
          }
          return [
            HREF_LANG[candidate.route.market],
            buildAbsoluteUrl(
              {
                kind: candidate.route.kind,
                slug: candidate.currentSlug.normalizedSlug,
              },
              candidate.route.market
            ).href,
          ] as const
        } catch {
          return null
        }
      })
    )
    return Object.fromEntries([
      ...entries.filter((entry) => entry !== null),
      self,
    ])
  } catch {
    return Object.fromEntries([self])
  }
}

const loadStaticAlternates = async <Value>(
  currentMarket: Market,
  path: Parameters<typeof buildPath>[0],
  loadSource: (market: Market) => Promise<PublicSourceResult<Value>>
): Promise<Readonly<Record<string, string>>> => {
  const { allowedMarkets } = getConfiguredMarketRoutingRuntime()
  const self = [
    HREF_LANG[currentMarket],
    buildAbsoluteUrl(path, currentMarket).href,
  ] as const
  const entries = await Promise.all(
    allowedMarkets
      .filter((market) => market !== currentMarket)
      .map(async (market) => {
        try {
          const source = await loadSource(market)
          if (source.kind !== "found") {
            return null
          }
          return [
            HREF_LANG[market],
            buildAbsoluteUrl(path, market).href,
          ] as const
        } catch {
          return null
        }
      })
  )
  return Object.fromEntries([
    self,
    ...entries.filter((entry) => entry !== null),
  ])
}

export const resolveEntityPublicPage = async <Value>(
  context: GetServerSidePropsContext,
  input: Readonly<{
    expectedRouteKey: string
    description?: (value: Value) => string | undefined
    kind: EntityUrlKind
    loadSource: (input: {
      market: Market
      sourceId: string
    }) => Promise<PublicSourceResult<Value>>
    isIndexable?: (value: Value) => boolean
    lastPage?: (value: Value) => number | undefined
    queryKind: QueryRouteKind
    title?: (value: Value) => string
  }>
): Promise<GetServerSidePropsResult<PublicPageProps<Value>>> => {
  const market = trustedMarket(context, input.expectedRouteKey)
  const slugParam = singleValue(context.params?.slug)
  if (!(market && slugParam)) {
    return notFoundResult(context)
  }
  const slug = slugParam.toLowerCase()
  try {
    validatePublishedSlug(slug)
  } catch {
    return notFoundResult(context)
  }

  const rawQuery = rawQueryFromRequest(context.req.url)
  const query = normalizeQuery({ rawQuery, routeKind: input.queryKind })
  if (query.kind === "not-found") {
    return notFoundResult(context)
  }

  try {
    const runtime = await getUrlRegistryRuntime()
    if (!runtime.enabled) {
      return errorResult(context, market, 503)
    }
    const resolution = await runtime.registry.resolve({
      kind: input.kind,
      market,
      normalizedSlug: slug,
    })
    if (resolution.kind === "missing") {
      return notFoundResult(context)
    }
    if (resolution.kind === "unavailable") {
      return errorResult(context, market, 503, resolution.retryAfterSeconds)
    }
    if (resolution.kind === "invalid-response") {
      return errorResult(context, market, 503)
    }
    if (resolution.value.disposition === "gone") {
      return errorResult(context, market, 410)
    }

    const sourceRoute =
      resolution.value.disposition === "superseded"
        ? resolution.value.successorRoute
        : resolution.value.route
    const source = await input.loadSource({
      market,
      sourceId: sourceRoute.sourceId,
    })
    if (source.kind === "missing") {
      return notFoundResult(context)
    }
    if (source.kind === "unavailable") {
      return errorResult(context, market, 503, source.retryAfterSeconds)
    }
    if (source.kind === "invalid-response") {
      return errorResult(context, market, 503)
    }

    const currentSlug = resolution.value.currentSlug.normalizedSlug
    const redirectQuery =
      query.kind === "redirect" ? query.redirectRawQuery : rawQuery
    if (
      resolution.value.disposition !== "current" ||
      slugParam !== currentSlug ||
      query.kind === "redirect" ||
      context.req.headers["x-sf-canonicalization-required"] === "1"
    ) {
      return redirectResult(
        context,
        currentAbsoluteUrl(market, input.kind, currentSlug, redirectQuery)
      )
    }

    const boundedQuery = input.lastPage
      ? normalizeQuery({
          lastPage: input.lastPage(source.value),
          rawQuery,
          routeKind: input.queryKind,
        })
      : query
    if (boundedQuery.kind === "not-found") {
      return notFoundResult(context)
    }

    const current: ActiveEntityRouteTarget = {
      projectionType: "entity",
      route: resolution.value.route,
      currentSlug: resolution.value.currentSlug,
    }
    const querySeo = classifySeo({
      canonicalRawQuery: boundedQuery.canonicalRawQuery,
      routeKind: input.queryKind,
      values: boundedQuery.values,
    })
    const isIndexable =
      querySeo.indexable && (input.isIndexable?.(source.value) ?? true)
    const alternates =
      isIndexable && querySeo.alternateEligible
        ? await loadEntityAlternates(
            current,
            input.loadSource,
            input.isIndexable
          )
        : {}
    const canonical = isIndexable
      ? urlWithQuery(
          buildAbsoluteUrl({ kind: input.kind, slug: currentSlug }, market)
            .href,
          querySeo.canonicalRawQuery ?? ""
        )
      : undefined
    setNoStore(context)
    return {
      props: {
        ...(await loadPublicShell(market)),
        page: { kind: "found", value: source.value },
        seo: {
          alternates,
          canonical,
          robots: isIndexable ? "index, follow" : "noindex, follow",
          ...(input.description
            ? { description: input.description(source.value) }
            : {}),
          ...(input.title ? { title: input.title(source.value) } : {}),
        },
      },
    }
  } catch {
    return errorResult(context, market, 503)
  }
}

export const resolveStaticPublicPage = async <Value>(
  context: GetServerSidePropsContext,
  input: Readonly<{
    expectedRouteKey: string
    loadSource: (market: Market) => Promise<PublicSourceResult<Value>>
    isIndexable?: (value: Value) => boolean
    lastPage?: (value: Value) => number | undefined
    path: Parameters<typeof buildPath>[0]
    queryKind: QueryRouteKind
    title?: (value: Value) => string
  }>
): Promise<GetServerSidePropsResult<PublicPageProps<Value>>> => {
  const market = trustedMarket(context, input.expectedRouteKey)
  if (!market) {
    return notFoundResult(context)
  }
  const rawQuery = rawQueryFromRequest(context.req.url)
  const query = normalizeQuery({ rawQuery, routeKind: input.queryKind })
  if (query.kind === "not-found") {
    return notFoundResult(context)
  }
  const canonicalPath = buildPath(input.path, market)
  if (
    query.kind === "redirect" ||
    context.req.headers["x-sf-canonicalization-required"] === "1"
  ) {
    return redirectResult(
      context,
      urlWithQuery(
        new URL(canonicalPath, configuredCanonicalOrigin(market)).href,
        query.kind === "redirect" ? query.redirectRawQuery : rawQuery
      )
    )
  }
  try {
    const source = await input.loadSource(market)
    if (source.kind === "missing") {
      return notFoundResult(context)
    }
    if (source.kind === "unavailable") {
      return errorResult(context, market, 503, source.retryAfterSeconds)
    }
    if (source.kind === "invalid-response") {
      return errorResult(context, market, 503)
    }
    const boundedQuery = input.lastPage
      ? normalizeQuery({
          lastPage: input.lastPage(source.value),
          rawQuery,
          routeKind: input.queryKind,
        })
      : query
    if (boundedQuery.kind === "not-found") {
      return notFoundResult(context)
    }
    const querySeo = classifySeo({
      canonicalRawQuery: boundedQuery.canonicalRawQuery,
      routeKind: input.queryKind,
      values: boundedQuery.values,
    })
    const isIndexable =
      querySeo.indexable && (input.isIndexable?.(source.value) ?? true)
    const canonical = isIndexable
      ? urlWithQuery(
          new URL(canonicalPath, configuredCanonicalOrigin(market)).href,
          querySeo.canonicalRawQuery ?? ""
        )
      : undefined
    const alternates =
      isIndexable && querySeo.alternateEligible
        ? await loadStaticAlternates(market, input.path, input.loadSource)
        : {}
    setNoStore(context)
    return {
      props: {
        ...(await loadPublicShell(market)),
        page: { kind: "found", value: source.value },
        seo: {
          alternates,
          canonical,
          robots: isIndexable ? "index, follow" : "noindex, follow",
          ...(input.title ? { title: input.title(source.value) } : {}),
        },
      },
    }
  } catch {
    return errorResult(context, market, 503)
  }
}

export const resolveFlowPublicPage = async <Value>(
  context: GetServerSidePropsContext,
  input: Readonly<{
    expectedRouteKey: string
    loadSource: (market: Market) => Promise<PublicSourceResult<Value>>
    query?: Readonly<{
      kind: QueryRouteKind
      path: Parameters<typeof buildPath>[0]
    }>
  }>
): Promise<GetServerSidePropsResult<PublicPageProps<Value>>> => {
  const market = trustedMarket(context, input.expectedRouteKey)
  if (!market) {
    return notFoundResult(context)
  }
  const rawQuery = rawQueryFromRequest(context.req.url)
  const normalized = normalizeQuery({
    rawQuery,
    routeKind: input.query?.kind ?? "homepage",
  })
  if (normalized.kind === "not-found") {
    return notFoundResult(context)
  }
  if (
    normalized.kind === "redirect" ||
    context.req.headers["x-sf-canonicalization-required"] === "1"
  ) {
    const publicPath = context.req.headers["x-sf-public-path"]
    const canonical =
      input.query?.path !== undefined
        ? buildAbsoluteUrl(input.query.path, market).href
        : new URL(
            typeof publicPath === "string" ? publicPath : "/",
            configuredCanonicalOrigin(market)
          ).href
    return redirectResult(
      context,
      urlWithQuery(
        canonical,
        normalized.kind === "redirect" ? normalized.redirectRawQuery : rawQuery
      )
    )
  }
  try {
    const source = await input.loadSource(market)
    if (source.kind === "missing") {
      return notFoundResult(context)
    }
    if (source.kind === "unavailable") {
      return errorResult(context, market, 503, source.retryAfterSeconds)
    }
    if (source.kind === "invalid-response") {
      return errorResult(context, market, 503)
    }
    setNoStore(context)
    return {
      props: {
        ...(await loadPublicShell(market)),
        page: { kind: "found", value: source.value },
        seo: { robots: "noindex, follow" },
      },
    }
  } catch {
    return errorResult(context, market, 503)
  }
}

export const foundSource = <Value>(
  value: Value
): PublicSourceResult<Value> => ({
  kind: "found",
  value,
})

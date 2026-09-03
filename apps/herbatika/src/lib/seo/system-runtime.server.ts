import { resolveHomepageHeroSource } from "@/components/homepage/homepage.hero.data"
import {
  type MarketRuntimeBinding,
  resolveMarketRuntimeByHost,
} from "@/lib/market/market-runtime"
import { getConfiguredMarketRuntime } from "@/lib/market/market-runtime.server"
import { validateCampaignPublicationCandidates } from "@/lib/storefront/campaign-publication-source.server"
import {
  fetchCachedLatestCmsBlogPosts,
  fetchCmsHeroBanners,
  readCmsArticleById,
  readCmsPageById,
  readCmsStaticPage,
} from "@/lib/storefront/cms"
import { hydrateCmsHeroBannerTargets } from "@/lib/storefront/cms-hero-targets.server"
import { hasCompleteHomepageSectionSources } from "@/lib/storefront/homepage-catalog-config"
import { readReviewedHomepageHeroBanners } from "@/lib/storefront/homepage-hero-source-manifest.server"
import {
  getHerbatikaMarketContext,
  type HerbatikaLocale,
} from "@/lib/storefront/market-context"
import { getMarketStorefrontSdk } from "@/lib/storefront/market-sdk.server"
import { PRODUCT_DETAIL_FIELDS } from "@/lib/storefront/product-query-config"
import { isRoDemoStaticPage } from "@/lib/storefront/ro-demo-static-pages"
import { prefetchHomePageStorefrontData } from "@/lib/storefront/ssr"
import {
  readAvailablePublicEntitySlugs,
  readCompletePublicEntitySlugs,
} from "@/lib/storefront/ssr/public-entity-projections"
import { assertReviewedStaticRouteSource } from "@/lib/url/segment-registry-publication/reviewed-source.server"
import { loadStaticRoutePublicationDecision } from "@/lib/url/segment-registry-publication.server"
import { STATIC_ROOT_PAGE_KEYS } from "@/lib/url/segments"
import type { Market, StaticRootPageKey } from "@/lib/url/types"
import { readCurrentEntitySourceVersions } from "@/lib/url-registry/current-entity-source-versions"
import { getUrlRegistryRuntime } from "@/lib/url-registry/runtime/instance.server"
import {
  countPublicIndexableEntityProjections,
  listPublicEntityProjections,
  listPublicIndexableEntityProjectionPage,
} from "@/lib/url-registry/runtime/public-projections.server"
import type { ProductFeedDependencies } from "./product-feed"
import type {
  SitemapDataDependencies,
  SitemapEntitySourceCandidate,
  SitemapSourceValidation,
  SitemapStaticSourceCandidate,
} from "./sitemap-contract"
import {
  validateCatalogSitemapSources,
  validateCmsEntitySitemapSources,
  validateProductSitemapSources,
} from "./sitemap-source-validation"
import { resolveSystemHost, type SystemHostResolution } from "./system-response"

const SITEMAP_SOURCE_TIMEOUT_MS = 5000
const STATIC_ROOT_PAGE_KEY_SET = new Set<string>(STATIC_ROOT_PAGE_KEYS)

const isStaticRootPageKey = (value: string): value is StaticRootPageKey =>
  STATIC_ROOT_PAGE_KEY_SET.has(value)

const resolveStaticRootPageKey = (value: string): StaticRootPageKey | null => {
  if (isStaticRootPageKey(value)) {
    return value
  }
  if (!value.startsWith("root:")) {
    return null
  }
  const pageKey = value.slice("root:".length)
  return isStaticRootPageKey(pageKey) ? pageKey : null
}

const staticSourceUpdatedAt = (value: unknown): string | undefined =>
  value &&
  typeof value === "object" &&
  "publishedDate" in value &&
  typeof value.publishedDate === "string"
    ? value.publishedDate
    : undefined

const readReviewedStaticSitemapSource = async (
  market: Market,
  locale: HerbatikaLocale,
  source: SitemapStaticSourceCandidate
): Promise<SitemapSourceValidation | null> => {
  const pageKey = resolveStaticRootPageKey(source.staticRouteKey)
  if (!pageKey) {
    return null
  }
  const publication = await loadStaticRoutePublicationDecision({
    market,
    routeKey: pageKey,
  })
  if (publication.kind !== "approved") {
    return null
  }

  // Every static root page (including "about" and "faq") is now served from
  // Payload CMS by the live route (see [pageKey].tsx / readCmsStaticPage).
  // The sitemap must validate that exact same CMS-backed source so it can
  // never advertise a route whose live render would 503/noindex.
  const result = await readCmsStaticPage(pageKey, locale)
  if (result.kind !== "found" || isRoDemoStaticPage(result.value)) {
    return null
  }
  const value = result.value
  await assertReviewedStaticRouteSource({
    market,
    pageKey,
    publication,
    renderedSource: value,
  })
  return {
    routeId: source.routeId,
    updatedAt: staticSourceUpdatedAt(value),
  }
}

const validateReviewedStaticSitemapSources: SitemapDataDependencies["validateStaticSources"] =
  async ({ market, sources }) => {
    if (
      new Set(sources.map((source) => source.routeId)).size !== sources.length
    ) {
      return {
        causeCode: "INVALID_STATIC_SITEMAP_SOURCE_CANDIDATES",
        kind: "invalid-response",
      }
    }
    const { binding } = getMarketStorefrontSdk(market)
    try {
      const results = await Promise.all(
        sources.map((source) =>
          readReviewedStaticSitemapSource(market, binding.locale, source)
        )
      )
      return {
        kind: "found",
        value: results.filter((result) => result !== null),
      }
    } catch {
      return {
        causeCode: "STATIC_CONTENT_REVIEW_BINDING_FAILED",
        kind: "invalid-response",
      }
    }
  }

const readSitemapEntitySourceVersions: SitemapDataDependencies["readEntitySourceVersions"] =
  async (projections) => {
    if (projections.length === 0) {
      return { kind: "found", value: [] }
    }
    try {
      const runtime = await getUrlRegistryRuntime()
      return runtime.enabled
        ? readCurrentEntitySourceVersions(projections, runtime.registry)
        : { kind: "unavailable" }
    } catch {
      return { kind: "unavailable" }
    }
  }

type ProductSitemapSourceCandidate = Omit<
  SitemapEntitySourceCandidate,
  "sourceVersion"
>

const validateMedusaProductSitemapSources = (input: {
  market: Market
  sources: readonly ProductSitemapSourceCandidate[]
}) => {
  const { binding, sdk } = getMarketStorefrontSdk(input.market)
  return validateProductSitemapSources(
    { binding, sources: input.sources },
    {
      readProducts: ({ market: sourceMarket, sources: batch }) =>
        sdk.client.fetch("/store/url-registry/products/sources", {
          body: {
            candidates: batch.map((source) => ({
              entityId: source.sourceId,
              publicSlug: source.publicSlug,
            })),
            market: sourceMarket,
            schemaVersion: 1,
          },
          method: "POST",
          signal: AbortSignal.timeout(SITEMAP_SOURCE_TIMEOUT_MS),
        }),
    }
  )
}

export const resolveSystemHostFromRequest = (
  request: Request
): SystemHostResolution =>
  resolveSystemHost(request, {
    getRuntime: getConfiguredMarketRuntime,
    resolveMarket: resolveMarketRuntimeByHost,
  })

export const systemSitemapDependencies: SitemapDataDependencies = {
  countEntities: countPublicIndexableEntityProjections,
  findEntityEquivalents: async (input) => {
    const runtime = await getUrlRegistryRuntime()
    if (!runtime.enabled) {
      return { kind: "unavailable" }
    }
    const result = await runtime.registry.findActiveEquivalents(input)
    if (result.kind !== "found") {
      return result
    }
    const allowedMarkets = new Set(getConfiguredMarketRuntime().allowedMarkets)
    return {
      kind: "found",
      value: result.value.filter((target) =>
        allowedMarkets.has(target.route.market)
      ),
    }
  },
  listEntities: listPublicIndexableEntityProjectionPage,
  listMarkets: () => getConfiguredMarketRuntime().allowedMarkets,
  readEntitySourceVersions: readSitemapEntitySourceVersions,
  listStatic: async (market) => {
    const runtime = await getUrlRegistryRuntime()
    return runtime.enabled
      ? runtime.registry.listStaticRouteSnapshots(market)
      : { kind: "unavailable" }
  },
  validateHomepageSource: async (market) => {
    try {
      const locale = getHerbatikaMarketContext(market).locale
      const [storefront, cmsBanners, blogPosts] = await Promise.all([
        prefetchHomePageStorefrontData({ market }),
        fetchCmsHeroBanners(locale),
        fetchCachedLatestCmsBlogPosts(3, [], locale),
      ])
      if (!storefront.region) {
        return {
          causeCode: "MISSING_REGION",
          kind: "invalid-response",
        }
      }
      if (
        !hasCompleteHomepageSectionSources(
          storefront.homepageSectionCategorySourceIds
        )
      ) {
        return {
          causeCode: "INCOMPLETE_HOMEPAGE_SECTION_CATEGORY_SOURCE",
          kind: "invalid-response",
        }
      }
      const source = resolveHomepageHeroSource(cmsBanners, market, () =>
        readReviewedHomepageHeroBanners(locale)
      )
      if (!source.publicationApproved) {
        return { kind: "unavailable" }
      }
      const [articleSlugs, categorySlugs, hydrated, productSlugs] =
        await Promise.all([
          readAvailablePublicEntitySlugs({
            kind: "article",
            market,
            requiredSourceIds: blogPosts.map((post) => post.sourceId),
          }),
          readCompletePublicEntitySlugs({
            kind: "category",
            market,
            requiredSourceIds: storefront.categorySourceIds,
          }),
          hydrateCmsHeroBannerTargets(source.value, market),
          readAvailablePublicEntitySlugs({
            kind: "product",
            market,
            requiredSourceIds: storefront.visibleProductIds,
          }),
        ])
      if (articleSlugs.kind !== "found") {
        return articleSlugs
      }
      if (categorySlugs.kind !== "found") {
        return categorySlugs
      }
      if (hydrated.kind !== "found") {
        return hydrated
      }
      return productSlugs.kind === "found"
        ? ({ kind: "found", value: true } as const)
        : productSlugs
    } catch {
      return {
        causeCode: "INVALID_HOMEPAGE_HERO_SOURCE",
        kind: "invalid-response",
      }
    }
  },
  validateEntitySources: ({ kind, market, sources }) => {
    const { binding, sdk } = getMarketStorefrontSdk(market)
    if (kind === "campaign") {
      return Promise.resolve(
        validateCampaignPublicationCandidates({ market, sources })
      )
    }
    if (kind === "product") {
      return validateMedusaProductSitemapSources({ market, sources })
    }
    if (kind === "article" || kind === "page") {
      return validateCmsEntitySitemapSources(
        { kind, locale: binding.locale, sources },
        {
          readArticle: readCmsArticleById,
          readPage: readCmsPageById,
          readStaticPage: readCmsStaticPage,
        }
      )
    }
    return validateCatalogSitemapSources(
      { binding, kind, sources },
      {
        readAssignments: ({ kind: catalogKind, sources: candidates }) =>
          sdk.client.fetch("/store/url-registry/catalog/sources", {
            body: {
              candidates: candidates.map((source) => ({
                entityId: source.sourceId,
                publicSlug: source.publicSlug,
                sourceVersion: source.sourceVersion,
              })),
              entityKind: catalogKind,
              market,
              schemaVersion: 1,
            },
            method: "POST",
            signal: AbortSignal.timeout(SITEMAP_SOURCE_TIMEOUT_MS),
          }),
      }
    )
  },
  validateStaticSources: validateReviewedStaticSitemapSources,
}

export const systemProductFeedDependencies: ProductFeedDependencies = {
  listProducts: listPublicEntityProjections,
  readProducts: ({ market, sources }) => {
    const { binding, sdk } = getMarketStorefrontSdk(market)
    return sdk.client.fetch("/store/products", {
      query: {
        country_code: binding.countryCode.toLowerCase(),
        fields: PRODUCT_DETAIL_FIELDS,
        id: sources.map((source) => source.productId),
        limit: sources.length,
        locale: binding.locale,
        region_id: binding.regionId,
      },
      signal: AbortSignal.timeout(SITEMAP_SOURCE_TIMEOUT_MS),
    })
  },
  validateProducts: validateMedusaProductSitemapSources,
}

export const checkUrlRegistryHealth = async (
  binding: MarketRuntimeBinding
): Promise<boolean> => {
  try {
    const runtime = await getUrlRegistryRuntime()
    if (!runtime.enabled) {
      return false
    }
    const result = await runtime.registry.listActiveEntityRoutes({
      kind: "product",
      limit: 1,
      market: binding.market,
    })
    return result.kind === "found"
  } catch {
    return false
  }
}

import { resolveHomepageHeroSource } from "@/components/homepage/homepage.hero.data"
import {
  type MarketRuntimeBinding,
  resolveMarketRuntimeByHost,
} from "@/lib/market/market-runtime"
import { getConfiguredMarketRuntime } from "@/lib/market/market-runtime.server"
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
import { getHerbatikaMarketContext } from "@/lib/storefront/market-context"
import { getMarketStorefrontSdk } from "@/lib/storefront/market-sdk.server"
import { PRODUCT_DETAIL_FIELDS } from "@/lib/storefront/product-query-config"
import { prefetchHomePageStorefrontData } from "@/lib/storefront/ssr"
import {
  readAvailablePublicEntitySlugs,
  readCompletePublicEntitySlugs,
} from "@/lib/storefront/ssr/public-entity-projections"
import { loadStaticRoutePublicationDecision } from "@/lib/url/segment-registry-publication.server"
import { getUrlRegistryRuntime } from "@/lib/url-registry/runtime/instance.server"
import {
  countPublicIndexableEntityProjections,
  listPublicEntityProjections,
  listPublicIndexableEntityProjectionPage,
} from "@/lib/url-registry/runtime/public-projections.server"
import type { ProductFeedDependencies } from "./product-feed"
import type { SitemapDataDependencies } from "./sitemap-contract"
import {
  validateCatalogSitemapSources,
  validateCmsEntitySitemapSources,
  validateCmsStaticSitemapSources,
  validateProductSitemapSources,
} from "./sitemap-source-validation"
import { resolveSystemHost, type SystemHostResolution } from "./system-response"

const SITEMAP_SOURCE_TIMEOUT_MS = 5000
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
      if (source.kind !== "found") {
        return source
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
    if (kind === "product") {
      return validateProductSitemapSources(
        { binding, sources },
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
  validateStaticSources: async ({ market, sources }) => {
    const { binding } = getMarketStorefrontSdk(market)
    const decisions = await Promise.all(
      sources.map((source) =>
        loadStaticRoutePublicationDecision({
          market,
          routeKey: source.staticRouteKey,
        })
      )
    )
    const approvedSources = sources.filter(
      (_source, index) => decisions[index]?.kind === "approved"
    )
    return validateCmsStaticSitemapSources(
      { locale: binding.locale, sources: approvedSources },
      { readStaticPage: readCmsStaticPage }
    )
  },
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
  validateProducts: (input) =>
    systemSitemapDependencies.validateEntitySources(input),
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

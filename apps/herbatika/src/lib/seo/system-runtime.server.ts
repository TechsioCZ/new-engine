import {
  type MarketRuntimeBinding,
  resolveMarketRuntimeByHost,
} from "@/lib/market/market-runtime"
import { getConfiguredMarketRuntime } from "@/lib/market/market-runtime.server"
import {
  readCmsArticleById,
  readCmsPageById,
  readCmsStaticPage,
} from "@/lib/storefront/cms"
import { getMarketStorefrontSdk } from "@/lib/storefront/market-sdk.server"
import { PRODUCT_DETAIL_FIELDS } from "@/lib/storefront/product-query-config"
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
  listEntities: listPublicIndexableEntityProjectionPage,
  listStatic: async (market) => {
    const runtime = await getUrlRegistryRuntime()
    return runtime.enabled
      ? runtime.registry.listStaticRouteSnapshots(market)
      : { kind: "unavailable" }
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
  validateStaticSources: ({ market, sources }) => {
    const { binding } = getMarketStorefrontSdk(market)
    return validateCmsStaticSitemapSources(
      { locale: binding.locale, sources },
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

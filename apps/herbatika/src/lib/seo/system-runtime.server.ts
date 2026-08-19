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
import { readProductRouteSourceFromMedusa } from "@/lib/storefront/product-route-source.server"
import { getUrlRegistryRuntime } from "@/lib/url-registry/runtime/instance.server"
import { listPublicEntityProjections } from "@/lib/url-registry/runtime/public-projections.server"
import type { ProductFeedDependencies } from "./product-feed"
import type { SitemapDataDependencies } from "./sitemap-contract"
import {
  type CatalogSitemapKind,
  validateCatalogSitemapSources,
  validateCmsEntitySitemapSources,
  validateCmsStaticSitemapSources,
  validateProductSitemapSources,
} from "./sitemap-source-validation"
import { resolveSystemHost, type SystemHostResolution } from "./system-response"

const SITEMAP_SOURCE_TIMEOUT_MS = 5000
const ASSIGNMENT_PATH_BY_KIND: Readonly<Record<CatalogSitemapKind, string>> = {
  brand: "/store/url-registry/brands/assignments",
  category: "/store/url-registry/categories/assignments",
  collection: "/store/url-registry/collections/assignments",
}

export const resolveSystemHostFromRequest = (
  request: Request
): SystemHostResolution =>
  resolveSystemHost(request, {
    getRuntime: getConfiguredMarketRuntime,
    resolveMarket: resolveMarketRuntimeByHost,
  })

export const systemSitemapDependencies: SitemapDataDependencies = {
  listEntities: listPublicEntityProjections,
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
        { market, sources },
        {
          readProduct: async ({
            market: sourceMarket,
            productId,
            publicSlug,
          }) => {
            const result = await readProductRouteSourceFromMedusa({
              market: sourceMarket,
              productId,
              publicSlug,
            })
            return result.kind === "found"
              ? {
                  kind: "found",
                  value: { updatedAt: result.value.updated_at },
                }
              : result
          },
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
        listAssignments: ({ kind: catalogKind, limit, offset }) =>
          sdk.client.fetch(ASSIGNMENT_PATH_BY_KIND[catalogKind], {
            query: { limit, offset },
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
  readProduct: readProductRouteSourceFromMedusa,
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

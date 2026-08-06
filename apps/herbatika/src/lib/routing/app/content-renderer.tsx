import type { HttpTypes } from "@medusajs/types"
import { HydrationBoundary } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { BlogDetailPage } from "@/components/blog/blog-detail-page"
import { BlogListingPage } from "@/components/blog/blog-listing-page"
import { BrandIndexPage } from "@/components/brands/brand-index-page"
import { BrandListing } from "@/components/brands/brand-listing"
import { CategoryListing } from "@/components/category-listing"
import { CmsPageSurface } from "@/components/cms/cms-page-surface"
import { HerbatikaHomepage } from "@/components/herbatika-homepage"
import { ProductDetail } from "@/components/product-detail"
import { upstreamError } from "@/lib/routing/app/errors"
import type { ResolvedStorefrontRoute } from "@/lib/routing/app/resolver"
import {
  type BlogPost,
  type BlogTopicKey,
  resolveBlogListing,
  resolveRelatedBlogPosts,
} from "@/lib/storefront/blog-content"
import { fetchStorefrontBrands } from "@/lib/storefront/brands.server"
import {
  buildCategoryListParams,
  CATEGORY_TREE_FIELDS,
  CATEGORY_TREE_LIMIT,
} from "@/lib/storefront/category-query-config"
import {
  fetchCmsBlogPostById,
  fetchCmsBlogPosts,
  fetchCmsHeroBanners,
  fetchCmsHomepagePromo,
  fetchCmsPageById,
} from "@/lib/storefront/cms"
import {
  getAppRequestServerContext,
  getMarketServerContext,
} from "@/lib/storefront/market-context.app"
import { parsePlpQueryStateFromSearchParams } from "@/lib/storefront/plp-query-state"
import { PRODUCT_DETAIL_FIELDS } from "@/lib/storefront/product-query-config"
import {
  prefetchBrandPageStorefrontData,
  prefetchCategoryPageStorefrontData,
  prefetchHomePageStorefrontData,
  prefetchProductDetailPageStorefrontData,
} from "@/lib/storefront/ssr"
import { getRegionServerContext } from "@/lib/storefront/ssr/context"
import {
  fetchServerCategories,
  fetchServerProducts,
} from "@/lib/storefront/storefront-server"
import { getSegmentLabel, ROUTABLE_SEGMENT_KEYS } from "@/lib/url/segments"
import type { Market } from "@/lib/url/types"

type SearchParams = Record<string, string | string[] | undefined>

type RenderContentRouteInput = {
  market: Market
  route: ResolvedStorefrontRoute
  searchParams: SearchParams
}

const firstSearchParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value

const parseBlogTopic = (value: string | undefined): BlogTopicKey =>
  value === "fitness" || value === "krasa" || value === "zdravie"
    ? value
    : "all"

const parsePositivePage = (value: string | undefined) => {
  const page = Number.parseInt(value ?? "1", 10)
  return Number.isFinite(page) && page > 0 ? page : 1
}

async function renderHome() {
  const [requestContext, marketContext] = await Promise.all([
    getAppRequestServerContext(),
    getMarketServerContext(),
  ])
  const [{ dehydratedState }, heroBanners, homepagePromo] = await Promise.all([
    prefetchHomePageStorefrontData(requestContext),
    fetchCmsHeroBanners(marketContext.locale),
    fetchCmsHomepagePromo(marketContext.locale),
  ])

  return (
    <HydrationBoundary state={dehydratedState}>
      <HerbatikaHomepage
        heroBanners={heroBanners}
        homepagePromo={homepagePromo}
      />
    </HydrationBoundary>
  )
}

async function renderIndex(
  market: Market,
  kind: Extract<ResolvedStorefrontRoute, { type: "index" }>["kind"],
  searchParams: SearchParams
): Promise<ReactNode | null> {
  if (kind === "brand") {
    return (
      <BrandIndexPage brands={await fetchStorefrontBrands()} market={market} />
    )
  }

  if (kind === "article") {
    const marketContext = await getMarketServerContext()
    const posts = await fetchCmsBlogPosts(marketContext.locale)
    const listing = resolveBlogListing({
      page: parsePositivePage(firstSearchParam(searchParams.strana)),
      posts: posts.length ? posts : undefined,
      topic: parseBlogTopic(firstSearchParam(searchParams.tema)),
    })
    return <BlogListingPage listing={listing} />
  }

  return (
    <main className="mx-auto min-h-[50dvh] w-full max-w-max-w p-500">
      <h1 className="font-bold text-4xl text-fg-primary">
        {getSegmentLabel(market, ROUTABLE_SEGMENT_KEYS[kind])}
      </h1>
    </main>
  )
}

async function renderProductEntity(entityId: string) {
  const requestContext = await getAppRequestServerContext()
  const { queryClient, region } = await getRegionServerContext(requestContext)
  if (!region) {
    throw new Error("Product rendering requires an active storefront region")
  }

  const response = await fetchServerProducts(
    queryClient,
    {
      id: [entityId],
      limit: 1,
      fields: PRODUCT_DETAIL_FIELDS,
      region_id: region.region_id,
      country_code: region.country_code,
    },
    requestContext
  )
  const product = response.products.find(
    (candidate: HttpTypes.StoreProduct) => candidate.id === entityId
  )
  if (!product?.handle) {
    return null
  }

  const { dehydratedState } = await prefetchProductDetailPageStorefrontData(
    requestContext,
    product.handle
  )
  return (
    <HydrationBoundary state={dehydratedState}>
      <ProductDetail handle={product.handle} />
    </HydrationBoundary>
  )
}

async function renderCategoryEntity(entityId: string) {
  const requestContext = await getAppRequestServerContext()
  const { queryClient } = await getRegionServerContext(requestContext)
  const response = await fetchServerCategories(
    queryClient,
    buildCategoryListParams({
      page: 1,
      limit: CATEGORY_TREE_LIMIT,
      fields: CATEGORY_TREE_FIELDS,
    })
  )
  const category = response.categories.find(
    (candidate: HttpTypes.StoreProductCategory) => candidate.id === entityId
  )
  if (!category?.handle) {
    return null
  }

  return { category, requestContext }
}

async function renderBrandEntity(
  entityId: string,
  searchParams: SearchParams
): Promise<ReactNode | null> {
  const brand = (await fetchStorefrontBrands()).find(
    (candidate) => candidate.id === entityId
  )
  if (!brand) {
    return null
  }
  const { dehydratedState } = await prefetchBrandPageStorefrontData(
    await getAppRequestServerContext(),
    brand.facetId,
    parsePlpQueryStateFromSearchParams(searchParams)
  )
  return (
    <HydrationBoundary state={dehydratedState}>
      <BrandListing brandFacetId={brand.facetId} brandTitle={brand.title} />
    </HydrationBoundary>
  )
}

async function renderCmsEntity(
  route: Extract<ResolvedStorefrontRoute, { type: "entity" }>,
  entityId: string
): Promise<ReactNode | null> {
  const marketContext = await getMarketServerContext()
  if (route.kind === "article") {
    const post = await fetchCmsBlogPostById(entityId, marketContext.locale)
    if (!post) {
      return null
    }
    const posts = await fetchCmsBlogPosts(marketContext.locale)
    const relatedPosts = resolveRelatedBlogPosts(
      post.slug,
      4,
      posts.length > 1 ? posts : undefined
    )
    return (
      <BlogDetailPage
        post={post as BlogPost}
        recommendedProducts={[]}
        relatedPosts={relatedPosts}
        sidebarFeaturedProduct={null}
      />
    )
  }
  if (route.kind === "page") {
    const page = await fetchCmsPageById(entityId, marketContext.locale)
    return page ? <CmsPageSurface page={page} /> : null
  }
  throw upstreamError(
    "medusa",
    "configuration",
    `No storefront loader is configured for ${route.kind}`
  )
}

async function renderEntity(
  route: Extract<ResolvedStorefrontRoute, { type: "entity" }>,
  searchParams: SearchParams
): Promise<ReactNode | null> {
  if (route.resolution.type !== "current") {
    return null
  }
  const entityId = route.resolution.record.entityId
  if (route.kind === "product") {
    return renderProductEntity(entityId)
  }
  if (route.kind === "category") {
    const source = await renderCategoryEntity(entityId)
    if (!source) {
      return null
    }
    const { dehydratedState } = await prefetchCategoryPageStorefrontData(
      source.requestContext,
      source.category.handle,
      parsePlpQueryStateFromSearchParams(searchParams)
    )
    return (
      <HydrationBoundary state={dehydratedState}>
        <CategoryListing slug={source.category.handle} />
      </HydrationBoundary>
    )
  }
  if (route.kind === "brand") {
    return renderBrandEntity(entityId, searchParams)
  }
  return renderCmsEntity(route, entityId)
}

export async function renderContentRoute({
  market,
  route,
  searchParams,
}: RenderContentRouteInput): Promise<ReactNode | null> {
  if (route.type === "home") {
    return await renderHome()
  }
  if (route.type === "index") {
    return await renderIndex(market, route.kind, searchParams)
  }
  if (route.type === "entity") {
    return await renderEntity(route, searchParams)
  }

  return null
}

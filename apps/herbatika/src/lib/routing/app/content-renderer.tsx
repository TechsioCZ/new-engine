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
import {
  type RegistryIndexItem,
  RegistryIndexPage,
} from "@/components/registry-index-page"
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
  fetchServerCollections,
  fetchServerProducts,
} from "@/lib/storefront/storefront-server"
import { buildUrl } from "@/lib/url/builder"
import { getSegmentLabel, ROUTABLE_SEGMENT_KEYS } from "@/lib/url/segments"
import type { Market, UrlKind, UrlRecord } from "@/lib/url/types"
import { getUrlRegistry } from "@/lib/url-registry/factory"

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

const REGISTRY_PAGE_SIZE = 100
const REGISTRY_INDEX_LIMIT = 100

async function listCurrentRecords(
  market: Market,
  kind: UrlKind
): Promise<UrlRecord[]> {
  const registry = await getUrlRegistry()
  const records: UrlRecord[] = []
  for (
    let offset = 0;
    offset < REGISTRY_INDEX_LIMIT;
    offset += REGISTRY_PAGE_SIZE
  ) {
    const page = await registry.list({
      market,
      kind,
      status: "current",
      limit: REGISTRY_PAGE_SIZE,
      offset,
    })
    records.push(
      ...page.records.filter(
        (record) =>
          record.market === market &&
          record.kind === kind &&
          record.status === "current"
      )
    )
    if (!page.hasMore) {
      return records
    }
  }
  return records
}

const registryItem = (record: UrlRecord, title: string): RegistryIndexItem => ({
  href: buildUrl(record),
  id: record.id,
  title,
})

async function renderRegistryIndex(
  market: Market,
  kind: "product" | "category" | "collection" | "page"
): Promise<ReactNode> {
  const records = await listCurrentRecords(market, kind)
  const title = getSegmentLabel(market, ROUTABLE_SEGMENT_KEYS[kind])
  if (!records.length) {
    return <RegistryIndexPage emptyLabel={title} items={[]} title={title} />
  }

  const requestContext = await getAppRequestServerContext()
  const { queryClient, region } = await getRegionServerContext(requestContext)
  let items: RegistryIndexItem[]

  if (kind === "product") {
    if (!region) {
      throw new Error("Product index requires an active storefront region")
    }
    const response = await fetchServerProducts(
      queryClient,
      {
        id: records.map((record) => record.entityId),
        fields: "id,title",
        limit: records.length,
        region_id: region.region_id,
        country_code: region.country_code,
      },
      requestContext
    )
    const titles = new Map(
      response.products.map((product) => [product.id, product.title])
    )
    items = records.flatMap((record) => {
      const sourceTitle = titles.get(record.entityId)
      return sourceTitle ? [registryItem(record, sourceTitle)] : []
    })
  } else if (kind === "category") {
    const response = await fetchServerCategories(queryClient, {
      id: records.map((record) => record.entityId),
      fields: "id,name",
      limit: records.length,
    })
    const titles = new Map(
      response.categories.map((category) => [category.id, category.name])
    )
    items = records.flatMap((record) => {
      const sourceTitle = titles.get(record.entityId)
      return sourceTitle ? [registryItem(record, sourceTitle)] : []
    })
  } else if (kind === "collection") {
    const response = await fetchServerCollections(queryClient, {
      id: records.map((record) => record.entityId),
      fields: "id,title",
      limit: records.length,
    })
    const titles = new Map(
      response.collections.map((collection) => [
        collection.id,
        collection.title,
      ])
    )
    items = records.flatMap((record) => {
      const sourceTitle = titles.get(record.entityId)
      return sourceTitle ? [registryItem(record, sourceTitle)] : []
    })
  } else {
    items = records.map((record) => registryItem(record, record.slug))
  }

  return <RegistryIndexPage emptyLabel={title} items={items} title={title} />
}

async function renderIndex(
  market: Market,
  kind: Extract<ResolvedStorefrontRoute, { type: "index" }>["kind"],
  searchParams: SearchParams
): Promise<ReactNode | null> {
  if (kind === "brand") {
    const [brands, records] = await Promise.all([
      fetchStorefrontBrands(),
      listCurrentRecords(market, "brand"),
    ])
    const recordsByEntity = new Map(
      records.map((record) => [record.entityId, record])
    )
    const currentBrands = brands.flatMap((brand) => {
      const record = recordsByEntity.get(brand.id)
      return record ? [{ ...brand, slug: record.slug }] : []
    })
    return <BrandIndexPage brands={currentBrands} market={market} />
  }

  if (kind === "article") {
    const marketContext = await getMarketServerContext()
    const [posts, records] = await Promise.all([
      fetchCmsBlogPosts(marketContext.locale),
      listCurrentRecords(market, "article"),
    ])
    const slugsByEntity = new Map(
      records.map((record) => [record.entityId, record.slug])
    )
    const currentPosts = posts.flatMap((post) => {
      const slug = slugsByEntity.get(post.id)
      return slug ? [{ ...post, slug }] : []
    })
    const listing = resolveBlogListing({
      page: parsePositivePage(firstSearchParam(searchParams.strana)),
      posts: currentPosts,
      topic: parseBlogTopic(firstSearchParam(searchParams.tema)),
    })
    return <BlogListingPage listing={listing} />
  }

  if (kind === "campaign") {
    return null
  }

  return renderRegistryIndex(market, kind)
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
  const { availableProductCount, dehydratedState, region } =
    await prefetchBrandPageStorefrontData(
      await getAppRequestServerContext(),
      brand.facetId,
      parsePlpQueryStateFromSearchParams(searchParams)
    )
  if (!region) {
    throw new Error("Brand rendering requires an active storefront region")
  }
  if (availableProductCount === 0) {
    return null
  }
  return (
    <HydrationBoundary state={dehydratedState}>
      <BrandListing brandFacetId={brand.facetId} brandTitle={brand.title} />
    </HydrationBoundary>
  )
}

async function renderCollectionEntity(
  market: Market,
  entityId: string
): Promise<ReactNode | null> {
  const requestContext = await getAppRequestServerContext()
  const { queryClient, region } = await getRegionServerContext(requestContext)
  if (!region) {
    throw new Error("Collection rendering requires an active storefront region")
  }
  const [collectionResponse, productResponse] = await Promise.all([
    fetchServerCollections(queryClient, {
      id: [entityId],
      limit: 1,
      fields: "id,title,handle",
    }),
    fetchServerProducts(
      queryClient,
      {
        collection_id: [entityId],
        limit: 24,
        fields: "id,title",
        region_id: region.region_id,
        country_code: region.country_code,
      },
      requestContext
    ),
  ])
  const collection = collectionResponse.collections.find(
    (candidate) => candidate.id === entityId
  )
  if (!collection || productResponse.products.length === 0) {
    return null
  }

  const registry = await getUrlRegistry()
  const productItems = (
    await Promise.all(
      productResponse.products.map(async (product) => {
        const record = await registry.findByEntity(
          market,
          "product",
          product.id
        )
        if (record?.status !== "current") {
          return null
        }
        return registryItem(record, product.title)
      })
    )
  ).filter((item): item is RegistryIndexItem => item !== null)

  return (
    <RegistryIndexPage
      emptyLabel={collection.title}
      items={productItems}
      title={collection.title}
    />
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
  if (route.kind === "campaign") {
    return null
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
    const { availableProductCount, dehydratedState, region } =
      await prefetchCategoryPageStorefrontData(
        source.requestContext,
        source.category.handle,
        parsePlpQueryStateFromSearchParams(searchParams)
      )
    if (!region) {
      throw new Error("Category rendering requires an active storefront region")
    }
    if (availableProductCount === 0) {
      return null
    }
    return (
      <HydrationBoundary state={dehydratedState}>
        <CategoryListing slug={source.category.handle} />
      </HydrationBoundary>
    )
  }
  if (route.kind === "brand") {
    return renderBrandEntity(entityId, searchParams)
  }
  if (route.kind === "collection") {
    return renderCollectionEntity(route.resolution.record.market, entityId)
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

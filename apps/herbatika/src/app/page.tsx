import { HydrationBoundary } from "@tanstack/react-query"
import { headers } from "next/headers"
import { connection } from "next/server"
import { extractLegacyPublicSlugs } from "@/app/_legacy/public-slug-projections"
import { HerbatikaHomepage } from "@/components/herbatika-homepage"
import {
  fetchCachedLatestCmsBlogPosts,
  fetchCmsHeroBanners,
  fetchCmsHomepagePromo,
} from "@/lib/storefront/cms"
import { fetchHeurekaHomepageReviews } from "@/lib/storefront/external-reviews.server"
import { getMarketServerContext } from "@/lib/storefront/market-context.server"
import { prefetchHomePageStorefrontData } from "@/lib/storefront/ssr"

export default async function HomePage() {
  await connection()

  const marketContext = await getMarketServerContext()
  const requestHeaders = await headers()
  const { code: market, locale } = marketContext
  const [
    storefront,
    heroBanners,
    homepagePromo,
    blogPosts,
    homepageReviewsData,
  ] = await Promise.all([
    prefetchHomePageStorefrontData({
      cookieHeader: requestHeaders.get("cookie") ?? undefined,
      market,
    }),
    fetchCmsHeroBanners(locale),
    fetchCmsHomepagePromo(locale),
    fetchCachedLatestCmsBlogPosts(3, [], locale).catch(() => []),
    fetchHeurekaHomepageReviews(market),
  ])
  const legacyPublicSlugs = extractLegacyPublicSlugs(storefront.dehydratedState)
  const articlePublicSlugsById = Object.fromEntries(
    blogPosts.map((post) => [post.sourceId, post.slug])
  )

  return (
    <HydrationBoundary state={storefront.dehydratedState}>
      <HerbatikaHomepage
        articlePublicSlugsById={articlePublicSlugsById}
        blogPosts={blogPosts}
        categoryPublicSlugsById={legacyPublicSlugs}
        heroBanners={heroBanners}
        homepagePromo={homepagePromo}
        homepageReviewsData={homepageReviewsData}
        homepageSectionCategorySourceIds={
          storefront.homepageSectionCategorySourceIds
        }
        productPublicSlugsById={legacyPublicSlugs}
      />
    </HydrationBoundary>
  )
}

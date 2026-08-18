import { HydrationBoundary } from "@tanstack/react-query"
import { connection } from "next/server"
import { HerbatikaHomepage } from "@/components/herbatika-homepage"
import {
  fetchCachedLatestCmsBlogPosts,
  fetchCmsHeroBanners,
  fetchCmsHomepagePromo,
} from "@/lib/storefront/cms"
import { fetchHeurekaHomepageReviews } from "@/lib/storefront/external-reviews.server"
import { prefetchHomePageStorefrontData } from "@/lib/storefront/ssr"

export default async function HomePage() {
  await connection()

  const [
    { dehydratedState },
    heroBanners,
    homepagePromo,
    blogPosts,
    homepageReviewsData,
  ] = await Promise.all([
    prefetchHomePageStorefrontData(),
    fetchCmsHeroBanners(),
    fetchCmsHomepagePromo(),
    fetchCachedLatestCmsBlogPosts(3).catch(() => []),
    fetchHeurekaHomepageReviews(),
  ])

  return (
    <HydrationBoundary state={dehydratedState}>
      <HerbatikaHomepage
        blogPosts={blogPosts}
        heroBanners={heroBanners}
        homepagePromo={homepagePromo}
        homepageReviewsData={homepageReviewsData}
      />
    </HydrationBoundary>
  )
}

import { HydrationBoundary } from "@tanstack/react-query"
import { HerbatikaHomepage } from "@/components/herbatika-homepage"
import {
  fetchCachedLatestCmsBlogPosts,
  fetchCmsHeroBanners,
  fetchCmsHomepagePromo,
} from "@/lib/storefront/cms"
import { prefetchHomePageStorefrontData } from "@/lib/storefront/ssr"

export default async function HomePage() {
  const [{ dehydratedState }, heroBanners, homepagePromo, blogPosts] =
    await Promise.all([
      prefetchHomePageStorefrontData(),
      fetchCmsHeroBanners(),
      fetchCmsHomepagePromo(),
      fetchCachedLatestCmsBlogPosts(3).catch(() => []),
    ])

  return (
    <HydrationBoundary state={dehydratedState}>
      <HerbatikaHomepage
        blogPosts={blogPosts}
        heroBanners={heroBanners}
        homepagePromo={homepagePromo}
      />
    </HydrationBoundary>
  )
}

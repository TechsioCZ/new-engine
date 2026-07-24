import { HydrationBoundary } from "@tanstack/react-query"
import { HerbatikaHomepage } from "@/components/herbatika-homepage"
import {
  fetchCachedRandomCmsBlogPosts,
  fetchCmsHeroBanners,
} from "@/lib/storefront/cms"
import { prefetchHomePageStorefrontData } from "@/lib/storefront/ssr"

export default async function HomePage() {
  const [{ dehydratedState }, heroBanners, blogPosts] = await Promise.all([
    prefetchHomePageStorefrontData(),
    fetchCmsHeroBanners(),
    fetchCachedRandomCmsBlogPosts(3).catch(() => []),
  ])

  return (
    <HydrationBoundary state={dehydratedState}>
      <HerbatikaHomepage blogPosts={blogPosts} heroBanners={heroBanners} />
    </HydrationBoundary>
  )
}

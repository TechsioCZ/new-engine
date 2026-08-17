import { HydrationBoundary } from "@tanstack/react-query"
import { HerbatikaHomepage } from "@/components/herbatika-homepage"
import {
  fetchCachedLatestCmsBlogPosts,
  fetchCmsHeroBanners,
  fetchCmsHomepagePromo,
} from "@/lib/storefront/cms"
import { getCmsLocaleForMarket } from "@/lib/storefront/cms-locale"
import { getMarketServerContext } from "@/lib/storefront/market-context.server"
import { prefetchHomePageStorefrontData } from "@/lib/storefront/ssr"

export default async function HomePage() {
  const marketContext = await getMarketServerContext()
  const cmsLocale = getCmsLocaleForMarket(marketContext.code)
  const [{ dehydratedState }, heroBanners, homepagePromo, blogPosts] =
    await Promise.all([
      prefetchHomePageStorefrontData(),
      fetchCmsHeroBanners(cmsLocale),
      fetchCmsHomepagePromo(cmsLocale),
      fetchCachedLatestCmsBlogPosts(cmsLocale, 3).catch(() => []),
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

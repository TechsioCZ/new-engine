import { HydrationBoundary } from "@tanstack/react-query"
import { HerbatikaHomepage } from "@/components/herbatika-homepage"
import {
  fetchCmsHeroBanners,
  fetchCmsHomepagePromo,
} from "@/lib/storefront/cms"
import { prefetchHomePageStorefrontData } from "@/lib/storefront/ssr"

export default async function HomePage() {
  const [{ dehydratedState }, heroBanners, homepagePromo] = await Promise.all([
    prefetchHomePageStorefrontData(),
    fetchCmsHeroBanners(),
    fetchCmsHomepagePromo(),
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

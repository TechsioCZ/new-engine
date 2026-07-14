import { HydrationBoundary } from "@tanstack/react-query"
import { HerbatikaHomepage } from "@/components/herbatika-homepage"
import { fetchCmsHeroBanners } from "@/lib/storefront/cms"
import { prefetchHomePageStorefrontData } from "@/lib/storefront/ssr"

export default async function HomePage() {
  const [{ dehydratedState }, heroBanners] = await Promise.all([
    prefetchHomePageStorefrontData(),
    fetchCmsHeroBanners(),
  ])

  return (
    <HydrationBoundary state={dehydratedState}>
      <HerbatikaHomepage heroBanners={heroBanners} />
    </HydrationBoundary>
  )
}

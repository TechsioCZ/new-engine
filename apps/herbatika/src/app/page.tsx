import { HydrationBoundary } from "@tanstack/react-query"
import { HerbatikaHomepage } from "@/components/herbatika-homepage"
import { prefetchHomePageStorefrontData } from "@/lib/storefront/ssr"

export default async function HomePage() {
  const { dehydratedState } = await prefetchHomePageStorefrontData()

  return (
    <HydrationBoundary state={dehydratedState}>
      <HerbatikaHomepage />
    </HydrationBoundary>
  )
}

import { HydrationBoundary } from "@tanstack/react-query"
import { connection } from "next/server"
import { HerbatikaHomepage } from "@/components/herbatika-homepage"
import { fetchHeurekaHomepageReviews } from "@/lib/storefront/external-reviews.server"
import { prefetchHomePageStorefrontData } from "@/lib/storefront/ssr"

export default async function HomePage() {
  await connection()

  const [{ dehydratedState }, homepageReviewsData] = await Promise.all([
    prefetchHomePageStorefrontData(),
    fetchHeurekaHomepageReviews(),
  ])

  return (
    <HydrationBoundary state={dehydratedState}>
      <HerbatikaHomepage homepageReviewsData={homepageReviewsData} />
    </HydrationBoundary>
  )
}

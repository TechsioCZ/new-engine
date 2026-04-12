import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { getServerQueryClient } from "@techsio/storefront-data/server/get-query-client"
import { leafCategories } from "@/data/static/categories"
import { getStorefrontRegionSelection } from "@/lib/storefront-region"
import { storefrontServerRead } from "@/lib/storefront-server-read"
import { HomePageClient } from "./page-client"

export default async function Home() {
  const featuredCategoryIds = leafCategories.length
    ? leafCategories.slice(0, 2).map((category) => category.id)
    : undefined

  if (!featuredCategoryIds) {
    return <HomePageClient />
  }

  const region = await getStorefrontRegionSelection()
  const queryClient = getServerQueryClient()

  await queryClient.prefetchQuery(
    storefrontServerRead.queries.products.getListQueryOptions(
      {
        category_id: featuredCategoryIds,
        limit: 8,
      },
      {
        region: {
          region_id: region.regionId,
          country_code: region.countryCode,
        },
      }
    )
  )

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <HomePageClient
        featuredCategoryIds={featuredCategoryIds}
        regionId={region.regionId}
        countryCode={region.countryCode}
      />
    </HydrationBoundary>
  )
}

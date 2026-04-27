import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { getServerQueryClient } from "@techsio/storefront-data/server/get-query-client"
import { getStorefrontRegionSelection } from "@/lib/storefront-region"
import { storefrontServerRead } from "@/lib/storefront-server-read"
import { ProductPageClient } from "./product-page-client"

type ProductPageProps = {
  params: Promise<{ handle: string }>
  searchParams: Promise<{ variant?: string | string[] }>
}

export default async function ProductPage({
  params,
  searchParams,
}: ProductPageProps) {
  const { handle } = await params
  const { variant } = await searchParams
  const region = await getStorefrontRegionSelection()
  const queryClient = getServerQueryClient()

  await queryClient.prefetchQuery(
    storefrontServerRead.queries.products.getDetailQueryOptions(
      {
        handle,
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
      <ProductPageClient
        handle={handle}
        variantParam={Array.isArray(variant) ? variant[0] ?? null : variant ?? null}
      />
    </HydrationBoundary>
  )
}

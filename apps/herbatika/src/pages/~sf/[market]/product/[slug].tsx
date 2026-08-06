import type { HttpTypes } from "@medusajs/types"
import { type DehydratedState, HydrationBoundary } from "@tanstack/react-query"
import type { GetServerSideProps } from "next"
import { ProductDetail } from "@/components/product-detail"
import {
  type EntityPageProps,
  resolveEntityPage,
} from "@/lib/routing/public-page"
import { StatusSurface } from "@/lib/routing/status-surface"
import { PRODUCT_DETAIL_FIELDS } from "@/lib/storefront/product-query-config"
import { prefetchProductDetailPageStorefrontData } from "@/lib/storefront/ssr"
import { getRegionServerContext } from "@/lib/storefront/ssr/context"
import { fetchServerProducts } from "@/lib/storefront/storefront-server"

type Source = {
  product: HttpTypes.StoreProduct
  dehydratedState: DehydratedState
}
type Props = EntityPageProps<Source>
export const getServerSideProps: GetServerSideProps<Props> = (context) =>
  resolveEntityPage<Source>(
    context,
    "product",
    async ({ entityId, requestContext }) => {
      const { queryClient, region } =
        await getRegionServerContext(requestContext)
      if (!region) {
        return { type: "unavailable" }
      }
      const response = await fetchServerProducts(
        queryClient,
        {
          id: [entityId],
          limit: 1,
          fields: PRODUCT_DETAIL_FIELDS,
          region_id: region.region_id,
          country_code: region.country_code,
        },
        requestContext
      )
      const product = response.products.find(
        (candidate) => candidate.id === entityId
      )
      if (!product?.handle) {
        return { type: "not-found" }
      }
      const { dehydratedState } = await prefetchProductDetailPageStorefrontData(
        requestContext,
        product.handle
      )
      return { type: "found", value: { product, dehydratedState } }
    }
  )
export default function ProductPage({ source, status }: Props) {
  if (status) {
    return <StatusSurface status={status} />
  }
  if (!source) {
    return null
  }
  return (
    <HydrationBoundary state={source.dehydratedState}>
      <ProductDetail handle={source.product.handle ?? ""} />
    </HydrationBoundary>
  )
}

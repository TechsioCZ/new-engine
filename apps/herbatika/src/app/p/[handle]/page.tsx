import { HydrationBoundary } from "@tanstack/react-query"

import { ProductDetail } from "@/components/product-detail"
import { prefetchProductDetailPageStorefrontData } from "@/lib/storefront/ssr"

interface ProductDetailPageProps {
  params: Promise<{
    handle: string
  }>
}

const ProductDetailPage = async ({ params }: ProductDetailPageProps) => {
  const { handle } = await params
  const { dehydratedState } =
    await prefetchProductDetailPageStorefrontData(handle)

  return (
    <HydrationBoundary state={dehydratedState}>
      <ProductDetail handle={handle} />
    </HydrationBoundary>
  )
}

export default ProductDetailPage

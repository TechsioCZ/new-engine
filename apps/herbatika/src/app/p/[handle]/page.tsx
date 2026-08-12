import { HydrationBoundary } from "@tanstack/react-query"
import { ProductDetail } from "@/components/product-detail"
import { prefetchProductDetailPageStorefrontData } from "@/lib/storefront/ssr"

type ProductDetailPageProps = {
  params: Promise<{
    handle: string
  }>
  searchParams: Promise<{
    variant?: string | string[]
  }>
}

export default async function ProductDetailPage({
  params,
  searchParams,
}: ProductDetailPageProps) {
  const { handle } = await params
  const resolvedSearchParams = await searchParams
  const initialVariantId =
    typeof resolvedSearchParams.variant === "string"
      ? resolvedSearchParams.variant
      : undefined
  const { dehydratedState } =
    await prefetchProductDetailPageStorefrontData(handle)

  return (
    <HydrationBoundary state={dehydratedState}>
      <ProductDetail handle={handle} initialVariantId={initialVariantId} />
    </HydrationBoundary>
  )
}

import { HydrationBoundary } from "@tanstack/react-query"
import { headers } from "next/headers"
import { extractLegacyPublicSlugs } from "@/app/_legacy/public-slug-projections"
import { ProductDetail } from "@/components/product-detail"
import { getMarketServerContext } from "@/lib/storefront/market-context.server"
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
  const [marketContext, requestHeaders] = await Promise.all([
    getMarketServerContext(),
    headers(),
  ])
  const { dehydratedState } = await prefetchProductDetailPageStorefrontData(
    handle,
    {
      cookieHeader: requestHeaders.get("cookie") ?? undefined,
      market: marketContext.code,
    }
  )
  const legacyPublicSlugs = extractLegacyPublicSlugs(dehydratedState)

  return (
    <HydrationBoundary state={dehydratedState}>
      <ProductDetail
        brandPublicSlugsById={legacyPublicSlugs}
        categoryPublicSlugsById={legacyPublicSlugs}
        handle={handle}
        initialVariantId={initialVariantId}
        productPublicSlugsById={legacyPublicSlugs}
        publicSlug={handle}
      />
    </HydrationBoundary>
  )
}

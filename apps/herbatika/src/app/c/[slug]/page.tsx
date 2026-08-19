import { HydrationBoundary } from "@tanstack/react-query"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { extractLegacyPublicSlugs } from "@/app/_legacy/public-slug-projections"
import { CategoryListing } from "@/components/category-listing"
import { getMarketServerContext } from "@/lib/storefront/market-context.server"
import { parsePlpQueryStateFromSearchParams } from "@/lib/storefront/plp-query-state"
import { SALE_CATEGORY_HANDLE } from "@/lib/storefront/sale-catalog-policy"
import { prefetchCategoryPageStorefrontData } from "@/lib/storefront/ssr"

type CategoryPageProps = {
  params: Promise<{
    slug: string
  }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const CATEGORY_SLUG_ALIASES: Record<string, string> = {
  akcie: SALE_CATEGORY_HANDLE,
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const [{ slug }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ])

  const normalizedSlug = slug.trim().toLowerCase()
  const canonicalSlug = CATEGORY_SLUG_ALIASES[normalizedSlug]

  if (canonicalSlug) {
    redirect(`/c/${canonicalSlug}`)
  }

  const queryState = parsePlpQueryStateFromSearchParams(resolvedSearchParams)
  const [marketContext, requestHeaders] = await Promise.all([
    getMarketServerContext(),
    headers(),
  ])
  const { dehydratedState } = await prefetchCategoryPageStorefrontData(
    normalizedSlug,
    queryState,
    {
      cookieHeader: requestHeaders.get("cookie") ?? undefined,
      market: marketContext.code,
    }
  )
  const legacyPublicSlugs = extractLegacyPublicSlugs(dehydratedState)

  return (
    <HydrationBoundary state={dehydratedState}>
      <CategoryListing
        categoryPublicSlugsById={legacyPublicSlugs}
        productPublicSlugsById={legacyPublicSlugs}
        slug={normalizedSlug}
      />
    </HydrationBoundary>
  )
}

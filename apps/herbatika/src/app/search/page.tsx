import { HydrationBoundary } from "@tanstack/react-query"
import { headers } from "next/headers"
import { extractLegacyPublicSlugs } from "@/app/_legacy/public-slug-projections"
import { SearchResults } from "@/components/search-results"
import { getMarketServerContext } from "@/lib/storefront/market-context.server"
import { parsePlpQueryStateFromSearchParams } from "@/lib/storefront/plp-query-state"
import { prefetchSearchPageStorefrontData } from "@/lib/storefront/ssr"

type SearchPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedSearchParams = await searchParams

  const queryState = parsePlpQueryStateFromSearchParams(resolvedSearchParams)
  const [marketContext, requestHeaders] = await Promise.all([
    getMarketServerContext(),
    headers(),
  ])
  const { dehydratedState } = await prefetchSearchPageStorefrontData(
    queryState,
    {
      cookieHeader: requestHeaders.get("cookie") ?? undefined,
      market: marketContext.code,
    }
  )
  const legacyPublicSlugs = extractLegacyPublicSlugs(dehydratedState)

  return (
    <HydrationBoundary state={dehydratedState}>
      <SearchResults
        articlePublicSlugsById={legacyPublicSlugs}
        brandPublicSlugsById={legacyPublicSlugs}
        categoryPublicSlugsById={legacyPublicSlugs}
        productPublicSlugsById={legacyPublicSlugs}
      />
    </HydrationBoundary>
  )
}

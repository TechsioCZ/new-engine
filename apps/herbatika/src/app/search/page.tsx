import { HydrationBoundary } from "@tanstack/react-query"

import { SearchResults } from "@/components/search-results"
import { parsePlpQueryStateFromSearchParams } from "@/lib/storefront/plp-query-state"
import { prefetchSearchPageStorefrontData } from "@/lib/storefront/ssr"

interface SearchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const SearchPage = async ({ searchParams }: SearchPageProps) => {
  const resolvedSearchParams = await searchParams

  const queryState = parsePlpQueryStateFromSearchParams(resolvedSearchParams)
  const { dehydratedState } = await prefetchSearchPageStorefrontData(queryState)

  return (
    <HydrationBoundary state={dehydratedState}>
      <SearchResults />
    </HydrationBoundary>
  )
}

export default SearchPage

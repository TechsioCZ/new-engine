import { HydrationBoundary } from "@tanstack/react-query";
import { StorefrontSearchResults } from "@/components/storefront-search-results";
import { parsePlpQueryStateFromSearchParams } from "@/lib/storefront/plp-query-state";
import { prefetchSearchPageStorefrontData } from "@/lib/storefront/ssr";

type SearchPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedSearchParams = await searchParams;

  const queryState = parsePlpQueryStateFromSearchParams(resolvedSearchParams);
  const { dehydratedState } =
    await prefetchSearchPageStorefrontData(queryState);

  return (
    <HydrationBoundary state={dehydratedState}>
      <StorefrontSearchResults />
    </HydrationBoundary>
  );
}

import { HydrationBoundary } from "@tanstack/react-query";
import { connection } from "next/server";
import { Suspense } from "react";
import { StorefrontSearchResults } from "@/components/storefront-search-results";
import { parsePlpQueryStateFromSearchParams } from "@/lib/storefront/plp-query-state";
import { prefetchSearchPageStorefrontData } from "@/lib/storefront/ssr";

type SearchPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function SearchPageFallback() {
  return <main className="mx-auto min-h-dvh w-full max-w-max-w" />;
}

async function SearchPageContent({ searchParams }: SearchPageProps) {
  await connection();
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

export default function SearchPage(props: SearchPageProps) {
  return (
    <Suspense fallback={<SearchPageFallback />}>
      <SearchPageContent {...props} />
    </Suspense>
  );
}

import { type DehydratedState, HydrationBoundary } from "@tanstack/react-query"
import type { GetServerSideProps } from "next"
import { SearchResults } from "@/components/search-results"
import { type FlowPageProps, resolveFlowPage } from "@/lib/routing/public-page"
import { StatusSurface } from "@/lib/routing/status-surface"
import { parsePlpQueryStateFromSearchParams } from "@/lib/storefront/plp-query-state"
import { prefetchSearchPageStorefrontData } from "@/lib/storefront/ssr"

type Props = FlowPageProps<{ dehydratedState: DehydratedState }>
export const getServerSideProps: GetServerSideProps<Props> = (context) =>
  resolveFlowPage(context, async (_market, requestContext) => {
    const queryState = parsePlpQueryStateFromSearchParams({
      q: context.query.q,
      page: context.query.strana,
      sort: context.query.razeni,
      brand: context.query.znacka,
    })
    return {
      type: "found",
      value: await prefetchSearchPageStorefrontData(requestContext, queryState),
    }
  })
export default function SearchPage({ source, status }: Props) {
  if (status) {
    return <StatusSurface status={status} />
  }
  return source ? (
    <HydrationBoundary state={source.dehydratedState}>
      <SearchResults />
    </HydrationBoundary>
  ) : null
}

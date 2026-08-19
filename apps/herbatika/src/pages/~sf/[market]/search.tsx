import type { DehydratedState } from "@tanstack/react-query"
import { HydrationBoundary } from "@tanstack/react-query"
import type { GetServerSideProps } from "next"
import { SearchResults } from "@/components/search-results"
import {
  foundSource,
  type PublicPageProps,
  resolveFlowPublicPage,
} from "@/lib/routing/public-page"
import { parsePlpQueryStateFromSearchParams } from "@/lib/storefront/plp-query-state"
import { prefetchSearchPageStorefrontData } from "@/lib/storefront/ssr"
import {
  type PublicEntitySlugMap,
  readRequiredPublicEntitySlugs,
} from "@/lib/storefront/ssr/public-entity-projections"

type Props = PublicPageProps<
  Readonly<{
    dehydratedState: DehydratedState
    productPublicSlugsById: PublicEntitySlugMap
  }>
>

export const getServerSideProps = ((context) => {
  const queryState = parsePlpQueryStateFromSearchParams(context.query)
  return resolveFlowPublicPage(context, {
    expectedRouteKey: "search",
    loadSource: async (market) => {
      const result = await prefetchSearchPageStorefrontData(queryState, {
        cookieHeader: context.req.headers.cookie,
        market,
      })
      if (!result.region) {
        return {
          kind: "invalid-response",
          causeCode: "MISSING_REGION",
        } as const
      }
      const productPublicSlugsById = await readRequiredPublicEntitySlugs({
        kind: "product",
        market,
        requiredSourceIds: result.visibleProductIds,
      })
      if (productPublicSlugsById.kind !== "found") {
        return productPublicSlugsById
      }
      return foundSource({
        dehydratedState: result.dehydratedState,
        productPublicSlugsById: productPublicSlugsById.value,
      })
    },
    query: { kind: "search", path: { kind: "search" } },
  })
}) satisfies GetServerSideProps<Props>

export default function SearchPage({ page }: Props) {
  if (page.kind === "error") {
    return <main data-status={page.status}>Search unavailable.</main>
  }
  return (
    <HydrationBoundary state={page.value.dehydratedState}>
      <SearchResults
        productPublicSlugsById={page.value.productPublicSlugsById}
      />
    </HydrationBoundary>
  )
}

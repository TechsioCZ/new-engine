import type { DehydratedState } from "@tanstack/react-query"
import { HydrationBoundary } from "@tanstack/react-query"
import type { GetServerSideProps } from "next"
import { SearchResults } from "@/components/search-results"
import { LocalizedPageError } from "@/lib/routing/pages/localized-page-error"
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

const SEARCH_PAGE_TITLE = {
  sk: "Vyhľadávanie",
  cz: "Vyhledávání",
  hu: "Keresés",
  ro: "Căutare",
} as const

type Props = PublicPageProps<
  Readonly<{
    dehydratedState: DehydratedState
    productPublicSlugsById: PublicEntitySlugMap
    title: string
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
      // Registry projections are optional: Medusa handles are the public slugs.
      return foundSource({
        dehydratedState: result.dehydratedState,
        productPublicSlugsById:
          productPublicSlugsById.kind === "found"
            ? productPublicSlugsById.value
            : result.visibleProductSlugsById,
        title: SEARCH_PAGE_TITLE[market],
      })
    },
    query: { kind: "search", path: { kind: "search" } },
    title: (value) => value.title,
  })
}) satisfies GetServerSideProps<Props>

export default function SearchPage({ page }: Props) {
  if (page.kind === "error") {
    return <LocalizedPageError status={page.status} surface="search" />
  }
  return (
    <HydrationBoundary state={page.value.dehydratedState}>
      <SearchResults
        productPublicSlugsById={page.value.productPublicSlugsById}
      />
    </HydrationBoundary>
  )
}

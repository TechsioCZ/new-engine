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
    articlePublicSlugsById: PublicEntitySlugMap
    brandPublicSlugsById: PublicEntitySlugMap
    categoryPublicSlugsById: PublicEntitySlugMap
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
      const [
        articlePublicSlugsById,
        brandPublicSlugsById,
        categoryPublicSlugsById,
        productPublicSlugsById,
      ] = await Promise.all([
        readRequiredPublicEntitySlugs({ kind: "article", market }),
        readRequiredPublicEntitySlugs({ kind: "brand", market }),
        readRequiredPublicEntitySlugs({ kind: "category", market }),
        readRequiredPublicEntitySlugs({
          kind: "product",
          market,
          requiredSourceIds: result.visibleProductIds,
        }),
      ])
      if (articlePublicSlugsById.kind !== "found") {
        return articlePublicSlugsById
      }
      if (brandPublicSlugsById.kind !== "found") {
        return brandPublicSlugsById
      }
      if (categoryPublicSlugsById.kind !== "found") {
        return categoryPublicSlugsById
      }
      if (productPublicSlugsById.kind !== "found") {
        return productPublicSlugsById
      }
      return foundSource({
        articlePublicSlugsById: articlePublicSlugsById.value,
        brandPublicSlugsById: brandPublicSlugsById.value,
        categoryPublicSlugsById: categoryPublicSlugsById.value,
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
        articlePublicSlugsById={page.value.articlePublicSlugsById}
        brandPublicSlugsById={page.value.brandPublicSlugsById}
        categoryPublicSlugsById={page.value.categoryPublicSlugsById}
        productPublicSlugsById={page.value.productPublicSlugsById}
      />
    </HydrationBoundary>
  )
}

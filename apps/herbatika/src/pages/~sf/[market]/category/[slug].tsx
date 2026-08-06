import { type DehydratedState, HydrationBoundary } from "@tanstack/react-query"
import type { GetServerSideProps } from "next"
import { CategoryListing } from "@/components/category-listing"
import {
  type EntityPageProps,
  resolveEntityPage,
} from "@/lib/routing/public-page"
import { StatusSurface } from "@/lib/routing/status-surface"
import {
  buildCategoryListParams,
  CATEGORY_TREE_FIELDS,
  CATEGORY_TREE_LIMIT,
} from "@/lib/storefront/category-query-config"
import { parsePlpQueryStateFromSearchParams } from "@/lib/storefront/plp-query-state"
import { prefetchCategoryPageStorefrontData } from "@/lib/storefront/ssr"
import { getRegionServerContext } from "@/lib/storefront/ssr/context"
import { fetchServerCategories } from "@/lib/storefront/storefront-server"

type Source = { handle: string; dehydratedState: DehydratedState }
type Props = EntityPageProps<Source>
export const getServerSideProps: GetServerSideProps<Props> = (context) =>
  resolveEntityPage<Source>(context, "category", async ({ entityId }) => {
    const { queryClient } = await getRegionServerContext()
    const response = await fetchServerCategories(
      queryClient,
      buildCategoryListParams({
        page: 1,
        limit: CATEGORY_TREE_LIMIT,
        fields: CATEGORY_TREE_FIELDS,
      })
    )
    const category = response.categories.find(
      (candidate) => candidate.id === entityId
    )
    if (!category?.handle) {
      return { type: "not-found" }
    }
    const queryState = parsePlpQueryStateFromSearchParams({
      page: context.query.strana,
      sort: context.query.razeni,
      brand: context.query.znacka,
    })
    const { dehydratedState } = await prefetchCategoryPageStorefrontData(
      category.handle,
      queryState
    )
    return {
      type: "found",
      value: { handle: category.handle, dehydratedState },
    }
  })
export default function CategoryPage({ source, status }: Props) {
  if (status) {
    return <StatusSurface status={status} />
  }
  if (!source) {
    return null
  }
  return (
    <HydrationBoundary state={source.dehydratedState}>
      <CategoryListing slug={source.handle} />
    </HydrationBoundary>
  )
}

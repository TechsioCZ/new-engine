import type { DehydratedState } from "@tanstack/react-query"
import { HydrationBoundary } from "@tanstack/react-query"
import type { GetServerSideProps } from "next"
import { CategoryListing } from "@/components/category-listing"
import {
  type PublicPageProps,
  resolveEntityPublicPage,
} from "@/lib/routing/public-page"
import {
  buildCategoryListParams,
  CATEGORY_TREE_FIELDS,
  CATEGORY_TREE_LIMIT,
} from "@/lib/storefront/category-query-config"
import { parsePlpQueryStateFromSearchParams } from "@/lib/storefront/plp-query-state"
import { prefetchCategoryPageStorefrontData } from "@/lib/storefront/ssr"
import { getRegionServerContext } from "@/lib/storefront/ssr/context"
import {
  type PublicEntitySlugMap,
  readRequiredPublicEntitySlugs,
} from "@/lib/storefront/ssr/public-entity-projections"
import { fetchServerCategories } from "@/lib/storefront/storefront-server"

type CategoryValue = Readonly<{
  categoryPublicSlugsById: PublicEntitySlugMap
  dehydratedState: DehydratedState
  handle: string
  name: string
  productPublicSlugsById: PublicEntitySlugMap
  totalPages: number
}>

type Props = PublicPageProps<CategoryValue>

export const getServerSideProps = ((context) => {
  const queryState = parsePlpQueryStateFromSearchParams(context.query)
  return resolveEntityPublicPage<CategoryValue>(context, {
    expectedRouteKey: "category.detail",
    kind: "category",
    loadSource: async ({ market, sourceId }) => {
      const requestContext = {
        cookieHeader: context.req.headers.cookie,
        market,
      } as const
      const { locale, queryClient } =
        await getRegionServerContext(requestContext)
      const response = await fetchServerCategories(
        market,
        queryClient,
        buildCategoryListParams({
          fields: CATEGORY_TREE_FIELDS,
          limit: CATEGORY_TREE_LIMIT,
          locale,
          page: 1,
        })
      )
      const category = response.categories.find((item) => item.id === sourceId)
      if (!category) {
        return { kind: "missing" } as const
      }
      const categoryHandle = category.handle
      const categoryName = category.name
      const storefront = await prefetchCategoryPageStorefrontData(
        categoryHandle,
        queryState,
        requestContext
      )
      if (!storefront.region) {
        return {
          kind: "invalid-response",
          causeCode: "MISSING_REGION",
        } as const
      }
      const [categoryPublicSlugsById, productPublicSlugsById] =
        await Promise.all([
          readRequiredPublicEntitySlugs({
            kind: "category",
            market,
            requiredSourceIds: storefront.categorySourceIds,
          }),
          readRequiredPublicEntitySlugs({
            kind: "product",
            market,
            requiredSourceIds: storefront.visibleProductIds,
          }),
        ])
      if (categoryPublicSlugsById.kind !== "found") {
        return categoryPublicSlugsById
      }
      if (productPublicSlugsById.kind !== "found") {
        return productPublicSlugsById
      }
      return {
        kind: "found",
        value: {
          categoryPublicSlugsById: categoryPublicSlugsById.value,
          dehydratedState: storefront.dehydratedState,
          handle: categoryHandle,
          name: categoryName,
          productPublicSlugsById: productPublicSlugsById.value,
          totalPages: storefront.totalPages,
        },
      } as const
    },
    lastPage: (category) => category.totalPages,
    queryKind: "category-detail",
    title: (category) => category.name,
  })
}) satisfies GetServerSideProps<Props>

export default function CategoryPage({ page }: Props) {
  if (page.kind === "error") {
    return <main data-status={page.status}>Category unavailable.</main>
  }
  return (
    <HydrationBoundary state={page.value.dehydratedState}>
      <CategoryListing
        categoryPublicSlugsById={page.value.categoryPublicSlugsById}
        productPublicSlugsById={page.value.productPublicSlugsById}
        slug={page.value.handle}
      />
    </HydrationBoundary>
  )
}

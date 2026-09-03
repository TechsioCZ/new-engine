import type { DehydratedState } from "@tanstack/react-query"
import { HydrationBoundary } from "@tanstack/react-query"
import type { GetServerSideProps } from "next"
import { ProductIndexPage } from "@/components/products/product-index-page"
import { PRODUCT_INDEX_TITLE } from "@/components/products/product-index-title"
import { LocalizedPageError } from "@/lib/routing/pages/localized-page-error"
import {
  foundSource,
  type PublicPageProps,
  resolveStaticPublicPage,
} from "@/lib/routing/public-page"
import { parsePlpQueryStateFromSearchParams } from "@/lib/storefront/plp-query-state"
import { prefetchProductIndexStorefrontData } from "@/lib/storefront/ssr"
import {
  type PublicEntitySlugMap,
  readAvailablePublicEntitySlugs,
} from "@/lib/storefront/ssr/public-entity-projections"

type Props = PublicPageProps<
  Readonly<{
    dehydratedState: DehydratedState
    productPublicSlugsById: PublicEntitySlugMap
    title: string
    totalPages: number
  }>
>

export const getServerSideProps = ((context) => {
  const queryState = parsePlpQueryStateFromSearchParams(context.query)
  return resolveStaticPublicPage(context, {
    expectedRouteKey: "product.index",
    loadSource: async (market) => {
      const result = await prefetchProductIndexStorefrontData(queryState, {
        cookieHeader: context.req.headers.cookie,
        market,
      })
      if (!result.region) {
        return {
          kind: "invalid-response",
          causeCode: "MISSING_REGION",
        } as const
      }
      const productPublicSlugsById = await readAvailablePublicEntitySlugs({
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
        title: PRODUCT_INDEX_TITLE[market],
        totalPages: result.totalPages,
      })
    },
    lastPage: (value) => value.totalPages,
    path: { kind: "product" },
    queryKind: "product-index",
    title: (value) => value.title,
  })
}) satisfies GetServerSideProps<Props>

export default function ProductsPage({ page }: Props) {
  if (page.kind === "error") {
    return <LocalizedPageError status={page.status} surface="catalog" />
  }
  return (
    <HydrationBoundary state={page.value.dehydratedState}>
      <ProductIndexPage
        productPublicSlugsById={page.value.productPublicSlugsById}
      />
    </HydrationBoundary>
  )
}

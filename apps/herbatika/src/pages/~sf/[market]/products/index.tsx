import type { DehydratedState } from "@tanstack/react-query"
import { HydrationBoundary } from "@tanstack/react-query"
import type { GetServerSideProps } from "next"
import { ProductIndexPage } from "@/components/products/product-index-page"
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
      return productPublicSlugsById.kind === "found"
        ? foundSource({
            dehydratedState: result.dehydratedState,
            productPublicSlugsById: productPublicSlugsById.value,
            totalPages: result.totalPages,
          })
        : productPublicSlugsById
    },
    lastPage: (value) => value.totalPages,
    path: { kind: "product" },
    queryKind: "product-index",
  })
}) satisfies GetServerSideProps<Props>

export default function ProductsPage({ page }: Props) {
  if (page.kind === "error") {
    return <main data-status={page.status}>Products unavailable.</main>
  }
  return (
    <HydrationBoundary state={page.value.dehydratedState}>
      <ProductIndexPage
        productPublicSlugsById={page.value.productPublicSlugsById}
      />
    </HydrationBoundary>
  )
}

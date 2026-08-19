import type { DehydratedState } from "@tanstack/react-query"
import { HydrationBoundary } from "@tanstack/react-query"
import type { GetServerSideProps } from "next"
import { BrandListing } from "@/components/brands/brand-listing"
import {
  type PublicPageProps,
  resolveEntityPublicPage,
} from "@/lib/routing/public-page"
import type { StorefrontBrand } from "@/lib/storefront/brands"
import { fetchStorefrontBrands } from "@/lib/storefront/brands.server"
import { parsePlpQueryStateFromSearchParams } from "@/lib/storefront/plp-query-state"
import { prefetchBrandPageStorefrontData } from "@/lib/storefront/ssr"
import {
  type PublicEntitySlugMap,
  readRequiredPublicEntitySlugs,
} from "@/lib/storefront/ssr/public-entity-projections"

type BrandValue = Readonly<{
  brand: StorefrontBrand
  dehydratedState: DehydratedState
  productPublicSlugsById: PublicEntitySlugMap
  publicSlug: string
  totalPages: number
}>

type Props = PublicPageProps<BrandValue>

export const getServerSideProps = ((context) => {
  const queryState = parsePlpQueryStateFromSearchParams(context.query)
  return resolveEntityPublicPage<BrandValue>(context, {
    expectedRouteKey: "brand.detail",
    kind: "brand",
    loadSource: async ({ market, sourceId }) => {
      const brands = await fetchStorefrontBrands(market)
      const brand = brands.find((item) => item.id === sourceId)
      if (!brand) {
        return { kind: "missing" } as const
      }
      const storefront = await prefetchBrandPageStorefrontData(
        brand.facetId,
        queryState,
        { cookieHeader: context.req.headers.cookie, market }
      )
      if (!storefront.region) {
        return {
          kind: "invalid-response",
          causeCode: "MISSING_REGION",
        } as const
      }
      const [brandPublicSlugsById, productPublicSlugsById] = await Promise.all([
        readRequiredPublicEntitySlugs({
          kind: "brand",
          market,
          requiredSourceIds: [brand.id],
        }),
        readRequiredPublicEntitySlugs({
          kind: "product",
          market,
          requiredSourceIds: storefront.visibleProductIds,
        }),
      ])
      if (brandPublicSlugsById.kind !== "found") {
        return brandPublicSlugsById
      }
      if (productPublicSlugsById.kind !== "found") {
        return productPublicSlugsById
      }
      return {
        kind: "found",
        value: {
          brand,
          dehydratedState: storefront.dehydratedState,
          productPublicSlugsById: productPublicSlugsById.value,
          publicSlug: brandPublicSlugsById.value[brand.id],
          totalPages: storefront.totalPages,
        },
      } as const
    },
    lastPage: (value) => value.totalPages,
    queryKind: "brand-detail",
    title: ({ brand }) => brand.title,
  })
}) satisfies GetServerSideProps<Props>

export default function BrandPage({ page }: Props) {
  if (page.kind === "error") {
    return <main data-status={page.status}>Brand unavailable.</main>
  }
  return (
    <HydrationBoundary state={page.value.dehydratedState}>
      <BrandListing
        brandFacetId={page.value.brand.facetId}
        brandTitle={page.value.brand.title}
        productPublicSlugsById={page.value.productPublicSlugsById}
        publicSlug={page.value.publicSlug}
      />
    </HydrationBoundary>
  )
}

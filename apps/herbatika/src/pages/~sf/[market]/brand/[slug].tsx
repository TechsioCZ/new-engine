import { type DehydratedState, HydrationBoundary } from "@tanstack/react-query"
import type { GetServerSideProps } from "next"
import { BrandListing } from "@/components/brands/brand-listing"
import {
  type EntityPageProps,
  resolveEntityPage,
} from "@/lib/routing/public-page"
import { StatusSurface } from "@/lib/routing/status-surface"
import { fetchStorefrontBrands } from "@/lib/storefront/brands.server"
import { parsePlpQueryStateFromSearchParams } from "@/lib/storefront/plp-query-state"
import { prefetchBrandPageStorefrontData } from "@/lib/storefront/ssr"

type Source = {
  facetId: string
  title: string
  dehydratedState: DehydratedState
}
type Props = EntityPageProps<Source>
export const getServerSideProps: GetServerSideProps<Props> = (context) =>
  resolveEntityPage<Source>(context, "brand", async ({ entityId }) => {
    const brand = (await fetchStorefrontBrands()).find(
      (candidate) => candidate.id === entityId
    )
    if (!brand) {
      return { type: "not-found" }
    }
    const queryState = parsePlpQueryStateFromSearchParams({
      page: context.query.strana,
      sort: context.query.razeni,
      brand: context.query.znacka,
    })
    const { dehydratedState } = await prefetchBrandPageStorefrontData(
      brand.facetId,
      queryState
    )
    return {
      type: "found",
      value: { facetId: brand.facetId, title: brand.title, dehydratedState },
    }
  })
export default function BrandPage({ source, status }: Props) {
  if (status) {
    return <StatusSurface status={status} />
  }
  if (!source) {
    return null
  }
  return (
    <HydrationBoundary state={source.dehydratedState}>
      <BrandListing brandFacetId={source.facetId} brandTitle={source.title} />
    </HydrationBoundary>
  )
}

import type { GetServerSideProps } from "next"
import { CollectionListing } from "@/components/collections/collection-listing"
import { LocalizedPageError } from "@/lib/routing/pages/localized-page-error"
import {
  type PublicPageProps,
  resolveEntityPublicPage,
} from "@/lib/routing/public-page"
import type { CollectionRouteSourceValue } from "@/lib/storefront/collections-route-source"
import { readCollectionRouteSourceFromMedusa } from "@/lib/storefront/collections-route-source.server"
import type { ProductSortValue } from "@/lib/storefront/plp-query-state"
import { parsePlpQueryStateFromSearchParams } from "@/lib/storefront/plp-query-state"
import { readRequiredPublicEntitySlugs } from "@/lib/storefront/ssr/public-entity-projections"

type CollectionDetailValue = CollectionRouteSourceValue &
  Readonly<{
    activeSort: ProductSortValue
    productPublicSlugsById: Readonly<Record<string, string>>
  }>

type Props = PublicPageProps<CollectionDetailValue>

export const getServerSideProps = ((context) => {
  const queryState = parsePlpQueryStateFromSearchParams(context.query)
  return resolveEntityPublicPage<CollectionDetailValue>(context, {
    expectedRouteKey: "collection.detail",
    isIndexable: (value) => value.catalog.count > 0,
    kind: "collection",
    lastPage: (value) => Math.max(1, value.catalog.totalPages),
    loadSource: async ({ market, sourceId }) => {
      const source = await readCollectionRouteSourceFromMedusa({
        collectionId: sourceId,
        market,
        queryState,
      })
      if (source.kind !== "found") {
        return source
      }
      const visibleProductIds = source.value.catalog.products.map(
        (product) => product.id
      )
      const productProjections = await readRequiredPublicEntitySlugs({
        kind: "product",
        market,
        requiredSourceIds: visibleProductIds,
      })
      if (productProjections.kind !== "found") {
        return productProjections
      }
      return {
        kind: "found",
        value: {
          ...source.value,
          activeSort: queryState.sort,
          productPublicSlugsById: productProjections.value,
        },
      } as const
    },
    queryKind: "collection-detail",
    title: (value) => value.collection.title,
  })
}) satisfies GetServerSideProps<Props>

export default function CollectionPage({ page }: Props) {
  if (page.kind === "error") {
    return <LocalizedPageError status={page.status} surface="catalog" />
  }
  return <CollectionListing {...page.value} />
}

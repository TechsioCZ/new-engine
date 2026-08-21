import type { GetServerSideProps } from "next"
import {
  type EntityIndexItem,
  EntityIndexPage,
} from "@/components/entity-index-page"
import { LocalizedPageError } from "@/lib/routing/pages/localized-page-error"
import {
  foundSource,
  type PublicPageProps,
  resolveStaticPublicPage,
} from "@/lib/routing/public-page"
import { readCollectionIndexSourceFromMedusa } from "@/lib/storefront/collections-index-source.server"
import { readRequiredPublicEntitySlugs } from "@/lib/storefront/ssr/public-entity-projections"
import { buildPath } from "@/lib/url/public-url"

type Props = PublicPageProps<
  Readonly<{ items: readonly EntityIndexItem[]; title: string }>
>

const TITLE = {
  sk: "Kolekcie",
  cz: "Kolekce",
  hu: "Gyűjtemények",
  ro: "Colecții",
} as const

export const getServerSideProps = (async (context) =>
  resolveStaticPublicPage(context, {
    expectedRouteKey: "collection.index",
    loadSource: async (market) => {
      const projections = await readRequiredPublicEntitySlugs({
        kind: "collection",
        market,
      })
      if (projections.kind !== "found") {
        return projections
      }
      const source = await readCollectionIndexSourceFromMedusa({
        market,
        routeSourceIds: Object.keys(projections.value),
      })
      if (source.kind !== "found") {
        return source
      }
      const sourceById = new Map(
        source.value.map((collection) => [collection.id, collection] as const)
      )
      return foundSource({
        items: Object.entries(projections.value).flatMap(
          ([sourceId, publicSlug]) => {
            const collection = sourceById.get(sourceId)
            return collection
              ? [
                  {
                    href: buildPath(
                      {
                        kind: "collection",
                        slug: publicSlug,
                      },
                      market
                    ),
                    id: collection.id,
                    label: collection.title,
                  },
                ]
              : []
          }
        ),
        title: TITLE[market],
      })
    },
    path: { kind: "collection" },
    queryKind: "collection-index",
    title: (value) => value.title,
  })) satisfies GetServerSideProps<Props>

export default function CollectionsPage({ page }: Props) {
  if (page.kind === "error") {
    return <LocalizedPageError status={page.status} surface="catalog" />
  }
  return <EntityIndexPage {...page.value} />
}

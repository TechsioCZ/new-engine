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
import {
  buildCategoryListParams,
  CATEGORY_TREE_FIELDS,
  CATEGORY_TREE_LIMIT,
} from "@/lib/storefront/category-query-config"
import { getRegionServerContext } from "@/lib/storefront/ssr/context"
import { readCompletePublicEntitySlugs } from "@/lib/storefront/ssr/public-entity-projections"
import { fetchServerCategories } from "@/lib/storefront/storefront-server"
import { buildPath } from "@/lib/url/public-url"

type Props = PublicPageProps<
  Readonly<{ items: readonly EntityIndexItem[]; title: string }>
>

const TITLE = {
  sk: "Kategórie",
  cz: "Kategorie",
  hu: "Kategóriák",
  ro: "Categorii",
} as const

export const getServerSideProps = (async (context) =>
  resolveStaticPublicPage(context, {
    expectedRouteKey: "category.index",
    loadSource: async (market) => {
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
      const publicSlugs = await readCompletePublicEntitySlugs({
        kind: "category",
        market,
        rejectUnexpectedSourceIds: true,
        requiredSourceIds: response.categories.map((category) => category.id),
      })
      if (publicSlugs.kind !== "found") {
        return publicSlugs
      }
      return foundSource({
        items: response.categories.map((category) => ({
          href: buildPath(
            {
              kind: "category",
              slug: publicSlugs.value[category.id],
            },
            market
          ),
          id: category.id,
          label: category.name,
        })),
        title: TITLE[market],
      })
    },
    path: { kind: "category" },
    queryKind: "category-index",
    title: (value) => value.title,
  })) satisfies GetServerSideProps<Props>

export default function CategoriesPage({ page }: Props) {
  if (page.kind === "error") {
    return <LocalizedPageError status={page.status} surface="catalog" />
  }
  return <EntityIndexPage {...page.value} />
}

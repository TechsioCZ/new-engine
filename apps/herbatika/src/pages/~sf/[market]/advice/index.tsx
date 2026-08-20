import type { GetServerSideProps } from "next"
import { BlogListingPage } from "@/components/blog/blog-listing-page"
import { LocalizedPageError } from "@/lib/routing/pages/localized-page-error"
import {
  foundSource,
  type PublicPageProps,
  resolveStaticPublicPage,
} from "@/lib/routing/public-page"
import { type CmsBlogListing, fetchCmsBlogListing } from "@/lib/storefront/cms"
import { getHerbatikaMarketContext } from "@/lib/storefront/market-context"
import {
  type PublicEntitySlugMap,
  readAvailablePublicEntitySlugs,
} from "@/lib/storefront/ssr/public-entity-projections"

type AdviceIndexValue = Readonly<{
  articlePublicSlugsById: PublicEntitySlugMap
  listing: CmsBlogListing
}>

type Props = PublicPageProps<AdviceIndexValue>

export const getServerSideProps = (async (context) =>
  resolveStaticPublicPage(context, {
    expectedRouteKey: "article.index",
    lastPage: ({ listing }) => listing.totalPages,
    loadSource: async (market) => {
      const listing = await fetchCmsBlogListing({
        category:
          typeof context.query.category === "string"
            ? context.query.category
            : undefined,
        locale: getHerbatikaMarketContext(market).locale,
        page:
          typeof context.query.page === "string"
            ? Number.parseInt(context.query.page, 10)
            : 1,
      })
      const articlePublicSlugsById = await readAvailablePublicEntitySlugs({
        kind: "article",
        market,
        requiredSourceIds: listing.posts.map((post) => post.sourceId),
      })
      return articlePublicSlugsById.kind === "found"
        ? foundSource({
            articlePublicSlugsById: articlePublicSlugsById.value,
            listing,
          })
        : articlePublicSlugsById
    },
    path: { kind: "article" },
    queryKind: "advice-index",
  })) satisfies GetServerSideProps<Props>

export default function AdviceIndexPage({ page }: Props) {
  if (page.kind === "error") {
    return <LocalizedPageError status={page.status} surface="advice" />
  }
  return (
    <BlogListingPage
      articlePublicSlugsById={page.value.articlePublicSlugsById}
      listing={page.value.listing}
    />
  )
}

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
import type { PublicEntitySlugMap } from "@/lib/storefront/ssr/public-entity-projections"

const BLOG_LISTING_TITLE = {
  sk: "Blog o zdraví a kráse",
  cz: "Blog o zdraví a kráse",
  hu: "Egészség- és szépségblog",
  ro: "Blog despre sănătate și frumusețe",
} as const

type AdviceIndexValue = Readonly<{
  articlePublicSlugsById: PublicEntitySlugMap
  listing: CmsBlogListing
  title: string
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
      // Without the URL registry, each post's own CMS slug is its public slug.
      const articlePublicSlugsById: PublicEntitySlugMap = Object.fromEntries(
        listing.posts.map((post) => [post.sourceId, post.slug])
      )
      return foundSource({
        articlePublicSlugsById,
        listing,
        title: BLOG_LISTING_TITLE[market],
      })
    },
    path: { kind: "article" },
    queryKind: "advice-index",
    title: (value) => value.title,
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

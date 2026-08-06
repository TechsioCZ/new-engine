import type { GetServerSideProps } from "next"
import { BlogListingPage } from "@/components/blog/blog-listing-page"
import {
  type IndexPageProps,
  resolveIndexPage,
} from "@/lib/routing/public-page"
import { StatusSurface } from "@/lib/routing/status-surface"
import {
  type BlogTopicKey,
  resolveBlogListing,
} from "@/lib/storefront/blog-content"
import { fetchCmsBlogPosts } from "@/lib/storefront/cms"
import { getHerbatikaMarketContext } from "@/lib/storefront/market-context"

type Listing = ReturnType<typeof resolveBlogListing>
type Props = IndexPageProps<Listing>
const topic = (value: unknown): BlogTopicKey =>
  value === "fitness" || value === "krasa" || value === "zdravie"
    ? value
    : "all"
export const getServerSideProps: GetServerSideProps<Props> = (context) =>
  resolveIndexPage(context, "article", async (market) => {
    const locale = getHerbatikaMarketContext(market).locale
    const posts = await fetchCmsBlogPosts(locale)
    const rawPage = Array.isArray(context.query.strana)
      ? context.query.strana[0]
      : context.query.strana
    const rawTopic = Array.isArray(context.query.tema)
      ? context.query.tema[0]
      : context.query.tema
    return {
      type: "found",
      value: resolveBlogListing({
        page: Number.parseInt(rawPage ?? "1", 10) || 1,
        posts: posts.length ? posts : undefined,
        topic: topic(rawTopic),
      }),
    }
  })
export default function AdviceIndex({ source, status }: Props) {
  if (status) {
    return <StatusSurface status={status} />
  }
  return source ? <BlogListingPage listing={source} /> : null
}

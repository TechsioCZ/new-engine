import type { GetServerSideProps } from "next"
import { BlogDetailPage } from "@/components/blog/blog-detail-page"
import {
  type EntityPageProps,
  resolveEntityPage,
} from "@/lib/routing/public-page"
import { StatusSurface } from "@/lib/routing/status-surface"
import {
  type BlogPost,
  resolveRelatedBlogPosts,
} from "@/lib/storefront/blog-content"
import { fetchCmsBlogPostById, fetchCmsBlogPosts } from "@/lib/storefront/cms"
import { getHerbatikaMarketContext } from "@/lib/storefront/market-context"

type Source = { post: BlogPost; relatedPosts: BlogPost[] }
type Props = EntityPageProps<Source>
export const getServerSideProps: GetServerSideProps<Props> = (context) =>
  resolveEntityPage<Source>(
    context,
    "article",
    async ({ entityId, market }) => {
      const locale = getHerbatikaMarketContext(market).locale
      const post = await fetchCmsBlogPostById(entityId, locale)
      if (!post) {
        return { type: "not-found" }
      }
      const posts = await fetchCmsBlogPosts()
      return {
        type: "found",
        value: {
          post,
          relatedPosts: resolveRelatedBlogPosts(
            post.slug,
            4,
            posts.length > 1 ? posts : undefined
          ),
        },
      }
    }
  )
export default function ArticlePage({ source, status }: Props) {
  if (status) {
    return <StatusSurface status={status} />
  }
  if (!source) {
    return null
  }
  return (
    <BlogDetailPage
      post={source.post}
      recommendedProducts={[]}
      relatedPosts={source.relatedPosts}
      sidebarFeaturedProduct={null}
    />
  )
}

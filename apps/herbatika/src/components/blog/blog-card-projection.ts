import type {
  BlogCardItem,
  BlogListing,
  BlogPost,
} from "@/lib/storefront/blog-content"
import type { PublicEntitySlugMap } from "@/lib/storefront/ssr/public-entity-projection-map"

export type BlogCardItemWithSourceId = BlogCardItem &
  Readonly<{ sourceId: string }>

export type BlogListingWithSourceIds = Omit<BlogListing, "posts"> &
  Readonly<{ posts: BlogCardItemWithSourceId[] }>

export type BlogPostWithSourceIds = Omit<BlogPost, "relatedPosts"> &
  Readonly<{
    relatedPosts: BlogCardItemWithSourceId[]
    sourceId: string
  }>

export const resolveBlogCardPublicSlug = (
  post: BlogCardItemWithSourceId,
  articlePublicSlugsById: PublicEntitySlugMap
): string | undefined => articlePublicSlugsById[post.sourceId]

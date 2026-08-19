import { Badge } from "@techsio/ui-kit/atoms/badge"
import NextImage from "next/image"
import { useLocale } from "next-intl"
import { StorefrontLink } from "@/components/storefront-link"
import type { BlogCardItem } from "@/lib/storefront/blog-content"
import { useMarketContext } from "@/lib/storefront/market-context-provider"
import { buildProjectedEntityPath } from "@/lib/url/link-projections/projected-entity-link"
import { formatBlogDate } from "./blog-formatters"

type BlogRelatedCardProps = {
  post: BlogCardItem
  publicSlug?: string
}

export function BlogRelatedCard({ post, publicSlug }: BlogRelatedCardProps) {
  const locale = useLocale()
  const market = useMarketContext().code
  const articleHref = buildProjectedEntityPath(
    "article",
    { publicSlug },
    market
  )
  const image = (
    <NextImage
      alt={post.title}
      className="aspect-video w-full object-cover"
      height={320}
      loading="lazy"
      quality={50}
      src={post.imageSrc}
      width={520}
    />
  )

  return (
    <article className="min-h-950 overflow-hidden rounded-2xl border border-border-secondary bg-surface">
      {articleHref ? (
        <StorefrontLink className="block" href={articleHref}>
          {image}
        </StorefrontLink>
      ) : (
        <div className="block">{image}</div>
      )}

      <div className="space-y-200 p-300">
        <div className="flex items-center justify-between gap-200">
          <p className="text-2xs text-fg-secondary leading-normal">
            {formatBlogDate(post.publishedAt, locale)}
          </p>
          <Badge
            className="rounded-full px-200 py-100 font-medium text-2xs"
            variant="secondary"
          >
            {post.category.title}
          </Badge>
        </div>

        {articleHref ? (
          <StorefrontLink
            className="line-clamp-2 font-bold text-fg-primary text-lg leading-snug hover:text-primary"
            href={articleHref}
          >
            {post.title}
          </StorefrontLink>
        ) : (
          <h3 className="line-clamp-2 font-bold text-fg-primary text-lg leading-snug">
            {post.title}
          </h3>
        )}

        <p className="line-clamp-3 text-fg-secondary text-xs leading-relaxed">
          {post.excerpt}
        </p>
      </div>
    </article>
  )
}

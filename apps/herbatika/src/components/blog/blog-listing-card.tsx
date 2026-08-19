import { Badge } from "@techsio/ui-kit/atoms/badge"
import NextImage from "next/image"
import { useLocale, useTranslations } from "next-intl"
import { StorefrontLink } from "@/components/storefront-link"
import type { BlogCardItem } from "@/lib/storefront/blog-content"
import { useMarketContext } from "@/lib/storefront/market-context-provider"
import { buildProjectedEntityPath } from "@/lib/url/link-projections/projected-entity-link"
import { formatBlogDate } from "./blog-formatters"

type BlogListingCardProps = {
  post: BlogCardItem
  publicSlug?: string
}

export function BlogListingCard({ post, publicSlug }: BlogListingCardProps) {
  const locale = useLocale()
  const tContent = useTranslations("content")
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
      height={360}
      loading="lazy"
      quality={50}
      src={post.imageSrc}
      width={640}
    />
  )

  return (
    <article className="flex h-full min-h-950 flex-col overflow-hidden rounded-2xl border border-border-secondary bg-surface">
      {articleHref ? (
        <StorefrontLink className="block" href={articleHref}>
          {image}
        </StorefrontLink>
      ) : (
        <div className="block">{image}</div>
      )}

      <div className="flex h-full flex-col gap-200 p-300">
        <div className="flex items-center justify-between gap-200">
          <p className="text-2xs text-fg-secondary leading-normal">
            {formatBlogDate(post.publishedAt, locale)}
          </p>
          <Badge
            className="font-normal text-xs leading-[15px]"
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

        <p className="line-clamp-3 font-verdana text-fg-secondary text-xs leading-relaxed">
          {post.excerpt}
        </p>

        <div className="mt-auto flex items-center justify-between gap-300">
          {articleHref ? (
            <StorefrontLink
              className="font-semibold text-fg-primary text-xs leading-normal underline underline-offset-2 hover:text-primary"
              href={articleHref}
            >
              {tContent("blog.card.open_article")} →
            </StorefrontLink>
          ) : null}
          <span className="text-2xs text-fg-secondary leading-normal">
            {post.readingTime}
          </span>
        </div>
      </div>
    </article>
  )
}

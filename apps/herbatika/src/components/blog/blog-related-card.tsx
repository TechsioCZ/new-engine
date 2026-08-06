import { Badge } from "@techsio/ui-kit/atoms/badge"
import { Link } from "@techsio/ui-kit/atoms/link"
import NextImage from "next/image"
import { StorefrontLink } from "@/components/storefront-link"
import { buildUrl } from "@/lib/url/builder"
import { useMarketContext } from "@/lib/storefront/market-context-provider"
import { useLocale } from "next-intl"
import type { BlogPost } from "@/lib/storefront/blog-content"
import { formatBlogDate, formatTopicFromKey } from "./blog-formatters"

type BlogRelatedCardProps = {
  post: BlogPost
}

export function BlogRelatedCard({ post }: BlogRelatedCardProps) {
  const locale = useLocale()

  const market = useMarketContext().code
  const articleHref = buildUrl({ market, kind: "article", slug: post.slug })

  return (
    <article className="min-h-950 overflow-hidden rounded-2xl border border-border-secondary bg-surface">
      <Link as={StorefrontLink} className="block" href={articleHref}>
        <NextImage
          alt={post.title}
          className="aspect-video w-full object-cover"
          height={320}
          loading="lazy"
          quality={50}
          src={post.imageSrc}
          width={520}
        />
      </Link>

      <div className="space-y-200 p-300">
        <div className="flex items-center justify-between gap-200">
          <p className="text-2xs text-fg-secondary leading-normal">
            {formatBlogDate(post.publishedAt, locale)}
          </p>
          <Badge
            className="rounded-full px-200 py-100 font-medium text-2xs"
            variant="secondary"
          >
            {formatTopicFromKey(post.topic)}
          </Badge>
        </div>

        <Link
          as={StorefrontLink}
          className="line-clamp-2 font-bold text-fg-primary text-lg leading-snug hover:text-primary"
          href={articleHref}
        >
          {post.title}
        </Link>

        <p className="line-clamp-3 text-fg-secondary text-xs leading-relaxed">
          {post.excerpt}
        </p>
      </div>
    </article>
  )
}

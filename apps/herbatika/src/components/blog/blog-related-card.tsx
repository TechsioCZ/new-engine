import { Badge } from "@techsio/ui-kit/atoms/badge"
import { Link } from "@techsio/ui-kit/atoms/link"
import NextImage from "next/image"
import NextLink from "next/link"
import type { BlogPost } from "@/lib/storefront/blog-content"
import { formatBlogDate, formatTopicFromKey } from "./blog-formatters"

type BlogRelatedCardProps = {
  post: BlogPost
}

export function BlogRelatedCard({ post }: BlogRelatedCardProps) {
  return (
    <article className="min-h-950 overflow-hidden rounded-2xl border border-border-secondary bg-surface">
      <Link as={NextLink} className="block" href={`/blog/${post.slug}`}>
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
            {formatBlogDate(post.publishedAt)}
          </p>
          <Badge
            className="rounded-full px-200 py-100 font-medium text-2xs"
            variant="secondary"
          >
            {formatTopicFromKey(post.topic)}
          </Badge>
        </div>

        <Link
          as={NextLink}
          className="line-clamp-2 font-bold text-fg-primary text-lg leading-snug hover:text-primary"
          href={`/blog/${post.slug}`}
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

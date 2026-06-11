import { Badge } from "@techsio/ui-kit/atoms/badge"
import NextImage from "next/image"
import NextLink from "next/link"
import type { BlogPost } from "@/lib/storefront/blog-content"
import { formatBlogDate, formatTopicFromKey } from "./blog-formatters"

type BlogListingCardProps = {
  post: BlogPost
}

export function BlogListingCard({ post }: BlogListingCardProps) {
  return (
    <article className="flex h-full min-h-950 flex-col overflow-hidden rounded-2xl border border-border-secondary bg-surface">
      <NextLink className="block" href={`/blog/${post.slug}`}>
        <NextImage
          alt={post.title}
          className="aspect-video w-full object-cover"
          height={360}
          loading="lazy"
          quality={50}
          src={post.imageSrc}
          width={640}
        />
      </NextLink>

      <div className="flex h-full flex-col gap-200 p-300">
        <div className="flex items-center justify-between gap-200">
          <p className="text-2xs text-fg-secondary leading-normal">
            {formatBlogDate(post.publishedAt)}
          </p>
          <Badge
            className="font-normal text-xs leading-[15px]"
            variant="secondary"
          >
            {formatTopicFromKey(post.topic)}
          </Badge>
        </div>

        <NextLink
          className="line-clamp-2 font-bold text-fg-primary text-lg leading-snug hover:text-primary"
          href={`/blog/${post.slug}`}
        >
          {post.title}
        </NextLink>

        <p className="line-clamp-3 font-verdana text-fg-secondary text-xs leading-relaxed">
          {post.excerpt}
        </p>

        <div className="mt-auto flex items-center justify-between gap-300">
          <NextLink
            className="font-semibold text-fg-primary text-xs leading-normal underline underline-offset-2 hover:text-primary"
            href={`/blog/${post.slug}`}
          >
            Prejsť na článok →
          </NextLink>
          <span className="text-2xs text-fg-secondary leading-normal">
            {post.readingTime}
          </span>
        </div>
      </div>
    </article>
  )
}

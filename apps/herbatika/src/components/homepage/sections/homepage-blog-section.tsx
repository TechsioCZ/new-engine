import { Badge } from "@techsio/ui-kit/atoms/badge"
import { Link } from "@techsio/ui-kit/atoms/link"
import NextImage from "next/image"
import NextLink from "next/link"
import {
  formatBlogDate,
  formatTopicFromKey,
} from "@/components/blog/blog-formatters"
import type { BlogTeaserItem } from "@/components/homepage/homepage.data"

type HomepageBlogSectionProps = {
  posts: BlogTeaserItem[]
}

export function HomepageBlogSection({ posts }: HomepageBlogSectionProps) {
  return (
    <section className="space-y-400" id="blog">
      <h2 className="font-bold text-3xl text-fg-primary leading-tight">
        Blog o zdraví a kráse
      </h2>

      <div className="grid grid-cols-1 gap-400 lg:grid-cols-3">
        {posts.map((post) => (
          <article
            className="flex h-full flex-col overflow-hidden rounded-2xl border border-border-secondary bg-surface"
            key={post.id}
          >
            <Link as={NextLink} className="block" href={post.href}>
              <NextImage
                alt={post.title}
                className="aspect-video w-full object-cover"
                height={360}
                quality={50}
                src={post.imageSrc}
                width={640}
              />
            </Link>

            <div className="flex h-full flex-col gap-200 p-300">
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

              <h3 className="line-clamp-2 font-bold text-fg-primary text-lg leading-snug">
                <Link
                  as={NextLink}
                  className="hover:text-primary"
                  href={post.href}
                >
                  {post.title}
                </Link>
              </h3>

              <p className="line-clamp-3 text-fg-secondary text-xs leading-relaxed">
                {post.excerpt}
              </p>

              <div className="mt-auto flex items-center justify-between gap-300">
                <Link
                  as={NextLink}
                  className="font-semibold text-fg-primary text-xs leading-normal underline underline-offset-2 hover:text-primary"
                  href={post.href}
                >
                  Prejsť na článok
                </Link>
                <span className="text-2xs text-fg-secondary leading-normal">
                  {post.readingTime}
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

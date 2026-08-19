import { Badge } from "@techsio/ui-kit/atoms/badge"
import NextImage from "next/image"
import { useLocale, useTranslations } from "next-intl"
import {
  type BlogCardItemWithSourceId,
  resolveBlogCardPublicSlug,
} from "@/components/blog/blog-card-projection"
import { formatBlogDate } from "@/components/blog/blog-formatters"
import { StorefrontLink } from "@/components/storefront-link"
import { useMarketContext } from "@/lib/storefront/market-context-provider"
import type { PublicEntitySlugMap } from "@/lib/storefront/ssr/public-entity-projection-map"
import { buildProjectedEntityPath } from "@/lib/url/link-projections/projected-entity-link"

type HomepageBlogSectionProps = {
  articlePublicSlugsById: PublicEntitySlugMap
  posts: BlogCardItemWithSourceId[]
}

export function HomepageBlogSection({
  articlePublicSlugsById,
  posts,
}: HomepageBlogSectionProps) {
  const locale = useLocale()
  const tContent = useTranslations("content")
  const market = useMarketContext().code

  if (posts.length === 0) {
    return null
  }

  return (
    <section className="space-y-400" id="blog">
      <h2 className="font-bold text-3xl text-fg-primary leading-tight">
        {tContent("home.blog.title")}
      </h2>

      <div className="grid grid-cols-1 gap-400 lg:grid-cols-3">
        {posts.map((post) => {
          const articleHref = buildProjectedEntityPath(
            "article",
            {
              publicSlug: resolveBlogCardPublicSlug(
                post,
                articlePublicSlugsById
              ),
            },
            market
          )
          const image = (
            <NextImage
              alt={post.title}
              className="aspect-video w-full object-cover"
              height={360}
              quality={50}
              src={post.imageSrc}
              width={640}
            />
          )

          return (
            <article
              className="flex h-full flex-col overflow-hidden rounded-2xl border border-border-secondary bg-surface"
              key={post.id}
            >
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
                    className="rounded-full px-200 py-100 font-medium text-2xs"
                    variant="secondary"
                  >
                    {post.category.title}
                  </Badge>
                </div>

                <h3 className="line-clamp-2 font-bold text-fg-primary text-lg leading-snug">
                  {articleHref ? (
                    <StorefrontLink
                      className="hover:text-primary"
                      href={articleHref}
                    >
                      {post.title}
                    </StorefrontLink>
                  ) : (
                    post.title
                  )}
                </h3>

                <p className="line-clamp-3 text-fg-secondary text-xs leading-relaxed">
                  {post.excerpt}
                </p>

                <div className="mt-auto flex items-center justify-between gap-300">
                  {articleHref ? (
                    <StorefrontLink
                      className="font-semibold text-fg-primary text-xs leading-normal underline underline-offset-2 hover:text-primary"
                      href={articleHref}
                    >
                      {tContent("blog.card.open_article")}
                    </StorefrontLink>
                  ) : null}
                  <span className="text-2xs text-fg-secondary leading-normal">
                    {post.readingTime}
                  </span>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

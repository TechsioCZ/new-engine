import type { HttpTypes } from "@medusajs/types"
import NextImage from "next/image"
import { useLocale, useTranslations } from "next-intl"
import {
  HerbatikaBreadcrumb,
  type HerbatikaBreadcrumbItem,
} from "@/components/herbatika-breadcrumb"
import { StorefrontLink } from "@/components/storefront-link"
import { resolveBlogProductReference } from "@/lib/storefront/blog-product-references"
import { useMarketContext } from "@/lib/storefront/market-context-provider"
import type { PublicEntitySlugMap } from "@/lib/storefront/ssr/public-entity-projection-map"
import { buildPath } from "@/lib/url/public-url"
import { BlogArticleContent } from "./blog-article-content"
import { BlogArticleSidebar } from "./blog-article-sidebar"
import { BlogAuthorCard } from "./blog-author-card"
import {
  type BlogPostWithSourceIds,
  resolveBlogCardPublicSlug,
} from "./blog-card-projection"
import { formatBlogDate } from "./blog-formatters"
import { BlogRelatedCard } from "./blog-related-card"
import { BlogTableOfContents } from "./blog-table-of-contents"

type BlogDetailPageProps = {
  articlePublicSlugsById: PublicEntitySlugMap
  post: BlogPostWithSourceIds
  productEntries: [string, HttpTypes.StoreProduct][]
  productPublicSlugsById: PublicEntitySlugMap
}

export function BlogDetailPage({
  articlePublicSlugsById,
  post,
  productEntries,
  productPublicSlugsById,
}: BlogDetailPageProps) {
  const tContent = useTranslations("content")
  const market = useMarketContext().code
  const adviceHref = buildPath({ kind: "article" }, market)
  const products = new Map(productEntries)
  const sidebarProduct = post.sidebar?.product
    ? resolveBlogProductReference(post.sidebar.product, products)
    : undefined
  const hasSidebar = Boolean(post.sidebar?.promoImage || sidebarProduct)
  const breadcrumbItems: HerbatikaBreadcrumbItem[] = [
    {
      label: tContent("pages.blog"),
      href: adviceHref,
      icon: "token-icon-home",
    },
    {
      label: post.title,
    },
  ]

  return (
    <main className="w-full bg-base font-rubik">
      <div className="mx-auto flex w-full max-w-max-w flex-col gap-blog-detail-page-gap p-blog-detail-page 2xl:p-blog-detail-page-lg">
        <HerbatikaBreadcrumb items={breadcrumbItems} />

        <div
          className={
            hasSidebar
              ? "grid gap-blog-detail-columns-gap xl:grid-cols-[minmax(0,1fr)_var(--width-blog-sidebar)]"
              : "grid"
          }
        >
          <div className="min-w-0 space-y-400">
            <section className="space-y-300 rounded-2xl border border-border-secondary bg-surface p-400 max-xs:pb-100">
              <div className="flex flex-wrap gap-150">
                {post.tags.map((tag) => (
                  <span
                    className="inline-flex items-center rounded-xs bg-highlight px-200 py-100 text-primary text-xs leading-[15px]"
                    key={tag}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <h1 className="font-bold text-4xl text-fg-primary leading-tight">
                {post.title}
              </h1>

              <NextImage
                alt={post.title}
                className="inline-block xs:hidden aspect-product-detail-image w-full rounded-2xl object-cover"
                height={620}
                quality={50}
                src={post.imageSrc}
                width={1200}
              />

              <div className="hidden space-y-300 md:block">
                <BlogPostIntro post={post} />
              </div>
            </section>

            <section className="xs:block hidden overflow-hidden rounded-2xl border border-border-secondary bg-surface">
              <NextImage
                alt={post.title}
                className="aspect-product-detail-image w-full object-cover"
                height={620}
                quality={50}
                src={post.imageSrc}
                width={1200}
              />
            </section>

            <section className="space-y-300 rounded-2xl border border-border-secondary bg-surface p-400 md:hidden">
              <BlogPostIntro post={post} />
            </section>

            <BlogTableOfContents
              chapterCount={tContent("blog.detail.chapter_count", {
                count: post.tableOfContents.length,
              })}
              items={post.tableOfContents}
              title={tContent("blog.detail.table_of_contents")}
            />

            <BlogArticleContent
              post={post}
              productPublicSlugsById={productPublicSlugsById}
              products={products}
            />

            <BlogAuthorCard post={post} />

            {post.relatedPosts.length > 0 ? (
              <section className="space-y-350">
                <div className="flex flex-wrap items-center justify-between gap-300">
                  <h2 className="font-bold text-3xl text-fg-primary leading-tight">
                    {tContent("blog.detail.related_articles")}
                  </h2>

                  <StorefrontLink
                    className="font-medium text-fg-primary text-md leading-tight underline underline-offset-2 hover:text-primary"
                    href={adviceHref}
                  >
                    {tContent("actions.view_all")} →
                  </StorefrontLink>
                </div>

                <div className="grid gap-400 md:grid-cols-2 xl:grid-cols-4">
                  {post.relatedPosts.map((relatedPost) => (
                    <BlogRelatedCard
                      key={relatedPost.id}
                      post={relatedPost}
                      publicSlug={resolveBlogCardPublicSlug(
                        relatedPost,
                        articlePublicSlugsById
                      )}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          {hasSidebar && post.sidebar ? (
            <div>
              <BlogArticleSidebar
                product={sidebarProduct}
                productPublicSlugsById={productPublicSlugsById}
                sidebar={post.sidebar}
              />
            </div>
          ) : null}
        </div>
      </div>
    </main>
  )
}

function BlogPostIntro({ post }: { post: BlogPostWithSourceIds }) {
  const locale = useLocale()
  const tContent = useTranslations("content")

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-500 gap-y-150 text-fg-secondary text-sm leading-normal">
        {post.author ? (
          <p>
            <strong className="font-semibold text-fg-primary">
              {tContent("blog.detail.author")}
            </strong>{" "}
            {post.author.name}
          </p>
        ) : null}
        <p>
          <strong className="font-semibold text-fg-primary">
            {tContent("blog.detail.published")}
          </strong>{" "}
          {formatBlogDate(post.publishedAt, locale)}
        </p>
        <p>
          <strong className="font-semibold text-fg-primary">
            {tContent("blog.detail.reading_time")}
          </strong>{" "}
          {post.readingTime}
        </p>
      </div>

      <p className="text-fg-primary text-md leading-relaxed">{post.lead}</p>
    </>
  )
}

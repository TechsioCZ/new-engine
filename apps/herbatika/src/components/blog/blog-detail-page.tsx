import { Link } from "@techsio/ui-kit/atoms/link"
import NextImage from "next/image"
import NextLink from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { getTranslations } from "next-intl/server"
import {
  HerbatikaBreadcrumb,
  type HerbatikaBreadcrumbItem,
} from "@/components/herbatika-breadcrumb"
import type { BlogPost } from "@/lib/storefront/blog-content"
import { resolveBlogProductReference } from "@/lib/storefront/blog-product-references"
import { resolveBlogProducts } from "@/lib/storefront/blog-products.server"
import { BlogArticleContent } from "./blog-article-content"
import { BlogArticleSidebar } from "./blog-article-sidebar"
import { BlogAuthorCard } from "./blog-author-card"
import { formatBlogDate } from "./blog-formatters"
import { BlogRelatedCard } from "./blog-related-card"
import { BlogTableOfContents } from "./blog-table-of-contents"

type BlogDetailPageProps = {
  post: BlogPost
}

export async function BlogDetailPage({ post }: BlogDetailPageProps) {
  const tContent = await getTranslations("content")
  const productReferences = post.contentSegments.flatMap((segment) =>
    segment.type === "productCarousel" ? segment.products : []
  )
  if (post.sidebar?.product) {
    productReferences.push(post.sidebar.product)
  }
  const products = await resolveBlogProducts(productReferences)
  const sidebarProduct = post.sidebar?.product
    ? resolveBlogProductReference(post.sidebar.product, products)
    : undefined
  const hasSidebar = Boolean(post.sidebar?.promoImage || sidebarProduct)
  const breadcrumbItems: HerbatikaBreadcrumbItem[] = [
    {
      label: tContent("pages.blog"),
      href: "/blog",
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

            <BlogArticleContent post={post} products={products} />

            <BlogAuthorCard post={post} />

            {post.relatedPosts.length > 0 ? (
              <section className="space-y-350">
                <div className="flex flex-wrap items-center justify-between gap-300">
                  <h2 className="font-bold text-3xl text-fg-primary leading-tight">
                    {tContent("blog.detail.related_articles")}
                  </h2>

                  <Link
                    as={NextLink}
                    className="font-medium text-fg-primary text-md leading-tight underline underline-offset-2 hover:text-primary"
                    href="/blog"
                  >
                    {tContent("actions.view_all")} →
                  </Link>
                </div>

                <div className="grid gap-400 md:grid-cols-2 xl:grid-cols-4">
                  {post.relatedPosts.map((relatedPost) => (
                    <BlogRelatedCard key={relatedPost.id} post={relatedPost} />
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          {hasSidebar && post.sidebar ? (
            <div>
              <BlogArticleSidebar
                product={sidebarProduct}
                sidebar={post.sidebar}
              />
            </div>
          ) : null}
        </div>
      </div>
    </main>
  )
}

function BlogPostIntro({ post }: { post: BlogPost }) {
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

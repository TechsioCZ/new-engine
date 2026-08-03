import type { HttpTypes } from "@medusajs/types"
import { Link } from "@techsio/ui-kit/atoms/link"
import NextImage from "next/image"

import NextLink from "@/components/app-link"
import {
  HerbatikaBreadcrumb,
  type HerbatikaBreadcrumbItem,
} from "@/components/herbatika-breadcrumb"
import type { BlogPost } from "@/lib/storefront/blog-content"

import { BlogArticleSidebar } from "./blog-article-sidebar"
import { BlogAuthorCard } from "./blog-author-card"
import {
  BlogArticleContent,
  BlogProductHighlights,
  BlogTableOfContents,
} from "./blog-detail-content"
import { formatBlogDate } from "./blog-formatters"
import { BlogRelatedCard } from "./blog-related-card"

type BlogDetailPageProps = {
  post: BlogPost
  recommendedProducts: HttpTypes.StoreProduct[]
  relatedPosts: BlogPost[]
  sidebarFeaturedProduct: HttpTypes.StoreProduct | null
}

export function BlogDetailPage({
  post,
  recommendedProducts,
  relatedPosts,
  sidebarFeaturedProduct,
}: BlogDetailPageProps) {
  const breadcrumbItems: HerbatikaBreadcrumbItem[] = [
    {
      label: "Blog",
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

        <div className="grid gap-blog-detail-columns-gap xl:blog-detail-layout">
          <div className="space-y-400">
            <section className="space-y-300 rounded-2xl border border-border-secondary bg-surface p-400 max-xs:pb-100">
              <div className="flex flex-wrap gap-150">
                {post.tags.map((tag) => (
                  <span
                    className="inline-flex items-center rounded-xs bg-highlight px-200 py-100 text-primary text-xs blog-leading-compact"
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

            <section className="xs:inline-block hidden overflow-hidden rounded-2xl border border-border-secondary bg-surface">
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

            <BlogTableOfContents post={post} />

            <BlogArticleContent post={post} />

            <BlogProductHighlights post={post} products={recommendedProducts} />

            <BlogAuthorCard post={post} />

            <section className="space-y-350">
              <div className="flex flex-wrap items-center justify-between gap-300">
                <h2 className="font-bold text-3xl text-fg-primary leading-tight">
                  Ďalšie články
                </h2>

                <Link
                  as={NextLink}
                  className="font-medium text-fg-primary text-md leading-tight underline underline-offset-2 hover:text-primary"
                  href="/blog"
                >
                  Zobraziť všetky →
                </Link>
              </div>

              <div className="grid gap-400 md:grid-cols-2 xl:grid-cols-4">
                {relatedPosts.map((relatedPost) => (
                  <BlogRelatedCard key={relatedPost.id} post={relatedPost} />
                ))}
              </div>
            </section>
          </div>

          <div>
            <BlogArticleSidebar featuredProduct={sidebarFeaturedProduct} />
          </div>
        </div>
      </div>
    </main>
  )
}

function BlogPostIntro({ post }: { post: BlogPost }) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-500 gap-y-150 text-fg-secondary text-sm leading-normal">
        <p>
          <strong className="font-semibold text-fg-primary">Autor:</strong>{" "}
          {post.author}
        </p>
        <p>
          <strong className="font-semibold text-fg-primary">
            Publikované:
          </strong>{" "}
          {formatBlogDate(post.publishedAt)}
        </p>
        <p>
          <strong className="font-semibold text-fg-primary">
            Čas čítania:
          </strong>{" "}
          {post.readingTime}
        </p>
      </div>

      <p className="text-fg-primary text-md leading-relaxed">{post.lead}</p>
    </>
  )
}

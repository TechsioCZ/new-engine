import type { HttpTypes } from "@medusajs/types";
import { Icon } from "@techsio/ui-kit/atoms/icon";
import { Link } from "@techsio/ui-kit/atoms/link";
import NextImage from "next/image";
import NextLink from "next/link";
import { CategoryRichText } from "@/components/category/category-rich-text";
import {
  HerbatikaBreadcrumb,
  type HerbatikaBreadcrumbItem,
} from "@/components/herbatika-breadcrumb";
import { routes } from "@/lib/routes";
import type { BlogPost } from "@/lib/storefront/blog-content";
import { BlogArticleSidebar } from "./blog-article-sidebar";
import { BlogAuthorCard } from "./blog-author-card";
import { formatBlogDate } from "./blog-formatters";
import { BlogRelatedCard } from "./blog-related-card";
import { InlineProductsCarousel } from "./inline-products-carousel";

type BlogDetailPageProps = {
  post: BlogPost;
  recommendedProducts: HttpTypes.StoreProduct[];
  relatedPosts: BlogPost[];
  sidebarFeaturedProduct: HttpTypes.StoreProduct | null;
};

export function BlogDetailPage({
  post,
  recommendedProducts,
  relatedPosts,
  sidebarFeaturedProduct,
}: BlogDetailPageProps) {
  const breadcrumbItems: HerbatikaBreadcrumbItem[] = [
    {
      label: "Blog",
      href: routes.blog.index,
      icon: "token-icon-home",
    },
    {
      label: post.title,
    },
  ];
  const hasStructuredSections = post.sections.length > 0;
  const hasHighlights = post.bulletPoints.length > 0;

  return (
    <main className="w-full bg-base font-rubik">
      <div className="mx-auto flex w-full max-w-max-w flex-col gap-blog-detail-page-gap p-blog-detail-page 2xl:p-blog-detail-page-lg">
        <HerbatikaBreadcrumb items={breadcrumbItems} />

        <div className="grid gap-blog-detail-columns-gap xl:grid-cols-[minmax(0,1fr)_342px]">
          <div className="space-y-400">
            <section className="space-y-300 rounded-2xl border border-border-secondary bg-surface max-xs:pb-100 p-400">
              <div className="flex flex-wrap gap-150">
                {post.tags.map((tag) => (
                  <span
                    className="inline-flex items-center rounded-xs bg-highlight px-200 py-100 text-xs leading-[15px] text-primary"
                    key={tag}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <h1 className="text-4xl leading-tight font-bold text-fg-primary">
                {post.title}
              </h1>

              <NextImage
                alt={post.title}
                className="inline-block xs:hidden aspect-product-detail-image w-full object-cover rounded-2xl"
                height={620}
                src={post.imageSrc}
                width={1200}
                quality={50}
              />

              <div className="hidden space-y-300 md:block">
                <BlogPostIntro post={post} />
              </div>
            </section>

            <section className="hidden xs:inline-block overflow-hidden rounded-2xl border border-border-secondary bg-surface">
              <NextImage
                alt={post.title}
                className="aspect-product-detail-image w-full object-cover"
                height={620}
                src={post.imageSrc}
                width={1200}
                quality={50}
              />
            </section>

            <section className="space-y-300 rounded-2xl border border-border-secondary bg-surface p-400 md:hidden">
              <BlogPostIntro post={post} />
            </section>

            {hasStructuredSections ? (
              <details
                className="group space-y-350 rounded-2xl border border-border-secondary bg-surface p-400"
                open
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-300 [&::-webkit-details-marker]:hidden">
                  <div className="flex items-center gap-250">
                    <span className="inline-flex p-50 items-center justify-center rounded-xs bg-highlight text-primary">
                      <Icon icon="token-icon-list" size="2xl" />
                    </span>
                    <div>
                      <h2 className="text-xl leading-tight font-bold text-fg-primary">
                        Obsah článku
                      </h2>
                      <p className="text-sm leading-normal text-fg-secondary">
                        {`${post.sections.length} kapitol`}
                      </p>
                    </div>
                  </div>
                  <Icon
                    className="rotate-180 text-fg-secondary transition-transform group-open:rotate-0"
                    icon="token-icon-chevron-up"
                    size="2xl"
                  />
                </summary>

                <ul className="space-y-100 pl-500">
                  {post.sections.map((section) => (
                    <li
                      className="list-inside list-disc marker:text-lg text-sm leading-relaxed text-fg-secondary marker:text-fg-disabled"
                      key={section.title}
                    >
                      {section.title}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}

            <article className="space-y-500 rounded-2xl border border-border-secondary bg-surface p-400 md:p-500">
              {post.contentHtml ? (
                <CategoryRichText
                  className="text-md [&_p+p]:mt-300"
                  html={post.contentHtml}
                />
              ) : (
                post.sections.map((section) => (
                  <section className="space-y-250" key={section.title}>
                    <h2 className="text-xl leading-tight text-fg-primary">
                      {section.title}
                    </h2>

                    {section.paragraphs.map((paragraph) => (
                      <p
                        className="text-md leading-relaxed text-fg-primary"
                        key={paragraph}
                      >
                        {paragraph}
                      </p>
                    ))}

                    {section.bulletPoints ? (
                      <ul className="space-y-100 pl-350">
                        {section.bulletPoints.map((item) => (
                          <li
                            className="list-disc text-md leading-relaxed text-fg-primary marker:text-primary"
                            key={item}
                          >
                            {item}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </section>
                ))
              )}
            </article>

            {recommendedProducts.length > 0 || hasHighlights ? (
              <section className="space-y-300">
                {recommendedProducts.length > 0 ? (
                  <InlineProductsCarousel
                    products={recommendedProducts}
                    slidesLg={3}
                  />
                ) : null}
                {hasHighlights ? (
                  <ul className="space-y-0 rounded-2xl bg-surface p-400">
                    {post.bulletPoints.map((item) => (
                      <li
                        className="grid grid-cols-[6px_minmax(0,1fr)] gap-100 py-[1px]"
                        key={item}
                      >
                        <span
                          aria-hidden="true"
                          className="mt-150 h-[6px] w-[6px] rounded-full bg-primary"
                        />
                        <span className="text-md leading-[1.5] text-fg-primary">
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ) : null}

            <BlogAuthorCard post={post} />

            <section className="space-y-350">
              <div className="flex flex-wrap items-center justify-between gap-300">
                <h2 className="text-3xl leading-tight font-bold text-fg-primary">
                  Ďalšie články
                </h2>

                <Link
                  as={NextLink}
                  className="text-md leading-tight font-medium text-fg-primary underline underline-offset-2 hover:text-primary"
                  href={routes.blog.index}
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
  );
}

function BlogPostIntro({ post }: { post: BlogPost }) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-500 gap-y-150 text-sm leading-normal text-fg-secondary">
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

      <p className="text-md leading-relaxed text-fg-primary">{post.lead}</p>
    </>
  );
}

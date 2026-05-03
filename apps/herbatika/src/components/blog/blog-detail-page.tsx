import type { HttpTypes } from "@medusajs/types";
import { Icon } from "@techsio/ui-kit/atoms/icon";
import { Link } from "@techsio/ui-kit/atoms/link";
import NextLink from "next/link";
import NextImage from "next/image";
import {
  HerbatikaBreadcrumb,
  type HerbatikaBreadcrumbItem,
} from "@/components/herbatika-breadcrumb";
import type { BlogPost } from "@/lib/storefront/blog-content";
import { BlogArticleSidebar } from "./blog-article-sidebar";
import { BlogAuthorCard } from "./blog-author-card";
import { formatBlogDate } from "./blog-formatters";
import { InlineProductsCarousel } from "./inline-products-carousel";
import { BlogRelatedCard } from "./blog-related-card";

type BlogDetailPageProps = {
  post: BlogPost;
  recommendedProducts: HttpTypes.StoreProduct[];
  relatedPosts: BlogPost[];
};

export function BlogDetailPage({
  post,
  recommendedProducts,
  relatedPosts,
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
  ];

  return (
    <main className="w-full bg-base font-rubik">
      <div className="mx-auto flex w-full max-w-max-w flex-col gap-blog-detail-page-gap p-blog-detail-page 2xl:p-blog-detail-page-lg">
        <HerbatikaBreadcrumb items={breadcrumbItems} />

        <div className="grid gap-blog-detail-columns-gap xl:grid-cols-12">
          <div className="space-y-400 xl:col-span-9">
            <section className="space-y-300 rounded-2xl border border-border-secondary bg-surface p-400">
              <div className="flex flex-wrap gap-150">
                {post.tags.map((tag) => (
                  <span
                    className="inline-flex items-center rounded-md bg-highlight px-250 py-100 text-xs leading-normal font-medium text-primary"
                    key={tag}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <h1 className="text-4xl leading-tight font-bold text-fg-primary">
                {post.title}
              </h1>

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
            </section>

            <section className="overflow-hidden rounded-2xl border border-border-secondary bg-surface">
              <NextImage
                alt={post.title}
                className="aspect-wide w-full object-cover"
                height={620}
                src={post.imageSrc}
                width={1200}
                quality={50}
              />
            </section>

            <section className="space-y-350 rounded-2xl border border-border-secondary bg-surface p-400">
              <header className="flex items-start justify-between gap-300">
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
                <Icon className="text-fg-secondary" icon="token-icon-chevron-up" size="2xl" />
              </header>

              <ul className="space-y-100 pl-350">
                {post.sections.map((section) => (
                  <li
                    className="list-disc text-sm leading-relaxed text-fg-secondary marker:text-fg-disabled"
                    key={section.title}
                  >
                    {section.title}
                  </li>
                ))}
              </ul>
            </section>

            <article className="space-y-500 rounded-2xl border border-border-secondary bg-surface p-400 md:p-500">
              {post.sections.map((section) => (
                <section className="space-y-250" key={section.title}>
                  <h2 className="text-xl leading-tight text-fg-primary">
                    {section.title}
                  </h2>

                  {section.paragraphs.map((paragraph) => (
                    <p className="text-md leading-relaxed text-fg-primary" key={paragraph}>
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
              ))}
            </article>

            <section className="space-y-300">
              {recommendedProducts.length > 0 ? (
                <InlineProductsCarousel products={recommendedProducts} />
              ) : null}
              <ul className="space-y-0 rounded-2xl bg-surface p-400">
                {post.bulletPoints.map((item) => (
                  <li className="grid grid-cols-[6px_minmax(0,1fr)] gap-100 py-[1px]" key={item}>
                    <span
                      aria-hidden="true"
                      className="mt-150 h-[6px] w-[6px] rounded-full bg-primary"
                    />
                    <span className="text-md leading-[1.5] text-fg-primary">{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <BlogAuthorCard post={post} />

            <section className="space-y-350">
              <div className="flex flex-wrap items-center justify-between gap-300">
                <h2 className="text-3xl leading-tight font-bold text-fg-primary">
                  Ďalšie články
                </h2>

                <Link
                  as={NextLink}
                  className="text-md leading-tight font-medium text-fg-primary underline underline-offset-2 hover:text-primary"
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

          <div className="xl:col-span-3">
            <BlogArticleSidebar />
          </div>
        </div>
      </div>
    </main>
  );
}

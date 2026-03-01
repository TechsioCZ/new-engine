import { Icon } from "@techsio/ui-kit/atoms/icon";
import type { IconType } from "@techsio/ui-kit/atoms/icon";
import { Image } from "@techsio/ui-kit/atoms/image";
import { Link } from "@techsio/ui-kit/atoms/link";
import { Breadcrumb } from "@techsio/ui-kit/molecules/breadcrumb";
import NextLink from "next/link";
import type { BlogPost } from "@/lib/storefront/blog-content";
import { BLOG_INLINE_PRODUCTS } from "@/lib/storefront/blog-content";
import { BlogArticleSidebar } from "./blog-article-sidebar";
import { BlogAuthorCard } from "./blog-author-card";
import { formatBlogDate } from "./blog-formatters";
import { BlogInlineProductCard } from "./blog-inline-product-card";
import { BlogRelatedCard } from "./blog-related-card";

type BlogDetailPageProps = {
  post: BlogPost;
  relatedPosts: BlogPost[];
};

export function BlogDetailPage({ post, relatedPosts }: BlogDetailPageProps) {
  const breadcrumbItems: Array<{
    label: string;
    href?: string;
    icon?: IconType;
  }> = [
    {
      label: "Blog",
      href: "/blog",
      icon: "icon-[mdi--home-outline]",
    },
    {
      label: post.title,
    },
  ];

  return (
    <main className="w-full bg-base font-rubik">
      <div className="mx-auto flex w-full max-w-max-w flex-col gap-550 px-550 pt-550 pb-700">
        <Breadcrumb items={breadcrumbItems} linkAs={NextLink} size="md" />

        <div className="grid gap-500 xl:grid-cols-12">
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
              <Image
                alt={post.title}
                className="blog-detail-hero-image w-full object-cover"
                height={620}
                src={post.imageSrc}
                width={1200}
              />
            </section>

            <section className="space-y-350 rounded-2xl border border-border-secondary bg-surface p-400">
              <header className="flex items-start justify-between gap-300">
                <div className="flex items-center gap-250">
                  <span className="inline-flex h-550 w-550 items-center justify-center rounded-md bg-highlight text-primary">
                    <Icon className="text-2xl" icon="icon-[mdi--format-list-bulleted]" />
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
                <Icon className="text-2xl text-fg-secondary" icon="icon-[mdi--chevron-up]" />
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

            {post.sections.map((section) => (
              <section
                className="space-y-300 rounded-2xl border border-border-secondary bg-surface p-400"
                key={section.title}
              >
                <h2 className="text-2xl leading-tight font-bold text-fg-primary">
                  {section.title}
                </h2>

                {section.paragraphs.map((paragraph) => (
                  <p className="text-sm leading-relaxed text-fg-primary" key={paragraph}>
                    {paragraph}
                  </p>
                ))}

                {section.bulletPoints ? (
                  <ul className="space-y-100 pl-350">
                    {section.bulletPoints.map((item) => (
                      <li
                        className="list-disc text-sm leading-relaxed text-fg-primary marker:text-primary"
                        key={item}
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}

            <section className="space-y-300">
              <div className="grid gap-300 sm:grid-cols-2 xl:grid-cols-4">
                {BLOG_INLINE_PRODUCTS.map((product) => (
                  <BlogInlineProductCard key={product.id} product={product} />
                ))}
              </div>

              <ul className="space-y-100 rounded-2xl border border-border-secondary bg-surface p-400">
                {post.bulletPoints.map((item) => (
                  <li
                    className="list-disc text-sm leading-relaxed text-fg-primary marker:text-primary"
                    key={item}
                  >
                    {item}
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

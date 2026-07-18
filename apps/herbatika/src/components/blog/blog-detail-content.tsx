import type { HttpTypes } from "@medusajs/types"
import { Icon } from "@techsio/ui-kit/atoms/icon"

import { CategoryRichText } from "@/components/category/category-rich-text"
import type { BlogPost } from "@/lib/storefront/blog-content"

import { InlineProductsCarousel } from "./inline-products-carousel"

export function BlogTableOfContents({ post }: { post: BlogPost }) {
  if (post.sections.length === 0) {
    return null
  }

  return (
    <details
      className="group space-y-350 rounded-2xl border border-border-secondary bg-surface p-400"
      open
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-300 [&::-webkit-details-marker]:hidden">
        <div className="flex items-center gap-250">
          <span className="inline-flex items-center justify-center rounded-xs bg-highlight p-50 text-primary">
            <Icon icon="token-icon-list" size="2xl" />
          </span>
          <div>
            <h2 className="font-bold text-fg-primary text-xl leading-tight">
              Obsah článku
            </h2>
            <p className="text-fg-secondary text-sm leading-normal">
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
            className="list-inside list-disc text-fg-secondary text-sm leading-relaxed marker:text-fg-disabled marker:text-lg"
            key={section.title}
          >
            {section.title}
          </li>
        ))}
      </ul>
    </details>
  )
}

export function BlogArticleContent({ post }: { post: BlogPost }) {
  return (
    <article className="space-y-500 rounded-2xl border border-border-secondary bg-surface p-400 md:p-500">
      {post.contentHtml ? (
        <CategoryRichText
          className="text-md [&_p+p]:mt-300"
          html={post.contentHtml}
        />
      ) : (
        post.sections.map((section) => (
          <section className="space-y-250" key={section.title}>
            <h2 className="text-fg-primary text-xl leading-tight">
              {section.title}
            </h2>
            {section.paragraphs.map((paragraph) => (
              <p
                className="text-fg-primary text-md leading-relaxed"
                key={paragraph}
              >
                {paragraph}
              </p>
            ))}
            {section.bulletPoints ? (
              <ul className="space-y-100 pl-350">
                {section.bulletPoints.map((item) => (
                  <li
                    className="list-disc text-fg-primary text-md leading-relaxed marker:text-primary"
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
  )
}

export function BlogProductHighlights({
  post,
  products,
}: {
  post: BlogPost
  products: HttpTypes.StoreProduct[]
}) {
  if (products.length === 0 && post.bulletPoints.length === 0) {
    return null
  }

  return (
    <section className="space-y-300">
      {products.length > 0 ? (
        <InlineProductsCarousel products={products} slidesLg={3} />
      ) : null}
      {post.bulletPoints.length > 0 ? (
        <ul className="space-y-0 rounded-2xl bg-surface p-400">
          {post.bulletPoints.map((item) => (
            <li className="blog-highlight-layout grid gap-100" key={item}>
              <span
                aria-hidden="true"
                className="blog-highlight-dot mt-150 rounded-full bg-primary"
              />
              <span className="text-fg-primary text-md blog-highlight-copy">
                {item}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

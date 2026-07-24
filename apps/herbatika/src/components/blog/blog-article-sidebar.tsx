import NextImage from "next/image"
import NextLink from "next/link"
import {
  type BlogCategoryFilter,
  BLOG_PROMO_BANNER,
} from "@/lib/storefront/blog-content"
import { resolveBlogListingHref } from "@/lib/storefront/blog-routing"

type BlogArticleSidebarProps = {
  categories: BlogCategoryFilter[]
}

export function BlogArticleSidebar({ categories }: BlogArticleSidebarProps) {
  return (
    <aside className="flex w-full flex-col gap-500 xl:w-[342px]">
      <section className="space-y-500 rounded-lg border border-border-secondary bg-surface p-550">
        <h2 className="font-semibold text-fg-primary text-xl leading-[18px]">
          Kategórie
        </h2>

        <div className="flex flex-wrap gap-250">
          {categories.map((category) => (
            <NextLink
              className="inline-flex items-center justify-center rounded-sm bg-highlight px-200 py-150 font-normal text-[13.4px] text-primary leading-[17.28px]"
              href={resolveBlogListingHref({ category: category.key })}
              key={category.key}
            >
              {`${category.label} (${category.count})`}
            </NextLink>
          ))}
        </div>
      </section>

      <div className="relative h-[384px] overflow-hidden rounded-lg border border-border-secondary bg-surface">
        <NextImage
          alt={BLOG_PROMO_BANNER.title}
          className="object-cover"
          fill
          loading="lazy"
          quality={50}
          sizes="(min-width: 1280px) 25vw, 100vw"
          src={BLOG_PROMO_BANNER.imageSrc}
        />
      </div>
    </aside>
  )
}

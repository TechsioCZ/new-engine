import type { HttpTypes } from "@medusajs/types"
import NextImage from "next/image"

import { BLOG_PROMO_BANNER } from "@/lib/storefront/blog-content"

import { BlogFeaturedProductCard } from "./blog-featured-product-card"

type BlogArticleSidebarProps = {
  featuredProduct: HttpTypes.StoreProduct | null
}

export function BlogArticleSidebar({
  featuredProduct,
}: BlogArticleSidebarProps) {
  return (
    <aside className="flex w-full flex-col gap-500 xl:w-blog-sidebar">
      <div className="relative h-blog-promo overflow-hidden rounded-lg border border-border-secondary bg-surface">
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

      {featuredProduct ? (
        <BlogFeaturedProductCard product={featuredProduct} />
      ) : null}
    </aside>
  )
}

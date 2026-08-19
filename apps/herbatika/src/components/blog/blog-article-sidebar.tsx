import type { HttpTypes } from "@medusajs/types"
import NextImage from "next/image"
import type { BlogArticleSidebar as BlogArticleSidebarData } from "@/lib/storefront/blog-content"
import type { PublicEntitySlugMap } from "@/lib/storefront/ssr/public-entity-projection-map"
import { BlogFeaturedProductCard } from "./blog-featured-product-card"

type BlogArticleSidebarProps = {
  sidebar: BlogArticleSidebarData
  product?: HttpTypes.StoreProduct
  productPublicSlugsById: PublicEntitySlugMap
}

export function BlogArticleSidebar({
  sidebar,
  product,
  productPublicSlugsById,
}: BlogArticleSidebarProps) {
  return (
    <aside className="flex w-full flex-col gap-500 xl:w-blog-sidebar">
      {sidebar.promoImage ? (
        <div className="relative h-blog-sidebar-promo overflow-hidden rounded-lg border border-border-secondary bg-surface">
          <NextImage
            alt={sidebar.promoImage.alt}
            className="object-cover"
            fill
            loading="lazy"
            quality={50}
            sizes="(min-width: 1280px) 342px, 100vw"
            src={sidebar.promoImage.src}
          />
        </div>
      ) : null}

      {product ? (
        <BlogFeaturedProductCard
          product={product}
          productPublicSlugsById={productPublicSlugsById}
        />
      ) : null}
    </aside>
  )
}

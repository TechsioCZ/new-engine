import type { HttpTypes } from "@medusajs/types"
import NextImage from "next/image"
import type { BlogArticleSidebar as BlogArticleSidebarData } from "@/lib/storefront/blog-content"
import { BlogFeaturedProductCard } from "./blog-featured-product-card"

type BlogArticleSidebarProps = {
  sidebar: BlogArticleSidebarData
  product?: HttpTypes.StoreProduct
}

export function BlogArticleSidebar({
  sidebar,
  product,
}: BlogArticleSidebarProps) {
  return (
    <aside className="flex w-full flex-col gap-500 xl:w-[342px]">
      {sidebar.promoImage ? (
        <div className="relative h-[384px] overflow-hidden rounded-lg border border-border-secondary bg-surface">
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

      {product ? <BlogFeaturedProductCard product={product} /> : null}
    </aside>
  )
}

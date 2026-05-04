import type { HttpTypes } from "@medusajs/types";
import NextImage from "next/image";
import {
  BLOG_PROMO_BANNER,
  BLOG_SIDEBAR_CATEGORIES,
} from "@/lib/storefront/blog-content";
import { BlogFeaturedProductCard } from "./blog-featured-product-card";

type BlogArticleSidebarProps = {
  featuredProduct: HttpTypes.StoreProduct | null;
};

export function BlogArticleSidebar({
  featuredProduct,
}: BlogArticleSidebarProps) {
  return (
    <aside className="flex w-full flex-col gap-500 xl:w-[342px]">
      <section className="space-y-500 rounded-lg border border-border-secondary bg-surface p-550">
        <h2 className="text-xl leading-[18px] font-semibold text-fg-primary">
          Kategórie
        </h2>

        <div className="flex flex-wrap gap-250">
          {BLOG_SIDEBAR_CATEGORIES.map((category) => (
            <span
              className="inline-flex items-center justify-center rounded-sm bg-highlight px-200 py-150 text-[13.4px] leading-[17.28px] font-normal text-primary"
              key={category.label}
            >
              {`${category.label} (${category.count})`}
            </span>
          ))}
        </div>
      </section>

      <div className="relative h-[384px] overflow-hidden rounded-lg border border-border-secondary bg-surface">
        <NextImage
          alt={BLOG_PROMO_BANNER.title}
          className="object-cover"
          fill
          loading="lazy"
          src={BLOG_PROMO_BANNER.imageSrc}
          quality={50}
          sizes="(min-width: 1280px) 25vw, 100vw"
        />
      </div>

      {featuredProduct ? (
        <BlogFeaturedProductCard product={featuredProduct} />
      ) : null}
    </aside>
  );
}

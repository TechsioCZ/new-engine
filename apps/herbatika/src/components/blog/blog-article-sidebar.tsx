import { Badge } from "@techsio/ui-kit/atoms/badge";
import { Image } from "@techsio/ui-kit/atoms/image";
import { BLOG_PROMO_BANNER, BLOG_SIDEBAR_CATEGORIES } from "@/lib/storefront/blog-content";
import { BlogFeaturedProductCard } from "./blog-featured-product-card";

export function BlogArticleSidebar() {
  return (
    <aside className="space-y-400">
      <section className="space-y-250 rounded-2xl border border-border-secondary bg-surface p-400">
        <h2 className="text-2xl leading-tight font-bold text-fg-primary">
          Kategórie
        </h2>

        <div className="flex flex-wrap gap-200">
          {BLOG_SIDEBAR_CATEGORIES.map((category) => (
            <Badge
              className="rounded-md px-250 py-100 text-xs font-medium"
              key={category.label}
              variant="secondary"
            >
              {`${category.label} (${category.count})`}
            </Badge>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden rounded-2xl border border-border-secondary bg-surface">
        <Image
          alt={BLOG_PROMO_BANNER.title}
          className="aspect-square w-full object-cover"
          height={560}
          loading="lazy"
          src={BLOG_PROMO_BANNER.imageSrc}
          width={420}
        />

        <div className="absolute inset-0 bg-fg-primary/35" />

        <div className="absolute inset-x-300 top-300 space-y-100">
          <p className="text-3xl leading-tight font-bold text-warning">
            {BLOG_PROMO_BANNER.title}
          </p>
          <p className="text-3xl leading-tight font-medium text-fg-reverse">
            {BLOG_PROMO_BANNER.subtitle}
          </p>
        </div>

        <div className="absolute right-300 bottom-300 flex items-center overflow-hidden rounded-lg border border-warning bg-warning text-fg-primary">
          <span className="bg-fg-primary/70 px-250 py-150 text-xl leading-tight font-semibold text-fg-reverse">
            {BLOG_PROMO_BANNER.codeLabel}
          </span>
          <span className="px-300 py-150 text-3xl leading-tight font-semibold">
            {BLOG_PROMO_BANNER.codeValue}
          </span>
        </div>
      </section>

      <BlogFeaturedProductCard />
    </aside>
  );
}

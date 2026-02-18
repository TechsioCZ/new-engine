"use client";

import { Badge } from "@techsio/ui-kit/atoms/badge";
import { Image } from "@techsio/ui-kit/atoms/image";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { BLOG_FEATURED_PRODUCT } from "@/lib/storefront/blog-content";

export function BlogFeaturedProductCard() {
  return (
    <article className="space-y-250 rounded-2xl border border-border-secondary bg-surface p-300">
      <div className="flex flex-wrap gap-150">
        {BLOG_FEATURED_PRODUCT.badges.map((badge) => {
          const badgeVariant =
            badge === "Akcia"
              ? "tertiary"
              : badge === "Novinka"
                ? "success"
                : "warning";

          return (
            <Badge
              className="rounded-md px-200 py-100 text-2xs font-semibold"
              key={badge}
              variant={badgeVariant}
            >
              {badge}
            </Badge>
          );
        })}
      </div>

      <div className="relative overflow-hidden rounded-lg border border-border-secondary bg-base">
        <Image
          alt={BLOG_FEATURED_PRODUCT.title}
          className="blog-featured-product-image w-full object-cover"
          height={380}
          loading="lazy"
          src={BLOG_FEATURED_PRODUCT.imageSrc}
          width={420}
        />
        <Badge
          className="absolute right-300 bottom-300 rounded-md px-300 py-100 text-2xs font-semibold"
          variant="tertiary"
        >
          {BLOG_FEATURED_PRODUCT.discountLabel}
        </Badge>
      </div>

      <h3 className="line-clamp-2 text-lg leading-snug font-bold text-fg-primary">
        {BLOG_FEATURED_PRODUCT.title}
      </h3>

      <ul className="list-disc space-y-100 pl-350 text-xs leading-relaxed text-fg-secondary">
        <li>úľava od bolesti</li>
        <li>zmierňuje kŕčové žily</li>
        <li>odstraňuje opuchy nôh</li>
      </ul>

      <div className="flex items-end justify-between gap-300">
        <div>
          <p className="text-2xs leading-normal text-fg-secondary line-through">
            {BLOG_FEATURED_PRODUCT.oldPrice}
          </p>
          <p className="text-lg leading-tight font-bold text-fg-primary">
            {BLOG_FEATURED_PRODUCT.price}
          </p>
        </div>

        <LinkButton
          className="px-400 py-250 text-xs font-semibold"
          href="/c/trapi-ma"
          icon="token-icon-cart"
          size="sm"
          variant="primary"
        >
          Do košíka
        </LinkButton>
      </div>
    </article>
  );
}

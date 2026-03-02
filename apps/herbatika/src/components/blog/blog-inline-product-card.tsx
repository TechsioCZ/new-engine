"use client";

import { Badge } from "@techsio/ui-kit/atoms/badge";
import { Image } from "@techsio/ui-kit/atoms/image";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import type { BLOG_INLINE_PRODUCTS } from "@/lib/storefront/blog-content";

type BlogInlineProductCardProps = {
  product: (typeof BLOG_INLINE_PRODUCTS)[number];
};

export function BlogInlineProductCard({ product }: BlogInlineProductCardProps) {
  return (
    <article className="space-y-250 rounded-2xl border border-border-secondary bg-surface p-300">
      <div className="flex flex-wrap gap-150">
        {product.badges.map((badge) => {
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
          alt={product.title}
          className="aspect-video w-full object-cover"
          height={280}
          loading="lazy"
          src={product.imageSrc}
          width={360}
        />

        {product.discountLabel ? (
          <Badge
            className="absolute right-250 bottom-250 rounded-md px-250 py-100 text-2xs font-semibold"
            variant="tertiary"
          >
            {product.discountLabel}
          </Badge>
        ) : null}
      </div>

      <h3 className="line-clamp-2 text-lg leading-snug font-bold text-fg-primary">
        {product.title}
      </h3>

      <p className="line-clamp-3 text-xs leading-relaxed text-fg-secondary">
        {product.excerpt}
      </p>

      <div className="flex items-end justify-between gap-300">
        <div>
          {product.oldPrice ? (
            <p className="text-2xs leading-normal text-fg-secondary line-through">
              {product.oldPrice}
            </p>
          ) : null}
          <p className="text-lg leading-tight font-bold text-fg-primary">
            {product.price}
          </p>
        </div>

        <LinkButton
          className="px-350 py-250 text-xs font-semibold"
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

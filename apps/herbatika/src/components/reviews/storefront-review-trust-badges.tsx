import NextImage from "next/image";
import { STOREFRONT_REVIEW_TRUST_SOURCES } from "@/components/reviews/storefront-reviews.data";
import type { StorefrontReviewTrustSource } from "@/components/reviews/storefront-reviews.types";

type StorefrontReviewTrustBadgesProps = {
  sources?: readonly StorefrontReviewTrustSource[];
  size?: StorefrontReviewTrustBadgeSize;
  className?: string;
};

type StorefrontReviewTrustBadgeSize = "sm" | "md";

const ROOT_CLASS_NAME = "grid w-full grid-cols-1 sm:grid-cols-3";

const SIZE_CLASS_NAMES: Record<
  StorefrontReviewTrustBadgeSize,
  { root: string; item: string }
> = {
  sm: {
    root: "gap-200",
    item: "gap-200 bg-surface px-350 py-200",
  },
  md: {
    root: "gap-x-400 gap-y-300",
    item: "gap-200 bg-overlay px-500 py-500",
  },
};

function joinClassNames(...classNames: Array<string | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

export function StorefrontReviewTrustBadges({
  sources = STOREFRONT_REVIEW_TRUST_SOURCES,
  size = "sm",
  className,
}: StorefrontReviewTrustBadgesProps) {
  if (sources.length === 0) {
    return null;
  }

  const sizeClassNames = SIZE_CLASS_NAMES[size];

  return (
    <ul
      aria-label="Hodnotenia obchodu"
      className={joinClassNames(ROOT_CLASS_NAME, sizeClassNames.root, className)}
    >
      {sources.map((source) => (
        <li
          className={joinClassNames(
            "flex items-center justify-center rounded-sm",
            sizeClassNames.item,
          )}
          key={source.id}
        >
          <NextImage
            alt={source.logoAlt}
            className="h-third-parties-logo w-auto object-contain"
            height={28}
            src={source.logo}
            width={source.logoWidth}
          />
          <div className="flex flex-col items-center">
            <p className="font-verdana text-base leading-tight font-bold text-primary">
              {source.scoreLabel}
            </p>
            <p className="font-verdana text-2xs leading-tight text-fg-disabled">
              {source.reviewCountLabel}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

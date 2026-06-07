import NextImage from "next/image";
import { REVIEW_TRUST_SOURCES } from "@/components/reviews/reviews.data";
import type { ReviewTrustSource } from "@/components/reviews/reviews.types";

type ReviewTrustBadgesProps = {
  sources?: readonly ReviewTrustSource[];
  size?: ReviewTrustBadgeSize;
  className?: string;
};

type ReviewTrustBadgeSize = "sm" | "md";

const ROOT_CLASS_NAME = "grid w-full grid-cols-1 sm:grid-cols-3";

const SIZE_CLASS_NAMES: Record<
  ReviewTrustBadgeSize,
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

export function ReviewTrustBadges({
  sources = REVIEW_TRUST_SOURCES,
  size = "sm",
  className,
}: ReviewTrustBadgesProps) {
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

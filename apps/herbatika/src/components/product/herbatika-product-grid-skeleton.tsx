"use client";

import { HerbatikaProductCardSkeleton } from "@/components/herbatika-product-card-skeleton";
import type { HerbatikaProductGridLayout } from "./herbatika-product-grid";

const SKELETON_LAYOUT_CLASSNAME: Record<HerbatikaProductGridLayout, string> = {
  category: "grid grid-cols-2 gap-400 lg:grid-cols-3",
  home: "grid grid-cols-2 gap-400 lg:grid-cols-4",
  search: "grid gap-300 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
};

const SKELETON_LAYOUT_COUNT: Record<HerbatikaProductGridLayout, number> = {
  category: 8,
  home: 4,
  search: 8,
};

type HerbatikaProductGridSkeletonProps = {
  layout: HerbatikaProductGridLayout;
};

export function HerbatikaProductGridSkeleton({
  layout,
}: HerbatikaProductGridSkeletonProps) {
  const skeletonCount = SKELETON_LAYOUT_COUNT[layout];

  return (
    <div className={SKELETON_LAYOUT_CLASSNAME[layout]}>
      {Array.from({ length: skeletonCount }, (_, index) => (
        <HerbatikaProductCardSkeleton
          key={`${layout}-product-skeleton-${index + 1}`}
        />
      ))}
    </div>
  );
}

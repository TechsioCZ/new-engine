"use client";

import { HerbatikaProductCardSkeleton } from "@/components/herbatika-product-card-skeleton";

const SEARCH_SKELETON_KEYS = [
  "search-skeleton-1",
  "search-skeleton-2",
  "search-skeleton-3",
  "search-skeleton-4",
  "search-skeleton-5",
  "search-skeleton-6",
  "search-skeleton-7",
  "search-skeleton-8",
] as const;

export function SearchSkeletonGrid() {
  return (
    <div className="grid gap-300 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {SEARCH_SKELETON_KEYS.map((skeletonKey) => (
        <HerbatikaProductCardSkeleton key={skeletonKey} />
      ))}
    </div>
  );
}

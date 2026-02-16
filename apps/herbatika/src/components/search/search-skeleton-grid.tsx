"use client";

import { Skeleton } from "@techsio/ui-kit/atoms/skeleton";

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
        <div
          className="rounded-2xl border-transparent bg-surface p-500 pb-550"
          key={skeletonKey}
        >
          <Skeleton.Rectangle className="mb-250 h-950 rounded-none" />
          <Skeleton.Text className="rounded-full" noOfLines={2} size="lg" />
          <Skeleton.Text
            className="mt-200 rounded-full"
            noOfLines={2}
            size="sm"
          />
          <Skeleton.Rectangle className="mt-450 h-750 rounded-md" />
        </div>
      ))}
    </div>
  );
}

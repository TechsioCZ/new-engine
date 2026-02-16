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
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {SEARCH_SKELETON_KEYS.map((skeletonKey) => (
        <div
          className="rounded-[16px] border-transparent bg-surface p-[20px] pb-[26px]"
          key={skeletonKey}
        >
          <Skeleton.Rectangle className="mb-[10px] aspect-[294/259.2] rounded-none" />
          <Skeleton.Text className="rounded-full" noOfLines={2} size="lg" />
          <Skeleton.Text
            className="mt-2 rounded-full"
            noOfLines={2}
            size="sm"
          />
          <Skeleton.Rectangle className="mt-[18px] h-[40px] rounded-[7px]" />
        </div>
      ))}
    </div>
  );
}

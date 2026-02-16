"use client";

import { Skeleton } from "@techsio/ui-kit/atoms/skeleton";

export function HerbatikaProductCardSkeleton() {
  return (
    <div className="rounded-2xl border-transparent bg-surface p-500 pb-550">
      <Skeleton.Rectangle className="mb-250 h-950 rounded-none" />
      <Skeleton.Text className="rounded-full" noOfLines={2} size="lg" />
      <Skeleton.Text className="mt-200 rounded-full" noOfLines={2} size="sm" />
      <Skeleton.Rectangle className="mt-450 h-750 rounded-md" />
    </div>
  );
}

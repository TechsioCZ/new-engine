"use client";

import { Skeleton } from "@techsio/ui-kit/atoms/skeleton";

type HerbatikaProductCardSkeletonProps = {
  variant?: "default" | "compact";
};

export function HerbatikaProductCardSkeleton({
  variant = "default",
}: HerbatikaProductCardSkeletonProps) {
  if (variant === "compact") {
    return (
      <div className="rounded-2xl border-transparent bg-surface p-300">
        <Skeleton.Rectangle className="h-950 rounded-xl" />
        <Skeleton.Text className="mt-200 rounded-full" noOfLines={2} size="sm" />
        <Skeleton.Text className="mt-150 rounded-full" noOfLines={1} size="sm" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-transparent bg-surface p-500 pb-550">
      <Skeleton.Rectangle className="mb-250 h-950 rounded-none" />
      <Skeleton.Text className="rounded-full" noOfLines={2} size="lg" />
      <Skeleton.Text className="mt-200 rounded-full" noOfLines={2} size="sm" />
      <Skeleton.Rectangle className="mt-450 h-750 rounded-md" />
    </div>
  );
}

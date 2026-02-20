"use client";

import { Skeleton } from "@techsio/ui-kit/atoms/skeleton";

export function ProductDetailSkeleton() {
  return (
    <section className="rounded-xl border border-border-secondary bg-surface p-600">
      <div className="grid gap-600 xl:grid-cols-2">
        <Skeleton.Rectangle className="aspect-square rounded-xl" />
        <div className="space-y-400">
          <Skeleton.Text noOfLines={2} />
          <Skeleton.Rectangle className="h-500 w-900 rounded-lg" />
          <Skeleton.Text noOfLines={5} />
        </div>
      </div>
    </section>
  );
}

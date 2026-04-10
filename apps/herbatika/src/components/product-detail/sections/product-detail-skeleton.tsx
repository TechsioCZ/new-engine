"use client";

import { ReviewSkeleton } from "@/components/loading/review-skeleton";
import { Skeleton } from "@techsio/ui-kit/atoms/skeleton";

export function ProductDetailSkeleton() {
  return (
    <section className="grid gap-500 xl:grid-cols-2">
      <div className="space-y-300">
        <div className="grid gap-300 md:grid-cols-[auto_minmax(0,1fr)]">
          <div className="hidden md:flex md:flex-col md:gap-100">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton.Rectangle
                className="size-[72px] rounded-md"
                key={`product-detail-thumbnail-skeleton-${index + 1}`}
              />
            ))}
          </div>

          <div className="flex aspect-square sm:max-h-[400px] lg:max-h-[600px] xl:max-h-full overflow-hidden rounded-lg">
            <Skeleton.Rectangle />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-250 rounded-lg bg-surface p-400 md:flex-nowrap">
            <Skeleton.Circle className="size-8 shrink-0" />
            <Skeleton.Text noOfLines={2} size="sm" containerClassName="w-full" />
        </div>
      </div>

      <div className="space-y-300">
        <div className="space-y-300 rounded-lg border border-border-secondary bg-surface p-350">
          <div className="flex min-h-12 flex-wrap items-start gap-200">
            <div className="ml-auto flex min-w-0 items-center gap-300 sm:gap-500">
              <div className="flex min-w-0 flex-wrap items-center gap-x-100 gap-y-50">
                <Skeleton.Rectangle className="h-4 w-16 rounded-full" />
                <Skeleton.Rectangle className="h-4 w-24 rounded-full" />
              </div>

              <Skeleton.Circle className="size-8 sm:size-6" />
            </div>
          </div>

          <div className="space-y-200">
            <Skeleton.Text noOfLines={2} />
          </div>

          <ul className="space-y-150">
            {Array.from({ length: 3 }, (_, index) => (
              <li className="flex items-start gap-200" key={`product-detail-highlight-skeleton-${index + 1}`}>
                <Skeleton.Rectangle className="h-4 w-full rounded-full" />
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-end justify-between gap-250">
            <div className="space-y-200">
              <Skeleton.Rectangle className="h-12 w-28 rounded-md" variant="secondary" />
            </div>
            <Skeleton.Text noOfLines={2} size="sm" containerClassName="w-full max-w-xs bg-highlight p-200 rounded-md " />
          </div>


          <div className="grid items-center gap-350 sm:grid-cols-4">
            <Skeleton.Rectangle className="h-12 rounded-lg" />
            <Skeleton.Rectangle className="h-12 rounded-full sm:col-span-3" />
          </div>
        </div>


        <section className="space-y-350 p-550">
            {Array.from({ length: 2 }, (_, index) => (
              <div
                className="flex items-center gap-250 rounded-lg border border-border-secondary bg-surface p-400"
                key={`product-detail-offer-skeleton-${index + 1}`}
              >
                <Skeleton.Rectangle className="size-5 shrink-0 rounded-[3px]" />
                <div className="min-w-0 flex-1 space-y-100">
                  <Skeleton.Rectangle className="h-5 w-40 rounded-full" />
                  <Skeleton.Rectangle className="h-4 w-24 rounded-full" />
                </div>
                <div className="space-y-100 text-right">
                  <Skeleton.Rectangle className="ml-auto h-5 w-16 rounded-full" />
                  <Skeleton.Rectangle className="ml-auto h-4 w-12 rounded-full" />
                </div>
              </div>
            ))}
          <Skeleton.Rectangle className="h-8 rounded-full" />
        </section>
      </div>
      <section className="space-y-400 p-500 col-span-full">
          <div className="grid gap-300 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <ReviewSkeleton key={`home-route-review-${index + 1}`} />
            ))}
          </div>

      </section>
    </section>
  );
}

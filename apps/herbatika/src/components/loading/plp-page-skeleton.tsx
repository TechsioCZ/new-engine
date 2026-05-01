"use client";

import { Skeleton } from "@techsio/ui-kit/atoms/skeleton";
import { HerbatikaProductGridSkeleton } from "@/components/product/herbatika-product-grid-skeleton";

type PlpPageSkeletonProps = {
  variant: "search" | "category" | "brand";
};

function CategoryDescriptionSkeleton() {
  return (
    <section className="space-y-350">
      <div className="space-y-150">
        <Skeleton.Text noOfLines={4} size="sm" />
        <Skeleton.Rectangle className="h-450 w-900 rounded-full" />
      </div>

      <div className="grid gap-250 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <div
            className="flex min-h-750 items-center gap-200 rounded-lg border border-border-secondary bg-surface px-300 py-200"
            key={`category-context-skeleton-${index + 1}`}
          >
            <Skeleton.Circle className="h-6 w-6 shrink-0" />
            <Skeleton.Text noOfLines={1} size="sm" containerClassName="w-full" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function PlpPageSkeleton({ variant }: PlpPageSkeletonProps) {
  const isSearch = variant === "search";
  const isCategory = variant === "category";

  return (
    <main className="mx-auto flex w-full max-w-max-w flex-col gap-600 px-400 py-500 font-rubik sm:p-600">
      <section className="space-y-250">
        {isSearch ? (
          <>
            <Skeleton.Text noOfLines={1} size="lg" />
            <Skeleton.Text noOfLines={1} size="sm" />
          </>
        ) : (
          <>
            <Skeleton.Rectangle className="h-8 rounded-sm" />
            <Skeleton.Rectangle className="h-12 rounded-sm" />
          </>
        )}
      </section>

      {isSearch ? (
        <Skeleton.Text noOfLines={3} size="lg" containerClassName="w-full" />
      ) : null}

      {isCategory ? <CategoryDescriptionSkeleton /> : null}

      <section className="space-y-400">
        <div className="flex min-w-0 flex-col gap-600 md:grid md:grid-cols-12 md:items-start">
            <aside className="hidden md:col-span-3 md:block">
              <Skeleton.Rectangle variant="primary" className="h-164 rounded-2xl" />
            </aside>

          <div className="space-y-400 md:col-span-9">
            <Skeleton.Rectangle className="h-16 rounded-xl" />
            <HerbatikaProductGridSkeleton layout="catalog" />
          </div>
        </div>
      </section>
    </main>
  );
}

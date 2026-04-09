"use client";

import { Skeleton } from "@techsio/ui-kit/atoms/skeleton";
import { HerbatikaProductGridSkeleton } from "@/components/product/herbatika-product-grid-skeleton";

type PlpPageSkeletonProps = {
  variant: "search" | "category";
};

export function PlpPageSkeleton({ variant }: PlpPageSkeletonProps) {
  const isSearch = variant === "search";

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
            <Skeleton.Rectangle className="h-250 rounded-full" />
            <Skeleton.Text noOfLines={1} size="lg" />
          </>
        )}
      </section>

      {isSearch ? (
        <div className="flex flex-wrap items-center gap-200">
          <Skeleton.Rectangle className="h-550 w-1200 rounded-full" />
          <Skeleton.Rectangle className="h-550 w-1200 rounded-full" />
          <Skeleton.Rectangle className="h-550 w-1200 rounded-full" />
        </div>
      ) : null}

      <section className="space-y-400">
        <div className="flex min-w-0 flex-col gap-600 xl:grid xl:grid-cols-12 xl:items-start">
          {!isSearch ? (
            <aside className="hidden xl:col-span-3 xl:block">
              <Skeleton.Rectangle className="h-2100 rounded-2xl" />
            </aside>
          ) : null}

          <div className={isSearch ? "space-y-400" : "space-y-400 xl:col-span-9"}>
            <Skeleton.Rectangle className="h-650 rounded-xs" />
            <HerbatikaProductGridSkeleton layout="catalog" />
          </div>
        </div>
      </section>
    </main>
  );
}

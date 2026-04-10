"use client";

import { Skeleton } from "@techsio/ui-kit/atoms/skeleton";
import { HerbatikaProductGridSkeleton } from "@/components/product/herbatika-product-grid-skeleton";
import { ReviewSkeleton } from "./review-skeleton";

function HeroCardSkeleton({
  index,
}: {
  index: number;
}) {
  return (
    <div
      className="relative aspect-[4/5]"
      key={`home-route-hero-${index + 1}`}
    >
      <Skeleton.Rectangle className="absolute inset-0 rounded-md" />
      <div className="absolute inset-x-0 bottom-0 space-y-2 p-4">
        <Skeleton.Rectangle className="h-6 w-20 rounded-full bg-skeleton-bg-highlight" />
        <Skeleton.Text noOfLines={3} size="sm" className="bg-skeleton-bg-highlight"/>
      </div>
    </div>
  );
}

function PurposeCategoryCardSkeleton({
  index,
}: {
  index: number;
}) {
  return (
    <Skeleton.Rectangle
      speed="slow"
      className="flex aspect-square flex-col bg-surface items-center justify-center gap-300 rounded-md"
      key={`home-route-purpose-${index + 1}`}
    >
      <Skeleton.Circle className="size-14" />
      <Skeleton.Text
        speed="fast"
        noOfLines={1}
        size="sm"
        containerClassName="w-2/3"
      />
    </Skeleton.Rectangle>
  );
}

function PurposeCategoriesSkeleton() {
  return (
    <section className="space-y-350">
      <div className="flex items-center justify-between gap-300">
        <Skeleton.Text noOfLines={1} size="md" containerClassName="w-full max-w-xl" />
        <Skeleton.Rectangle className="hidden h-6 w-28 rounded-sm sm:block" />
      </div>

      <div className="space-y-200">
        <div className="md:hidden">
          <div className="relative p-200">
            <div className="grid grid-cols-3 gap-250">
              {Array.from({ length: 3 }, (_, index) => (
                <PurposeCategoryCardSkeleton index={index} key={`home-route-purpose-mobile-${index + 1}`} />
              ))}
            </div>
          </div>
        </div>

        <div className="hidden md:block xl:hidden">
          <div className="relative p-200">
            <div className="grid grid-cols-5 gap-250">
              {Array.from({ length: 5 }, (_, index) => (
                <PurposeCategoryCardSkeleton index={index} key={`home-route-purpose-tablet-${index + 1}`} />
              ))}
            </div>
          </div>
        </div>

        <div className="hidden xl:block">
          <div className="relative p-200">
            <div className="grid grid-cols-7 gap-250">
              {Array.from({ length: 7 }, (_, index) => (
                <PurposeCategoryCardSkeleton index={index} key={`home-route-purpose-desktop-${index + 1}`} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function HomeRouteSkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-max-w flex-col gap-700 px-400 py-550 font-rubik lg:px-550 lg:py-700">
      <section className="p-300">
        <div className="relative">
          <div className="grid grid-cols-2 gap-300 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <HeroCardSkeleton index={index} key={`home-route-hero-card-${index + 1}`} />
            ))}
          </div>

          <Skeleton.Circle className="hidden lg:block absolute left-4 top-1/2 size-14 -translate-y-1/2 bg-skeleton-bg-highlight" />
          <Skeleton.Circle className="hidden lg:block absolute right-4 top-1/2 size-14 -translate-y-1/2 bg-skeleton-bg-highlight" />
        </div>
      </section>

      <PurposeCategoriesSkeleton />

      <section className="grid gap-300 md:grid-cols-2 xl:grid-cols-4 bg-skeleton-bg-secondary  p-200">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            className="flex min-h-20 items-center gap-300 p-300"
            key={`home-route-benefit-${index + 1}`}
          >
            <Skeleton.Circle className="size-16 shrink-0" />
            <Skeleton.Text noOfLines={2} size="sm" containerClassName="w-full" />
          </div>
        ))}
      </section>

      <section className="space-y-400">
        <HerbatikaProductGridSkeleton layout="collection" />
      </section>

      <section className="space-y-400 p-500">
        <div className="grid gap-300 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <ReviewSkeleton key={`home-route-review-${index + 1}`} />
          ))}
        </div>
      </section>

      <section className="space-y-400">
        <HerbatikaProductGridSkeleton layout="collection" />
      </section>
    </main>
  );
}

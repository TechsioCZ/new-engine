"use client";
import { Skeleton } from "@techsio/ui-kit/atoms/skeleton";

export function AuthPageSkeletonCard() {
  return (
    <section className="space-y-400 p-550">
      <Skeleton.Text noOfLines={2} size="sm" />
      <div className="space-y-250">
        {Array.from({ length: 2 }, (_, index) => (
          <div className="space-y-150" key={`auth-field-skeleton-${index + 1}`}>
          <Skeleton.Text noOfLines={1} size="sm" containerClassName="w-24" />
          <Skeleton.Rectangle
            className="h-8 rounded-sm"
          />
          </div>
        ))}
      </div>
      <div className="flex gap-300">
        <Skeleton.Rectangle className="h-600 w-24 rounded-xs" />
        <Skeleton.Rectangle className="h-600 w-24 rounded-xs" />
      </div>
    </section>
  );
}


export function AuthPageSkeleton() {
  return (
    <main className="mx-auto w-full max-w-auth-content px-400 py-550 lg:px-550">
      <AuthPageSkeletonCard />
    </main>
  );
}

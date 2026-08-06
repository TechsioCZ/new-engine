import { SkeletonLoader } from "@/components/atoms/skeleton-loader"

export const OrdersSkeleton = ({ itemsCount }: { itemsCount: number }) => {
  const maxItems = Array.from({ length: Math.min(itemsCount, 10) })
  return (
    <>
      {/* Summary skeleton */}
      <div className="mb-xl">
        <div className="flex flex-col gap-xs sm:mb-md sm:flex-row sm:items-end sm:justify-between">
          <div>
            <SkeletonLoader className="mb-xs h-8 w-48" />
            <SkeletonLoader className="h-5 w-64" />
          </div>
          <div className="flex items-center gap-sm sm:block sm:text-right">
            <SkeletonLoader className="h-4 w-24 sm:mb-3xs" />
            <SkeletonLoader className="h-4 w-32 sm:h-8" />
          </div>
        </div>

        <div className="flex flex-col gap-xs border-t pt-md sm:flex-row sm:items-center sm:gap-md">
          <SkeletonLoader className="h-5 w-32" />
          <SkeletonLoader className="hidden h-1 w-1 rounded-full sm:block" />
          <SkeletonLoader className="h-5 w-24" />
          <SkeletonLoader className="hidden h-1 w-1 rounded-full sm:block" />
          <SkeletonLoader className="h-5 w-28" />
        </div>
      </div>
      {/* Mobile skeleton */}
      <div className="block space-y-3 sm:hidden">
        {maxItems.map((_, i) => (
          <div
            className="rounded-sm border border-orders-border bg-orders-card-bg p-sm"
            key={`mobile-skeleton-${i}`}
          >
            <div className="mb-2xs flex items-start justify-between">
              <div>
                <SkeletonLoader className="mb-3xs h-5 w-20" />
                <SkeletonLoader className="h-6 w-16" />
              </div>
              <SkeletonLoader className="h-4 w-24" />
            </div>
            <div className="mt-xs flex items-center gap-2xs">
              <SkeletonLoader className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <SkeletonLoader className="mb-3xs h-4 w-3/4" />
                <SkeletonLoader className="h-3 w-16" />
              </div>
            </div>
            <div className="mt-xs flex items-center justify-between">
              <SkeletonLoader className="h-5 w-24" />
              <SkeletonLoader className="h-8 w-16" />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop skeleton */}
      <div className="hidden sm:block">
        <div className="space-y-orders-overlap">
          <div className="rounded-sm bg-orders-card-bg">
            <div className="hidden grid-cols-12 gap-orders-card border-orders-border border-b p-sm sm:grid">
              <SkeletonLoader className="col-span-2 h-5" />
              <SkeletonLoader className="col-span-2 h-5" />
              <SkeletonLoader className="col-span-4 h-5" />
              <SkeletonLoader className="col-span-2 h-5" />
              <SkeletonLoader className="col-span-2 h-5" />
            </div>
            {maxItems.map((_, i) => (
              <div
                className="hidden grid-cols-12 gap-orders-card border-orders-border border-b p-sm sm:grid"
                key={`desktop-skeleton-${i}`}
              >
                <SkeletonLoader className="col-span-12 h-12" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

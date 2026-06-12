import { Skeleton } from "@techsio/ui-kit/atoms/skeleton"

export const ReviewSkeleton = () => (
  <div className="space-y-300 rounded-md bg-skeleton-bg-secondary p-400">
    <div className="flex items-center gap-250">
      <Skeleton.Circle className="size-16 shrink-0" />
      <Skeleton.Text noOfLines={2} size="sm" />
    </div>
    <Skeleton.Text noOfLines={4} size="sm" />
  </div>
)

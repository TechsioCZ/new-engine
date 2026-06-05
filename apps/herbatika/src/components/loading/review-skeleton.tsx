import { Skeleton } from "@techsio/ui-kit/atoms/skeleton"


export const ReviewSkeleton = () => {
    return (
        <div className="space-y-300 p-400 bg-skeleton-bg-secondary rounded-md">
            <div className="flex items-center gap-250">
            <Skeleton.Circle className="size-16 shrink-0" />
            <Skeleton.Text noOfLines={2} size="sm" />
            </div>
            <Skeleton.Text noOfLines={4} size="sm" />
        </div>
    )
}
import { Skeleton } from "@techsio/ui-kit/atoms/skeleton"

export const ProductCardSkeleton = () => {
  return (
    <div className="flex h-full flex-col gap-300">
      {/* Name - single line */}
      <Skeleton className="h-500 w-full rounded-sm" />

      {/* Image - square aspect ratio */}
      <Skeleton.Rectangle className="aspect-square w-full rounded-md" />

      {/* Button */}
      <Skeleton className="h-800 w-600 self-end rounded-md" />
    </div>
  )
}

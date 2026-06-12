"use client"
import { Skeleton } from "@techsio/ui-kit/atoms/skeleton"

export const OrderSkeleton = () => (
  <div className="space-y-300 rounded-md">
    <Skeleton.Rectangle className="h-8 rounded-sm" />
    <div className="rounded-md bg-surface p-400">
      <Skeleton.Text containerClassName="w-64" noOfLines={2} />
      <div className="grid grid-cols-2 gap-600 py-500">
        <Skeleton.Text containerClassName="w-full space-y-100" noOfLines={4} />
        <Skeleton.Text containerClassName="w-full space-y-100" noOfLines={4} />
      </div>
      <div className="grid grid-cols-2 gap-600 py-500">
        <Skeleton.Text containerClassName="w-40" noOfLines={4} />
        <Skeleton.Text containerClassName="w-40" noOfLines={4} />
      </div>
      <Skeleton.Text noOfLines={4} />
    </div>
    <div className="h-32 space-y-200 rounded-md bg-surface p-400">
      <Skeleton.Text
        className="min-h-6"
        containerClassName="w-46"
        noOfLines={1}
      />
      <Skeleton.Text noOfLines={3} />
    </div>
  </div>
)

"use client"

import { Skeleton } from "@techsio/ui-kit/atoms/skeleton"

export default function Loading() {
  return (
    <div className="space-y-400">
      <Skeleton.Rectangle className="h-500 w-4xl" />
      <Skeleton.Rectangle className="h-order-detail-summary-skeleton w-full" />
      <Skeleton.Rectangle className="h-order-detail-content-skeleton w-full" />
    </div>
  )
}

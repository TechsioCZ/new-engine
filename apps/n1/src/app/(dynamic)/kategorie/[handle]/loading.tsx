"use client"

import { ProductCardSkeleton } from "@/components/skeletons/product-card-skeleton"

const SKELETON_KEYS = Array.from(
  { length: 24 },
  (_, index) => `skeleton-${index}`,
)

const Loading = () => (
  <div className="mx-auto w-full max-w-max-w px-400 py-400">
    <div className="grid grid-cols-2 gap-200 md:grid-cols-4">
      {SKELETON_KEYS.map((key) => (
        <ProductCardSkeleton key={key} />
      ))}
    </div>
  </div>
)

export default Loading

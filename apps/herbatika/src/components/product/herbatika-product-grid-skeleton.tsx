"use client"

import { HerbatikaProductCardSkeleton } from "@/components/herbatika-product-card-skeleton"
import {
  HERBATIKA_PRODUCT_GRID_LAYOUT_CLASSNAME,
  type HerbatikaProductGridLayout,
} from "./herbatika-product-grid"

const SKELETON_LAYOUT_COUNT: Record<HerbatikaProductGridLayout, number> = {
  catalog: 8,
  collection: 4,
}

type HerbatikaProductGridSkeletonProps = {
  layout: HerbatikaProductGridLayout
}

export function HerbatikaProductGridSkeleton({
  layout,
}: HerbatikaProductGridSkeletonProps) {
  const skeletonCount = SKELETON_LAYOUT_COUNT[layout]

  return (
    <div className={HERBATIKA_PRODUCT_GRID_LAYOUT_CLASSNAME[layout]}>
      {Array.from({ length: skeletonCount }, (_, index) => (
        <HerbatikaProductCardSkeleton
          key={`${layout}-product-skeleton-${index + 1}`}
        />
      ))}
    </div>
  )
}

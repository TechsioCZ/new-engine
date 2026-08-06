"use client"

import { HerbaticaProductCardSkeleton } from "@/components/herbatica-product-card-skeleton"
import {
  HERBATICA_PRODUCT_GRID_LAYOUT_CLASSNAME,
  type HerbaticaProductGridLayout,
} from "./herbatica-product-grid"

const SKELETON_LAYOUT_COUNT: Record<HerbaticaProductGridLayout, number> = {
  catalog: 8,
  collection: 4,
}

type HerbaticaProductGridSkeletonProps = {
  layout: HerbaticaProductGridLayout
}

export function HerbaticaProductGridSkeleton({
  layout,
}: HerbaticaProductGridSkeletonProps) {
  const skeletonCount = SKELETON_LAYOUT_COUNT[layout]

  return (
    <div className={HERBATICA_PRODUCT_GRID_LAYOUT_CLASSNAME[layout]}>
      {Array.from({ length: skeletonCount }, (_, index) => (
        <HerbaticaProductCardSkeleton
          key={`${layout}-product-skeleton-${index + 1}`}
        />
      ))}
    </div>
  )
}

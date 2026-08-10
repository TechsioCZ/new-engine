"use client"

import { Skeleton } from "@techsio/ui-kit/atoms/skeleton"
import { useTranslations } from "next-intl"

const PRODUCT_LIST_SKELETON_ROWS = [0, 1, 2] as const

export const ProductListItemsSkeleton = () => {
  const tAuth = useTranslations("auth")

  return (
    <Skeleton aria-label={tAuth("product_lists.loading_items_aria")}>
      <div className="space-y-250">
        {PRODUCT_LIST_SKELETON_ROWS.map((row) => (
          <article
            className="flex flex-col gap-300 border-border-secondary border-b bg-base p-300 md:flex-row md:items-center"
            key={row}
          >
            <Skeleton.Rectangle className="h-850 w-850 shrink-0 rounded-md" />
            <div className="min-w-0 flex-1 space-y-150">
              <Skeleton.Text
                containerClassName="max-w-md"
                lastLineWidth="55%"
                noOfLines={2}
                size="sm"
              />
              <Skeleton.Rectangle className="h-500 w-skeleton-heading rounded-md" />
            </div>
            <div className="flex flex-wrap items-center justify-end gap-300">
              <Skeleton.Rectangle className="h-600 w-skeleton-short rounded-md" />
              <Skeleton.Rectangle className="h-600 w-skeleton-caption rounded-md" />
              <Skeleton.Rectangle className="h-600 w-600 rounded-md" />
            </div>
          </article>
        ))}
        <div className="pt-300">
          <div className="ml-auto w-full space-y-200 sm:max-w-product-list-summary">
            <Skeleton.Text noOfLines={2} size="sm" />
            <Skeleton.Rectangle className="h-600 rounded-md" />
          </div>
        </div>
      </div>
    </Skeleton>
  )
}

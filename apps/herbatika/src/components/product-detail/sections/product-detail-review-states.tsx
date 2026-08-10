"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { Skeleton } from "@techsio/ui-kit/atoms/skeleton"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { useTranslations } from "next-intl"

import { ProductReviewCreateDialog } from "@/components/product-detail/sections/product-detail-review-dialog"

export const ProductDetailReviewsSkeleton = () => {
  const tCatalog = useTranslations("catalog")

  return (
    <output
      aria-busy="true"
      aria-label={tCatalog("reviews.loading_aria")}
      className="space-y-500"
    >
      <section className="space-y-350">
        <div className="flex flex-col gap-250 md:flex-row md:items-center md:justify-between">
          <div className="space-y-150">
            <Skeleton.Text noOfLines={1} size="lg" />
            <Skeleton.Text noOfLines={1} size="sm" />
          </div>
          <Skeleton.Rectangle className="h-900 w-full max-w-950" />
        </div>
      </section>

      <div className="space-y-300">
        {Array.from({ length: 3 }, (_, index) => (
          <article
            className="rounded-md border border-border-secondary bg-highlight p-400"
            key={`product-review-list-skeleton-${index + 1}`}
          >
            <div className="flex gap-300">
              <Skeleton.Circle className="size-14 shrink-0" />
              <div className="min-w-0 flex-1 space-y-250">
                <Skeleton.Text noOfLines={2} size="sm" />
                <Skeleton.Text noOfLines={3} size="sm" />
              </div>
            </div>
          </article>
        ))}
      </div>
    </output>
  )
}

export const ProductDetailReviewsUnavailable = () => {
  const tCatalog = useTranslations("catalog")
  return (
    <StatusText showIcon status="warning">
      {tCatalog("reviews.unavailable")}
    </StatusText>
  )
}

export const ProductDetailReviewsLoadError = ({
  onRetry,
}: {
  onRetry: () => void
}) => {
  const tCatalog = useTranslations("catalog")
  return (
    <div className="space-y-300">
      <StatusText showIcon status="error">
        {tCatalog("reviews.load_failed")}
      </StatusText>
      <Button onClick={onRetry} size="sm" variant="secondary">
        {tCatalog("reviews.retry")}
      </Button>
    </div>
  )
}

export const ProductDetailReviewsEmpty = ({
  productId,
}: {
  productId: string
}) => {
  const tCatalog = useTranslations("catalog")
  return (
    <div className="rounded-xs border border-border-secondary bg-highlight p-500">
      <p className="font-semibold text-fg-primary text-lg">
        {tCatalog("reviews.empty_title")}
      </p>
      <p className="mt-150 text-fg-secondary text-md leading-relaxed">
        {tCatalog("reviews.empty_description")}
      </p>
      <div className="mt-300">
        <ProductReviewCreateDialog
          productId={productId}
          triggerLabel={tCatalog("reviews.first_action")}
        />
      </div>
    </div>
  )
}

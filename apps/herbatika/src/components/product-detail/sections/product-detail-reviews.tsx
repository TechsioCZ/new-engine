"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { Pagination } from "@techsio/ui-kit/molecules/pagination"
import { usePathname, useSearchParams } from "next/navigation"
import { createParser, createSerializer, useQueryState } from "nuqs"
import { useEffect } from "react"

import NextLink from "@/components/app-link"
import { ProductReviewCreateDialog } from "@/components/product-detail/sections/product-detail-review-dialog"
import {
  PRODUCT_DETAIL_REVIEWS_SECTION_ID,
  toReviewItem,
} from "@/components/product-detail/sections/product-detail-review-utils"
import {
  PRODUCT_REVIEWS_PAGE_SIZE,
  useProductReviews,
} from "@/lib/storefront/reviews"

import {
  ProductDetailReviewsHeader,
  ProductDetailReviewsSkeleton,
  ProductReviewListItem,
} from "./product-detail-review-parts"

type ProductDetailReviewsProps = { productId?: string | null }

const REVIEW_PAGE_PARAM = "reviews_page"
const reviewPageParser = createParser({
  parse: (value) => {
    const page = Number(value)
    return Number.isInteger(page) && page > 0 ? page : null
  },
  serialize: String,
}).withDefault(1)
const serializeReviewPage = createSerializer({
  [REVIEW_PAGE_PARAM]: reviewPageParser,
})

export function ProductDetailReviews({ productId }: ProductDetailReviewsProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [currentPage, setCurrentPage] = useQueryState(
    REVIEW_PAGE_PARAM,
    reviewPageParser
  )
  const getReviewPageUrl = ({ page }: { page: number }) => {
    const query = searchParams.toString()
    const baseHref = query ? `${pathname}?${query}` : pathname
    const href = serializeReviewPage(baseHref, {
      reviews_page: page <= 1 ? null : page,
    })
    return `${href}#${PRODUCT_DETAIL_REVIEWS_SECTION_ID}`
  }

  const reviewsQuery = useProductReviews({
    ...(productId == null ? {} : { productId }),
    limit: PRODUCT_REVIEWS_PAGE_SIZE,
    page: currentPage,
    enabled: Boolean(productId),
  })
  const reviews = reviewsQuery.reviews
  const totalCount = reviewsQuery.totalCount
  const averageRating = reviewsQuery.summary.average_rating
  const reviewItems = reviews.map(toReviewItem)
  const isInitialLoading = reviewsQuery.isLoading && reviews.length === 0
  const isEmpty = reviewsQuery.isSuccess && totalCount === 0
  const isPageOutOfRange =
    reviewsQuery.isSuccess &&
    reviewsQuery.totalPages > 0 &&
    currentPage > reviewsQuery.totalPages
  const shouldShowPagination = reviewsQuery.totalPages > 1

  useEffect(() => {
    if (!isPageOutOfRange) {
      return
    }

    void setCurrentPage(reviewsQuery.totalPages, { history: "replace" })
  }, [isPageOutOfRange, reviewsQuery.totalPages, setCurrentPage])

  if (!productId) {
    return (
      <StatusText showIcon status="warning">
        Recenzie produktu nie sú momentálne dostupné.
      </StatusText>
    )
  }

  if (isInitialLoading) {
    return <ProductDetailReviewsSkeleton />
  }

  if (isPageOutOfRange) {
    return <ProductDetailReviewsSkeleton />
  }

  if (reviewsQuery.error && reviews.length === 0) {
    return (
      <div className="space-y-300">
        <StatusText showIcon status="error">
          Recenzie sa nepodarilo načítať.
        </StatusText>
        <Button
          onClick={() => {
            void reviewsQuery.query.refetch()
          }}
          size="sm"
          variant="secondary"
        >
          Skúsiť znova
        </Button>
      </div>
    )
  }

  if (isEmpty) {
    return (
      <div className="rounded-xs border border-border-secondary bg-highlight p-500">
        <p className="font-semibold text-fg-primary text-lg">
          Tento produkt zatiaľ nemá recenzie.
        </p>
        <p className="mt-150 text-fg-secondary text-md leading-relaxed">
          Po prvých overených hodnoteniach sa zobrazia priamo v tejto sekcii.
        </p>
        <div className="mt-300">
          <ProductReviewCreateDialog
            productId={productId}
            triggerLabel="Napísať prvú recenziu"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-500">
      <ProductDetailReviewsHeader
        averageRating={averageRating}
        productId={productId}
        totalCount={totalCount}
      />

      {reviewsQuery.isFetching && reviews.length > 0 ? (
        <StatusText showIcon status="default">
          Aktualizujem recenzie
        </StatusText>
      ) : null}

      <div className="space-y-300">
        {reviewItems.map((review) => (
          <ProductReviewListItem key={review.id} review={review} />
        ))}
      </div>

      {shouldShowPagination ? (
        <div className="flex justify-end">
          <Pagination
            count={totalCount}
            getPageUrl={getReviewPageUrl}
            linkAs={NextLink}
            page={currentPage}
            pageSize={PRODUCT_REVIEWS_PAGE_SIZE}
            siblingCount={0}
            size="sm"
            variant="outlined"
          />
        </div>
      ) : null}
    </div>
  )
}

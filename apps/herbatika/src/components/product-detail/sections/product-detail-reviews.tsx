"use client"

import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { Pagination } from "@techsio/ui-kit/molecules/pagination"
import type { PaginationGetPageUrl } from "@techsio/ui-kit/molecules/pagination"
import { useFormatter, useTranslations } from "next-intl"
import { usePathname, useSearchParams } from "next/navigation"
import { createParser, createSerializer, useQueryState } from "nuqs"
import { useEffect } from "react"

import NextLink from "@/components/app-link"
import {
  ProductDetailReviewList,
  ProductDetailReviewsHeader,
} from "@/components/product-detail/sections/product-detail-review-list"
import {
  ProductDetailReviewsEmpty,
  ProductDetailReviewsLoadError,
  ProductDetailReviewsSkeleton,
  ProductDetailReviewsUnavailable,
} from "@/components/product-detail/sections/product-detail-review-states"
import {
  PRODUCT_DETAIL_REVIEWS_SECTION_ID,
  toReviewItem,
} from "@/components/product-detail/sections/product-detail-review-utils"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"
import {
  PRODUCT_REVIEWS_PAGE_SIZE,
  useProductReviews,
} from "@/lib/storefront/reviews"

interface ProductDetailReviewsProps {
  productId?: string | null
}

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

export const ProductDetailReviews = ({
  productId,
}: ProductDetailReviewsProps) => {
  const format = useFormatter()
  const tCatalog = useTranslations("catalog")
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [currentPage, setCurrentPage] = useQueryState(
    REVIEW_PAGE_PARAM,
    reviewPageParser,
  )
  const getReviewPageUrl: PaginationGetPageUrl = ({ page }) => {
    const query = searchParams.toString()
    const baseHref = query === "" ? pathname : `${pathname}?${query}`
    const href = serializeReviewPage(baseHref, {
      reviews_page: page <= 1 ? null : page,
    })
    return `${href}#${PRODUCT_DETAIL_REVIEWS_SECTION_ID}`
  }
  const reviewsQuery = useProductReviews({
    ...(productId === null || productId === undefined ? {} : { productId }),
    enabled: Boolean(productId),
    limit: PRODUCT_REVIEWS_PAGE_SIZE,
    page: currentPage,
  })
  const { reviews, totalCount } = reviewsQuery
  const reviewItems = reviews.map((review) =>
    toReviewItem(review, {
      anonymousLabel: tCatalog("reviews.anonymous"),
      formatDate: (date) =>
        format.dateTime(date, {
          day: "numeric",
          month: "numeric",
          year: "numeric",
        }),
    }),
  )
  const isInitialLoading = reviewsQuery.isLoading && reviews.length === 0
  const isPageOutOfRange =
    reviewsQuery.isSuccess &&
    reviewsQuery.totalPages > 0 &&
    currentPage > reviewsQuery.totalPages

  useEffect(() => {
    if (!isPageOutOfRange) {
      return
    }
    runDetachedPromise(
      setCurrentPage(reviewsQuery.totalPages, { history: "replace" }),
    )
  }, [isPageOutOfRange, reviewsQuery.totalPages, setCurrentPage])

  if (productId === null || productId === undefined || productId === "") {
    return <ProductDetailReviewsUnavailable />
  }
  if (isInitialLoading || isPageOutOfRange) {
    return <ProductDetailReviewsSkeleton />
  }
  if (reviewsQuery.error !== null && reviews.length === 0) {
    return (
      <ProductDetailReviewsLoadError
        onRetry={() => {
          runDetachedPromise(reviewsQuery.query.refetch())
        }}
      />
    )
  }
  if (reviewsQuery.isSuccess && totalCount === 0) {
    return <ProductDetailReviewsEmpty productId={productId} />
  }

  return (
    <div className="space-y-500">
      <ProductDetailReviewsHeader
        averageRating={reviewsQuery.summary.average_rating}
        productId={productId}
        totalCount={totalCount}
      />
      {reviewsQuery.isFetching && reviews.length > 0 ? (
        <StatusText showIcon status="default">
          {tCatalog("reviews.refreshing")}
        </StatusText>
      ) : null}
      <ProductDetailReviewList reviews={reviewItems} />
      {reviewsQuery.totalPages > 1 ? (
        <div className="flex justify-end">
          <Pagination
            count={totalCount}
            getPageUrl={getReviewPageUrl}
            linkAs={NextLink}
            page={currentPage}
            pageSize={PRODUCT_REVIEWS_PAGE_SIZE}
            siblingCount={0}
            size="sm"
            translations={{
              itemLabel: ({ page, totalPages }) =>
                tCatalog("pagination.page_aria", { page, totalPages }),
              nextTriggerLabel: tCatalog("pagination.next_aria"),
              prevTriggerLabel: tCatalog("pagination.previous_aria"),
              rootLabel: tCatalog("pagination.root_aria"),
            }}
            variant="outlined"
          />
        </div>
      ) : null}
    </div>
  )
}

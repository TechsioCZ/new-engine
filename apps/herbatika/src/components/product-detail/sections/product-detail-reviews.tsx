"use client";

import { Button } from "@techsio/ui-kit/atoms/button";
import { Rating } from "@techsio/ui-kit/atoms/rating";
import { Skeleton } from "@techsio/ui-kit/atoms/skeleton";
import { StatusText } from "@techsio/ui-kit/atoms/status-text";
import { Pagination } from "@techsio/ui-kit/molecules/pagination";
import NextLink from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import {
  formatReviewCount,
  formatReviewScore,
  PRODUCT_DETAIL_REVIEWS_SECTION_ID,
  toReviewItem,
} from "@/components/product-detail/sections/product-detail-review-utils";
import { FractionalRating } from "@/components/reviews/fractional-rating";
import type { ReviewItem } from "@/components/reviews/reviews.types";
import {
  PRODUCT_REVIEWS_PAGE_SIZE,
  useProductReviews,
} from "@/lib/storefront/reviews";

type ProductDetailReviewsProps = {
  productId?: string | null;
};

const REVIEW_PAGE_PARAM = "reviews_page";

const resolveReviewInitial = (author: string) =>
  author.trim().charAt(0).toUpperCase() || "A";

const resolveReviewsPage = (value: string | null) => {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
};

function ProductDetailReviewsSkeleton() {
  return (
    <div className="space-y-500" aria-busy="true" aria-label="Načítavam recenzie">
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
    </div>
  );
}

function ProductDetailReviewsHeader({
  averageRating,
  totalCount,
}: {
  averageRating: number;
  totalCount: number;
}) {
  return (
    <header className="flex flex-col gap-350 lg:items-start lg:justify-between">
      <div className="space-y-100">
        <div className="flex flex-wrap items-center gap-300">
          <h2 className="text-3xl leading-tight font-semibold text-fg-primary">
            Hodnotenie produktu{" "}
            <span className="whitespace-nowrap">
              - <span className="text-primary">{formatReviewScore(averageRating)}</span>
            </span>
          </h2>
          <FractionalRating
            className="pointer-events-none"
            label={`Priemerné hodnotenie produktu ${formatReviewScore(averageRating)} z 5`}
            value={averageRating}
          />
        </div>
        <p className="text-sm leading-relaxed text-fg-secondary">
          Na základe {formatReviewCount(totalCount)} hodnotení
        </p>
      </div>

      <Button
        disabled
        size="sm"
        theme="solid"
        variant="primary"
      >
        Napísať recenziu
      </Button>
    </header>
  );
}

function ProductReviewListItem({ review }: { review: ReviewItem }) {
  return (
    <article className="not-last:border-b border-border-secondary p-400">
      <div className="flex gap-300">
        <div className="flex size-36 shrink-0 items-center justify-center rounded-full bg-base">
          <span className="text-2xl leading-none font-normal text-fg-secondary">
            {resolveReviewInitial(review.author)}
          </span>
        </div>

        <div className="min-w-0 flex-1 space-y-250">
          <header className="flex flex-col gap-150 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-100">
              <p className="truncate text-md leading-tight font-semibold text-fg-primary">
                {review.author}
              </p>
              <Rating
                className="pointer-events-none"
                readOnly
                size="sm"
                value={review.rating}
              />
            </div>

            {review.dateLabel ? (
              <p className="shrink-0 text-sm leading-tight text-fg-placeholder">
                {review.dateLabel}
              </p>
            ) : null}
          </header>

          <div className="space-y-150">
            <p className="text-md leading-relaxed text-fg-secondary">
              {review.message}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

export function ProductDetailReviews({ productId }: ProductDetailReviewsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPage = resolveReviewsPage(searchParams.get(REVIEW_PAGE_PARAM));
  const getReviewPageUrl = useCallback(
    ({ page }: { page: number }) => {
      const params = new URLSearchParams(searchParams.toString());

      if (page <= 1) {
        params.delete(REVIEW_PAGE_PARAM);
      } else {
        params.set(REVIEW_PAGE_PARAM, String(page));
      }

      const query = params.toString();
      const href = query ? `${pathname}?${query}` : pathname;

      return `${href}#${PRODUCT_DETAIL_REVIEWS_SECTION_ID}`;
    },
    [pathname, searchParams],
  );

  const reviewsQuery = useProductReviews({
    productId: productId ?? undefined,
    limit: PRODUCT_REVIEWS_PAGE_SIZE,
    page: currentPage,
    enabled: Boolean(productId),
  });
  const reviews = reviewsQuery.reviews;
  const totalCount = reviewsQuery.totalCount;
  const averageRating = reviewsQuery.summary.average_rating;
  const reviewItems = reviews.map(toReviewItem);
  const isInitialLoading = reviewsQuery.isLoading && reviews.length === 0;
  const isEmpty = reviewsQuery.isSuccess && totalCount === 0;
  const shouldShowPagination = reviewsQuery.totalPages > 1;

  if (!productId) {
    return (
      <StatusText showIcon status="warning">
        Recenzie produktu nie sú momentálne dostupné.
      </StatusText>
    );
  }

  if (isInitialLoading) {
    return <ProductDetailReviewsSkeleton />;
  }

  if (reviewsQuery.error && reviews.length === 0) {
    return (
      <div className="space-y-300">
        <StatusText showIcon status="error">
          Recenzie sa nepodarilo načítať.
        </StatusText>
        <Button
          onClick={() => {
            void reviewsQuery.query.refetch();
          }}
          size="sm"
          variant="secondary"
        >
          Skúsiť znova
        </Button>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="rounded-md border border-border-secondary bg-highlight p-500">
        <p className="text-lg font-semibold text-fg-primary">
          Tento produkt zatiaľ nemá recenzie.
        </p>
        <p className="mt-150 text-md leading-relaxed text-fg-secondary">
          Po prvých overených hodnoteniach sa zobrazia priamo v tejto sekcii.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-500">
      <ProductDetailReviewsHeader
        averageRating={averageRating}
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
            size="sm"
            variant="outlined"
            siblingCount={0}
          />
        </div>
      ) : null}
    </div>
  );
}

"use client"

import type { ReviewBase } from "@techsio/storefront-data/reviews/types"

import { storefront } from "./storefront"

export { PRODUCT_REVIEWS_PAGE_SIZE } from "./review-query-config"

const reviewHooks = storefront.hooks.reviews

export type ProductReview = ReviewBase

export const { useProductReviews } = reviewHooks
export const { useCreateProductReview } = reviewHooks

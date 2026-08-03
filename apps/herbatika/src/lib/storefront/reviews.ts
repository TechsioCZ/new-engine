"use client"

import type { ReviewBase } from "@techsio/storefront-data/reviews/types"

import { PRODUCT_REVIEWS_PAGE_SIZE as REVIEWS_PAGE_SIZE } from "./review-query-config"
import { storefront } from "./storefront"

const reviewHooks = storefront.hooks.reviews

export type ProductReview = ReviewBase

export const PRODUCT_REVIEWS_PAGE_SIZE = REVIEWS_PAGE_SIZE

export const useProductReviews = reviewHooks.useProductReviews
export const useCreateProductReview = reviewHooks.useCreateProductReview

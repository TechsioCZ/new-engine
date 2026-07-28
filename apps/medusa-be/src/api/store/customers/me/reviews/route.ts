import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  filterReviewRecords,
  getUniqueReviewProductIds,
  normalizeCustomerReview,
} from "../../../../review-normalizers"
import { getProductsById } from "../../../../review-products"
import type { StoreGetCustomerReviewsSchemaType } from "./validators"

export async function GET(
  req: AuthenticatedMedusaRequest<unknown, StoreGetCustomerReviewsSchemaType>,
  res: MedusaResponse
) {
  const { limit, offset } = req.validatedQuery
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data: reviewResults, metadata } = await query.graph({
    entity: "review",
    fields: [
      "id",
      "content",
      "created_at",
      "customer_id",
      "first_name",
      "last_name",
      "product_id",
      "rating",
      "status",
      "title",
    ],
    filters: {
      customer_id: req.auth_context.actor_id,
    },
    pagination: {
      order: {
        created_at: "DESC",
      },
      skip: offset,
      take: limit,
    },
  })
  const reviews = filterReviewRecords(reviewResults)
  const productsById = await getProductsById(
    req,
    getUniqueReviewProductIds(reviews)
  )

  res.json({
    count: metadata?.count ?? reviews.length,
    limit,
    offset,
    reviews: reviews.map((review) =>
      normalizeCustomerReview(review, productsById)
    ),
  })
}

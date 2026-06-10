import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  normalizePublicReview,
  type ReviewRecord,
} from "../../../../review-normalizers"
import { PRODUCT_REVIEW_MODULE } from "../../../../../modules/product-review"
import type ProductReviewModuleService from "../../../../../modules/product-review/service"
import type { StoreGetProductReviewsSchemaType } from "./validators"

type DatabaseConnection = {
  raw: <T = unknown>(sql: string, bindings?: unknown[]) => Promise<T>
}

type RawRows<T> = T[] | { rows?: T[] }

type ReviewSummaryRow = {
  average_rating: number | string | null
  count: number | string
}

function getRows<T>(result: RawRows<T>) {
  return Array.isArray(result) ? result : (result.rows ?? [])
}

async function getReviewSummary(req: MedusaRequest, productId: string) {
  const pgConnection = req.scope.resolve<DatabaseConnection>(
    ContainerRegistrationKeys.PG_CONNECTION
  )
  const rows = getRows(
    await pgConnection.raw<RawRows<ReviewSummaryRow>>(
      `select count(*)::int as "count",
              round(coalesce(avg("rating"), 0)::numeric, 1)::float as "average_rating"
         from "review"
        where "product_id" = ?
          and "status" = 'approved'
          and "deleted_at" is null`,
      [productId]
    )
  )
  const summary = rows[0]

  return {
    average_rating: Number(summary?.average_rating ?? 0),
    count: Number(summary?.count ?? 0),
  }
}

export async function GET(
  req: MedusaRequest<unknown, StoreGetProductReviewsSchemaType>,
  res: MedusaResponse
) {
  const { limit, offset } = req.validatedQuery
  const productId = req.params.id as string
  const service = req.scope.resolve<ProductReviewModuleService>(
    PRODUCT_REVIEW_MODULE
  )
  const filters = {
    product_id: productId,
    status: "approved",
  }
  const [reviews, count] = await service.listAndCountReviews(filters, {
    order: { created_at: "DESC" },
    skip: offset,
    take: limit,
  })
  const summary = await getReviewSummary(req, productId)

  res.json({
    count,
    limit,
    offset,
    reviews: (reviews as ReviewRecord[]).map(normalizePublicReview),
    summary,
  })
}

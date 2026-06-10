import type { Context } from "@medusajs/framework/types"
import { MedusaService } from "@medusajs/framework/utils"
import Review from "./models/review"
import ReviewToken from "./models/review-token"

type SqlManager = {
  execute: <T = unknown>(sql: string, params?: unknown[]) => Promise<T>
}

type ServiceWithBaseRepository = {
  baseRepository_: {
    getFreshManager: (context?: Context) => SqlManager
  }
}

type ReviewSummaryRow = {
  average_rating: number | string | null
  count: number | string
}

class ProductReviewModuleService extends MedusaService({
  Review,
  ReviewToken,
}) {
  async getReviewSummary(productId: string, sharedContext: Context = {}) {
    const manager = (this as unknown as ServiceWithBaseRepository).baseRepository_.getFreshManager(sharedContext)
    const rows = await manager.execute<ReviewSummaryRow[]>(
      `select count(*)::int as "count",
              round(coalesce(avg("rating"), 0)::numeric, 1)::float as "average_rating"
         from "review"
        where "product_id" = ?
          and "status" = 'approved'
          and "deleted_at" is null`,
      [productId]
    )
    const summary = rows[0]

    return {
      average_rating: Number(summary?.average_rating ?? 0),
      count: Number(summary?.count ?? 0),
    }
  }
}

export default ProductReviewModuleService

import type { Context } from "@medusajs/framework/types"
import { MedusaService } from "@medusajs/framework/utils"
import { raw } from "@medusajs/framework/mikro-orm/core"
import Review from "./models/review"
import ReviewToken from "./models/review-token"

type QueryBuilder = {
  andWhere: (condition: Record<string, unknown> | string, params?: unknown[]) => QueryBuilder
  execute: <T = unknown>(method?: "all" | "get" | "run") => Promise<T>
  select: (fields: unknown[]) => QueryBuilder
  where: (condition: Record<string, unknown>) => QueryBuilder
}

type QueryBuilderManager = {
  createQueryBuilder: (entity: unknown, alias: string) => QueryBuilder
}

type ServiceWithBaseRepository = {
  baseRepository_: {
    getFreshManager: (context?: Context) => QueryBuilderManager
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
    const manager = (
      this as unknown as ServiceWithBaseRepository
    ).baseRepository_.getFreshManager(sharedContext)
    const summary = await manager
      .createQueryBuilder(Review, "review")
      .select([
        raw('count(*)::int as "count"'),
        raw(
          'round(coalesce(avg("review"."rating"), 0)::numeric, 1)::float as "average_rating"'
        ),
      ])
      .where({
        deleted_at: null,
        product_id: productId,
        status: "approved",
      })
      .execute<ReviewSummaryRow>("get")

    return {
      average_rating: Number(summary?.average_rating ?? 0),
      count: Number(summary?.count ?? 0),
    }
  }
}

export default ProductReviewModuleService

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  remoteQueryObjectFromString,
} from "@medusajs/framework/utils"
import {
  escapeLikePattern,
  mapVariantToRuleValueOption,
  validateRuleType,
} from "../../../utils"

/**
 * GET /admin/promotions/rule-value-options/:rule_type/product_variant
 *
 * Returns available product variants for promotion rules.
 * This extends Medusa's rule-value-options to support variant filtering.
 *
 * Query params:
 * - q: Search query (searches in variant title/sku)
 * - value: Filter by specific variant IDs
 * - limit: Pagination limit (default 10)
 * - offset: Pagination offset (default 0)
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const ruleType = req.params.rule_type

  if (!ruleType) {
    throw new Error("rule_type parameter is required")
  }

  validateRuleType(ruleType)

  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)

  // Build filters
  const filters: Record<string, unknown> = {}

  // Handle search query
  const searchQuery = req.query.q as string | undefined
  if (searchQuery) {
    // Search in title or SKU
    const escaped = escapeLikePattern(searchQuery)
    filters.$or = [
      { title: { $ilike: `%${escaped}%` } },
      { sku: { $ilike: `%${escaped}%` } },
    ]
  }

  // Handle specific value filter (for hydrating existing selections)
  const valueFilter = req.query.value as string | string[] | undefined
  if (valueFilter) {
    filters.id = Array.isArray(valueFilter) ? valueFilter : [valueFilter]
  }

  // Pagination (clamped to valid ranges)
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100)
  const offset = Math.max(Number(req.query.offset) || 0, 0)

  const { rows, metadata } = await remoteQuery(
    remoteQueryObjectFromString({
      entryPoint: "product_variant",
      variables: {
        filters,
        skip: offset,
        take: limit,
      },
      fields: ["id", "title", "sku", "product.title"],
    })
  )

  // Format as label/value pairs for the admin UI
  const values = rows.map(mapVariantToRuleValueOption)

  res.json({
    values,
    count: metadata?.count ?? null,
    offset,
    limit,
  })
}

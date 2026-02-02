import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  remoteQueryObjectFromString,
} from "@medusajs/framework/utils"
import { escapeLikePattern, validateRuleType } from "../../../utils"

/**
 * GET /admin/promotions/rule-value-options/:rule_type/producer
 *
 * Returns available producers for promotion rules.
 *
 * Query params:
 * - q: Search query (searches in producer title)
 * - value: Filter by specific producer IDs
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
    filters.title = { $ilike: `%${escapeLikePattern(searchQuery)}%` }
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
      entryPoint: "producer",
      variables: {
        filters,
        skip: offset,
        take: limit,
      },
      fields: ["id", "title", "handle"],
    })
  )

  // Format as label/value pairs for the admin UI
  const values = rows.map(
    (producer: { id: string; title: string; handle: string }) => ({
      label: producer.title,
      value: producer.id,
    })
  )

  res.json({
    values,
    count: metadata?.count ?? null,
    offset,
    limit,
  })
}

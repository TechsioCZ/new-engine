import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import type { RuleValueOptionsQuerySchemaType } from "../../../schema"
import {
  escapeLikePattern,
  mapVariantToRuleValueOption,
  validateRuleType,
} from "../../../utils"

export async function GET(
  req: MedusaRequest<unknown, RuleValueOptionsQuerySchemaType>,
  res: MedusaResponse
) {
  const ruleType = req.params.rule_type

  if (!ruleType) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "rule_type parameter is required"
    )
  }

  validateRuleType(ruleType)

  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const filters: Record<string, unknown> = {}
  const searchQuery = req.validatedQuery.q

  if (searchQuery) {
    const escaped = escapeLikePattern(searchQuery)
    filters.$or = [
      { title: { $ilike: `%${escaped}%` } },
      { sku: { $ilike: `%${escaped}%` } },
    ]
  }

  const valueFilter = req.validatedQuery.value ?? req.validatedQuery.id
  if (valueFilter) {
    filters.id = Array.isArray(valueFilter) ? valueFilter : [valueFilter]
  }

  const limit = req.validatedQuery.limit
  const offset = req.validatedQuery.offset
  const { data, metadata } = await query.graph({
    entity: "product_variant",
    fields: ["id", "title", "sku", "product.title"],
    filters,
    pagination: {
      skip: offset,
      take: limit,
    },
  })

  const values = Array.isArray(data)
    ? data.map(mapVariantToRuleValueOption)
    : []

  res.json({
    values,
    count: metadata?.count ?? 0,
    offset: metadata?.skip ?? offset,
    limit: metadata?.take ?? limit,
  })
}

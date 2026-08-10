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

const get = async (
  req: MedusaRequest<unknown, RuleValueOptionsQuerySchemaType>,
  res: MedusaResponse,
) => {
  const ruleType = req.params["rule_type"]

  if (!(typeof ruleType === "string" && ruleType.length > 0)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "rule_type parameter is required",
    )
  }

  validateRuleType(ruleType)

  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const searchQuery = req.validatedQuery.q
  const escaped =
    typeof searchQuery === "string" && searchQuery.length > 0
      ? escapeLikePattern(searchQuery)
      : undefined
  const valueFilter = req.validatedQuery.value ?? req.validatedQuery.id
  const hasValueFilter =
    (typeof valueFilter === "string" && valueFilter.length > 0) ||
    (Array.isArray(valueFilter) && valueFilter.length > 0)
  const filters = {
    ...(escaped === undefined
      ? {}
      : {
          $or: [
            { title: { $ilike: `%${escaped}%` } },
            { sku: { $ilike: `%${escaped}%` } },
          ],
        }),
    ...(hasValueFilter
      ? { id: Array.isArray(valueFilter) ? valueFilter : [valueFilter] }
      : {}),
  }

  const { limit } = req.validatedQuery
  const { offset } = req.validatedQuery
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
    count: metadata?.count ?? 0,
    limit: metadata?.take ?? limit,
    offset: metadata?.skip ?? offset,
    values,
  })
}

export { get as GET }

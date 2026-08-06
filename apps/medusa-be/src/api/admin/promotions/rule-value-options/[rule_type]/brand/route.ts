import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"

import type { RuleValueOptionsQuerySchemaType } from "../../../schema"
import { escapeLikePattern, validateRuleType } from "../../../utils"

interface BrandRuleValue {
  id: string
  title: string
}

const isBrandRuleValue = (value: unknown): value is BrandRuleValue => {
  if (typeof value !== "object" || value === null) {
    return false
  }

  const id: unknown = Reflect.get(value, "id")
  const title: unknown = Reflect.get(value, "title")

  return typeof id === "string" && typeof title === "string"
}

const get = async (
  req: MedusaRequest<unknown, RuleValueOptionsQuerySchemaType>,
  res: MedusaResponse,
) => {
  const ruleType = req.params["rule_type"]

  if (ruleType === undefined || ruleType === "") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "rule_type parameter is required",
    )
  }

  validateRuleType(ruleType)

  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const filters: Record<string, unknown> = { deleted_at: null }
  const searchQuery = req.validatedQuery.q

  if (searchQuery !== undefined && searchQuery !== "") {
    filters["title"] = { $ilike: `%${escapeLikePattern(searchQuery)}%` }
  }

  const valueFilter = req.validatedQuery.value ?? req.validatedQuery.id
  if (valueFilter !== undefined) {
    filters["id"] = Array.isArray(valueFilter) ? valueFilter : [valueFilter]
  }

  const { limit } = req.validatedQuery
  const { offset } = req.validatedQuery
  const { data, metadata } = await query.graph({
    entity: "brand",
    fields: ["id", "title"],
    filters,
    pagination: {
      skip: offset,
      take: limit,
    },
  })

  const values = Array.isArray(data)
    ? data.flatMap((brand) =>
        isBrandRuleValue(brand)
          ? [{ label: brand.title, value: brand.id }]
          : [],
      )
    : []

  res.json({
    count: metadata?.count ?? 0,
    limit: metadata?.take ?? limit,
    offset: metadata?.skip ?? offset,
    values,
  })
}

export { get as GET }

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import type { RuleValueOptionsQuerySchemaType } from "../../../schema"
import { escapeLikePattern, validateRuleType } from "../../../utils"

type ProducerRuleValue = {
  id: string
  title: string
}

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

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const filters: Record<string, unknown> = {}
  const searchQuery = req.validatedQuery.q

  if (searchQuery) {
    filters.title = { $ilike: `%${escapeLikePattern(searchQuery)}%` }
  }

  const valueFilter = req.validatedQuery.value ?? req.validatedQuery.id
  if (valueFilter) {
    filters.id = Array.isArray(valueFilter) ? valueFilter : [valueFilter]
  }

  const limit = req.validatedQuery.limit
  const offset = req.validatedQuery.offset
  const { data, metadata } = await query.graph({
    entity: "producer",
    fields: ["id", "title"],
    filters,
    pagination: {
      skip: offset,
      take: limit,
    },
  })

  const values = (data as ProducerRuleValue[]).map((producer) => ({
    label: producer.title,
    value: producer.id,
  }))

  res.json({
    values,
    count: metadata?.count ?? 0,
    offset: metadata?.skip ?? offset,
    limit: metadata?.take ?? limit,
  })
}

import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { getProductAttributeService } from "../../../../utils/product-attributes"
import { createProductAttributeDefinitionWorkflow } from "../../../../workflows/product-attribute/workflows/definitions"
import {
  applyProductAttributeStatusFilter,
  escapeProductAttributeLikePattern,
  getDefinitionUsageCountMap,
  parseProductAttributeOrder,
  toProductAttributeDefinitionResponse,
} from "../utils"
import type {
  AdminCreateProductAttributeDefinitionSchemaType,
  AdminGetProductAttributeDefinitionsSchemaType,
} from "../validators"

const get = async (
  req: AuthenticatedMedusaRequest<
    unknown,
    AdminGetProductAttributeDefinitionsSchemaType
  >,
  res: MedusaResponse,
) => {
  const { input_type, is_public, limit, offset, order, q, status } =
    req.validatedQuery
  const filters: Record<string, unknown> = {
    ...(input_type !== undefined && input_type.length > 0
      ? { input_type }
      : {}),
    ...(is_public === undefined ? {} : { is_public }),
  }
  const escapedQuery =
    q !== undefined && q.length > 0
      ? escapeProductAttributeLikePattern(q)
      : undefined
  if (escapedQuery !== undefined && escapedQuery.length > 0) {
    filters["$or"] = [
      { key: { $ilike: `%${escapedQuery}%` } },
      { label: { $ilike: `%${escapedQuery}%` } },
    ]
  }
  applyProductAttributeStatusFilter(filters, status)

  const [definitions, count] = await getProductAttributeService(
    req.scope,
  ).listAndCountProductAttributeDefinitions(filters, {
    order: parseProductAttributeOrder(order),
    skip: offset,
    take: limit,
    withDeleted: status !== "active",
  })
  const usageCounts = await getDefinitionUsageCountMap(
    req.scope,
    definitions.map((definition) => definition.id),
  )

  res.json({
    count,
    definitions: definitions.map((definition) =>
      toProductAttributeDefinitionResponse(
        definition,
        usageCounts.get(definition.id) ?? 0,
      ),
    ),
    limit,
    offset,
  })
}

const post = async (
  req: AuthenticatedMedusaRequest<AdminCreateProductAttributeDefinitionSchemaType>,
  res: MedusaResponse,
) => {
  const { result } = await createProductAttributeDefinitionWorkflow(
    req.scope,
  ).run({
    input: req.validatedBody,
  })

  res.status(201).json({
    definition: toProductAttributeDefinitionResponse(result, 0),
  })
}

export { get as GET, post as POST }

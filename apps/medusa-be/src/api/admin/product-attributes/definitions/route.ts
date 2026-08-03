import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import {
  getProductAttributeService,
  type ProductAttributeDefinitionRecord,
} from "../../../../utils/product-attributes"
import {
  type CreateProductAttributeDefinitionInput,
  createProductAttributeDefinitionWorkflow,
} from "../../../../workflows/product-attribute"
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

export async function GET(
  req: AuthenticatedMedusaRequest<
    unknown,
    AdminGetProductAttributeDefinitionsSchemaType
  >,
  res: MedusaResponse
) {
  const { input_type, is_public, limit, offset, order, q, status } =
    req.validatedQuery
  const filters: Record<string, unknown> = {
    ...(input_type ? { input_type } : {}),
    ...(is_public === undefined ? {} : { is_public }),
  }
  const escapedQuery = q ? escapeProductAttributeLikePattern(q) : undefined
  if (escapedQuery) {
    filters["$or"] = [
      { key: { $ilike: `%${escapedQuery}%` } },
      { label: { $ilike: `%${escapedQuery}%` } },
    ]
  }
  applyProductAttributeStatusFilter(filters, status)

  const [definitions, count] = (await getProductAttributeService(
    req.scope
  ).listAndCountProductAttributeDefinitions(filters, {
    order: parseProductAttributeOrder(order),
    skip: offset,
    take: limit,
    withDeleted: status !== "active",
  })) as [ProductAttributeDefinitionRecord[], number]
  const usageCounts = await getDefinitionUsageCountMap(
    req.scope,
    definitions.map((definition) => definition.id)
  )

  res.json({
    count,
    definitions: definitions.map((definition) =>
      toProductAttributeDefinitionResponse(
        definition,
        usageCounts.get(definition.id) ?? 0
      )
    ),
    limit,
    offset,
  })
}

export async function POST(
  req: AuthenticatedMedusaRequest<AdminCreateProductAttributeDefinitionSchemaType>,
  res: MedusaResponse
) {
  const { result } = await createProductAttributeDefinitionWorkflow(
    req.scope
  ).run({
    input: req.validatedBody as CreateProductAttributeDefinitionInput,
  })

  res.status(201).json({
    definition: toProductAttributeDefinitionResponse(result, 0),
  })
}

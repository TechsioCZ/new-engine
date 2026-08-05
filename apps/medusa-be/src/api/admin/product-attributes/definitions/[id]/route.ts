import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import {
  deleteProductAttributeDefinitionsWorkflow,
  updateProductAttributeDefinitionWorkflow,
} from "../../../../../workflows/product-attribute"
import {
  getDefinitionUsageCountMap,
  retrieveProductAttributeDefinitionOrThrow,
  toProductAttributeDefinitionResponse,
} from "../../utils"
import type { AdminUpdateProductAttributeDefinitionSchemaType } from "../../validators"

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) {
  const definitionId = req.params["id"] ?? ""
  const definition = await retrieveProductAttributeDefinitionOrThrow(
    req.scope,
    definitionId,
    true,
  )
  const usageCounts = await getDefinitionUsageCountMap(req.scope, [
    definition.id,
  ])
  res.json({
    definition: toProductAttributeDefinitionResponse(
      definition,
      usageCounts.get(definition.id) ?? 0,
    ),
  })
}

export async function POST(
  req: AuthenticatedMedusaRequest<AdminUpdateProductAttributeDefinitionSchemaType>,
  res: MedusaResponse,
) {
  const definitionId = req.params["id"] ?? ""
  const { input_type, is_public, label } = req.validatedBody
  const { result } = await updateProductAttributeDefinitionWorkflow(
    req.scope,
  ).run({
    input: {
      id: definitionId,
      ...(input_type === undefined ? {} : { input_type }),
      ...(is_public === undefined ? {} : { is_public }),
      ...(label === undefined ? {} : { label }),
    },
  })
  const usageCounts = await getDefinitionUsageCountMap(req.scope, [result.id])
  res.json({
    definition: toProductAttributeDefinitionResponse(
      result,
      usageCounts.get(result.id) ?? 0,
    ),
  })
}

export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) {
  const { result } = await deleteProductAttributeDefinitionsWorkflow(
    req.scope,
  ).run({
    input: { ids: [req.params["id"] ?? ""] },
  })
  res.json({ definition: result[0] ?? null })
}

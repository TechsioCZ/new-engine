import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { restoreProductAttributeDefinitionsWorkflow } from "../../../../../../workflows/product-attribute"
import {
  getDefinitionUsageCountMap,
  toProductAttributeDefinitionResponse,
} from "../../../utils"

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { result } = await restoreProductAttributeDefinitionsWorkflow(
    req.scope
  ).run({
    input: { ids: [req.params["id"] ?? ""] },
  })
  const definition = result[0]
  const usageCounts = definition
    ? await getDefinitionUsageCountMap(req.scope, [definition.id])
    : new Map<string, number>()
  res.json({
    definition: definition
      ? toProductAttributeDefinitionResponse(
          definition,
          usageCounts.get(definition.id) ?? 0
        )
      : null,
  })
}

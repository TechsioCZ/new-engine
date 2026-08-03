import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { restoreProductAttributeOptionsWorkflow } from "../../../../../../workflows/product-attribute"
import {
  getOptionUsageCountMap,
  toProductAttributeOptionResponse,
} from "../../../utils"

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { result } = await restoreProductAttributeOptionsWorkflow(
    req.scope
  ).run({
    input: { ids: [req.params.id ?? ""] },
  })
  const option = result[0]
  const usageCounts = option
    ? await getOptionUsageCountMap(req.scope, [option.id])
    : new Map<string, number>()
  res.json({
    option: option
      ? toProductAttributeOptionResponse(
          option,
          usageCounts.get(option.id) ?? 0
        )
      : null,
  })
}

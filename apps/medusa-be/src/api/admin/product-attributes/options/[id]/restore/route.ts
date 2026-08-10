import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { restoreProductAttributeOptionsWorkflow } from "../../../../../../workflows/product-attribute/workflows/options"
import {
  getOptionUsageCountMap,
  toProductAttributeOptionResponse,
} from "../../../utils"

const postHandler = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  const { result } = await restoreProductAttributeOptionsWorkflow(
    req.scope,
  ).run({
    input: { ids: [req.params["id"] ?? ""] },
  })
  const [option] = result
  const usageCounts = option
    ? await getOptionUsageCountMap(req.scope, [option.id])
    : new Map<string, number>()
  res.json({
    option: option
      ? toProductAttributeOptionResponse(
          option,
          usageCounts.get(option.id) ?? 0,
        )
      : null,
  })
}

export { postHandler as POST }

import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import {
  deleteProductAttributeOptionsWorkflow,
  updateProductAttributeOptionWorkflow,
} from "../../../../../workflows/product-attribute/workflows/options"
import {
  getOptionUsageCountMap,
  retrieveProductAttributeOptionOrThrow,
  toProductAttributeOptionResponse,
} from "../../utils"
import type { AdminUpdateProductAttributeOptionSchemaType } from "../../validators"

const getProductAttributeOption = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  const optionId = req.params["id"] ?? ""
  const option = await retrieveProductAttributeOptionOrThrow(
    req.scope,
    optionId,
    true,
  )
  const usageCounts = await getOptionUsageCountMap(req.scope, [option.id])
  res.json({
    option: toProductAttributeOptionResponse(
      option,
      usageCounts.get(option.id) ?? 0,
    ),
  })
}

const updateProductAttributeOption = async (
  req: AuthenticatedMedusaRequest<AdminUpdateProductAttributeOptionSchemaType>,
  res: MedusaResponse,
) => {
  const optionId = req.params["id"] ?? ""
  const { result } = await updateProductAttributeOptionWorkflow(req.scope).run({
    input: {
      id: optionId,
      ...req.validatedBody,
    },
  })
  const usageCounts = await getOptionUsageCountMap(req.scope, [result.id])
  res.json({
    option: toProductAttributeOptionResponse(
      result,
      usageCounts.get(result.id) ?? 0,
    ),
  })
}

const deleteProductAttributeOption = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  const { result } = await deleteProductAttributeOptionsWorkflow(req.scope).run(
    {
      input: { ids: [req.params["id"] ?? ""] },
    },
  )
  res.json({ option: result[0] ?? null })
}

export {
  deleteProductAttributeOption as DELETE,
  getProductAttributeOption as GET,
  updateProductAttributeOption as POST,
}

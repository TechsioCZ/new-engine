import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import {
  deleteProductAttributeOptionsWorkflow,
  updateProductAttributeOptionWorkflow,
} from "../../../../../workflows/product-attribute"
import {
  getOptionUsageCountMap,
  retrieveProductAttributeOptionOrThrow,
  toProductAttributeOptionResponse,
} from "../../utils"
import type { AdminUpdateProductAttributeOptionSchemaType } from "../../validators"

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const optionId = req.params.id ?? ""
  const option = await retrieveProductAttributeOptionOrThrow(
    req.scope,
    optionId,
    true
  )
  const usageCounts = await getOptionUsageCountMap(req.scope, [option.id])
  res.json({
    option: toProductAttributeOptionResponse(
      option,
      usageCounts.get(option.id) ?? 0
    ),
  })
}

export async function POST(
  req: AuthenticatedMedusaRequest<AdminUpdateProductAttributeOptionSchemaType>,
  res: MedusaResponse
) {
  const optionId = req.params.id ?? ""
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
      usageCounts.get(result.id) ?? 0
    ),
  })
}

export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { result } = await deleteProductAttributeOptionsWorkflow(req.scope).run(
    {
      input: { ids: [req.params.id ?? ""] },
    }
  )
  res.json({ option: result[0] ?? null })
}

import { getOrdersListWorkflow } from "@medusajs/medusa/core-flows"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const variables = {
    filters: {
      ...req.filterableFields,
      is_draft_order: false,
    },
    ...req.queryConfig.pagination,
  }

  const workflow = getOrdersListWorkflow(req.scope)
  const { result } = await workflow.run({
    input: {
      fields: req.queryConfig.fields,
      variables,
    },
  })

  if (Array.isArray(result)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Unexpected orders workflow result"
    )
  }

  const { rows: orders, metadata } = result

  res.json({
    orders,
    count: metadata.count,
    offset: metadata.skip,
    limit: metadata.take,
  })
}

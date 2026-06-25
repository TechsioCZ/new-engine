import { getOrdersListWorkflow } from "@medusajs/core-flows"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

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

  const orders = Array.isArray(result) ? result : result.rows
  const metadata = Array.isArray(result)
    ? {
        count: result.length,
        skip: req.queryConfig.pagination?.skip ?? 0,
        take: req.queryConfig.pagination?.take ?? result.length,
      }
    : result.metadata

  res.json({
    orders,
    count: metadata.count,
    offset: metadata.skip,
    limit: metadata.take,
  })
}

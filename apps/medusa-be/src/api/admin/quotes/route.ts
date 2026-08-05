import type { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import type { AdminGetQuoteParamsType } from "./validators"

export const GET = async (
  req: MedusaRequest<AdminGetQuoteParamsType>,
  res: MedusaResponse,
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { fields, pagination } = req.queryConfig
  const skip = pagination.skip ?? 0
  const { data: quotes, metadata } = await query.graph({
    entity: "quote",
    fields,
    pagination: {
      ...pagination,
      skip,
    },
  })

  res.json({
    count: metadata?.count ?? 0,
    limit: metadata?.take ?? pagination.take,
    offset: metadata?.skip ?? skip,
    quotes,
  })
}

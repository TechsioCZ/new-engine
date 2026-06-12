import type { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { AdminGetQuoteParamsType } from "./validators"

export const GET = async (
  req: MedusaRequest<AdminGetQuoteParamsType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { fields, pagination } = req.remoteQueryConfig
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
    quotes,
    count: metadata?.count ?? 0,
    offset: metadata?.skip ?? skip,
    limit: metadata?.take ?? pagination.take,
  })
}

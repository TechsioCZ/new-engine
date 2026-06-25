import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data, metadata } = await query.graph({
    entity: "customer",
    fields: req.queryConfig.fields,
    filters: req.filterableFields,
    pagination: req.queryConfig.pagination,
  })
  const paginationMetadata = metadata ?? {
    count: Array.isArray(data) ? data.length : 0,
    skip: 0,
    take: Array.isArray(data) ? data.length : 0,
  }

  res.json({
    customers: data,
    count: paginationMetadata.count,
    offset: paginationMetadata.skip,
    limit: paginationMetadata.take,
  })
}

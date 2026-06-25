import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  remoteQueryObjectFromString,
} from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const query = remoteQueryObjectFromString({
    entryPoint: "customers",
    variables: {
      filters: req.filterableFields,
      ...req.queryConfig.pagination,
    },
    fields: req.queryConfig.fields,
  })

  const { rows: customers, metadata } = await remoteQuery(query)

  res.json({
    customers,
    count: metadata.count,
    offset: metadata.skip,
    limit: metadata.take,
  })
}

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  remoteQueryObjectFromString,
} from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const query = remoteQueryObjectFromString({
    entryPoint: "region",
    fields: req.queryConfig.fields,
    variables: {
      filters: req.filterableFields,
      ...req.queryConfig.pagination,
    },
  })

  const { rows: regions, metadata } = await remoteQuery(query)

  res.json({
    count: metadata.count,
    limit: metadata.take,
    offset: metadata.skip,
    regions,
  })
}

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
  remoteQueryObjectFromString,
} from "@medusajs/framework/utils"

const get = async (req: MedusaRequest, res: MedusaResponse) => {
  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const query = remoteQueryObjectFromString({
    entryPoint: "region",
    fields: req.queryConfig.fields,
    variables: {
      filters: req.filterableFields,
      ...req.queryConfig.pagination,
    },
  })

  const result: unknown = await remoteQuery(query)
  if (typeof result !== "object" || result === null) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Region query returned an invalid result",
    )
  }
  if (!("rows" in result) || !Array.isArray(result.rows)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Region query returned invalid rows",
    )
  }
  if (!("metadata" in result)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Region query returned no metadata",
    )
  }
  const { metadata } = result
  if (typeof metadata !== "object" || metadata === null) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Region query returned invalid metadata",
    )
  }
  if (!("count" in metadata) || typeof metadata.count !== "number") {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Region query returned an invalid count",
    )
  }
  if (!("take" in metadata) || typeof metadata.take !== "number") {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Region query returned an invalid limit",
    )
  }
  if (!("skip" in metadata) || typeof metadata.skip !== "number") {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Region query returned an invalid offset",
    )
  }

  res.json({
    count: metadata.count,
    limit: metadata.take,
    offset: metadata.skip,
    regions: result.rows,
  })
}

export { get as GET }

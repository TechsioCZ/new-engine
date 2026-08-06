import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import {
  fetchCommercialValuesSnapshotOrder,
  requireCommercialValuesOrderId,
  toCommercialValuesSnapshot,
} from "./utils"

const getCommercialValues = async (req: MedusaRequest, res: MedusaResponse) => {
  const id = requireCommercialValuesOrderId(req.params["id"])
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { activeOrderChange, order } = await fetchCommercialValuesSnapshotOrder(
    req.scope,
    query,
    id,
  )

  res.json({
    commercial_values: toCommercialValuesSnapshot(order, activeOrderChange),
  })
}

export { getCommercialValues as GET }

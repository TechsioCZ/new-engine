import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { restoreBrandsWorkflow } from "../../../../../workflows/brand"
import {
  getBrandActiveProductCounts,
  retrieveBrandOrThrow,
  toBrandResponse,
} from "../../utils"

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const id = req.params["id"] ?? ""

  await restoreBrandsWorkflow(req.scope).run({
    input: {
      ids: [id],
    },
  })

  const brand = await retrieveBrandOrThrow(req.scope, id)
  const activeProductCounts = await getBrandActiveProductCounts(req.scope, [
    brand.id,
  ])

  res.status(200).json({
    brand: toBrandResponse(brand, activeProductCounts.get(brand.id) ?? 0),
  })
}

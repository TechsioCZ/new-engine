import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { StoreBrandsSchemaType } from "./validators"

export async function GET(
  req: MedusaRequest<unknown, StoreBrandsSchemaType>,
  res: MedusaResponse
) {
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data: brands } = await query.graph({
    entity: "brand",
    ...req.queryConfig,
  })

  res.json({ brands })
}

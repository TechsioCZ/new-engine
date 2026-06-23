import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import type { z } from "@medusajs/framework/zod"
import { createFindParams } from "@medusajs/medusa/api/utils/validators"

export const StoreBrandsDetailSchema = createFindParams()

export type StoreBrandsSchemaType = z.infer<typeof StoreBrandsDetailSchema>

export async function GET(
  req: MedusaRequest<unknown, StoreBrandsSchemaType>,
  res: MedusaResponse
) {
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data: brands } = await query.graph({
    entity: "brand",
    filters: {
      id: req.params.id ?? "-1",
    },
    ...req.queryConfig,
  })

  const brand = brands[0]
  if (!brand) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Brand with id "${req.params.id}" was not found`
    )
  }

  res.json(brand)
}

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createFindParams } from "@medusajs/medusa/api/utils/validators"
import type { z } from "@medusajs/framework/zod"

export const StoreProducersSchema = createFindParams()

export type StoreProducersSchemaType = z.infer<typeof StoreProducersSchema>

export async function GET(
  req: MedusaRequest<unknown, StoreProducersSchemaType>,
  res: MedusaResponse
) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: producers } = await query.graph({
    entity: "producer",
    ...req.queryConfig,
  })

  res.json({ producers })
}

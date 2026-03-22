import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createFindParams } from "@medusajs/medusa/api/utils/validators"
import type { z } from "@medusajs/framework/zod"
import { ProductProducerLink } from "../../../../../links/product-producer"

export const StoreProducersDetailProductsSchema = createFindParams()

export type StoreProducersDetailProductsSchemaType = z.infer<
  typeof StoreProducersDetailProductsSchema
>

export async function GET(
  req: MedusaRequest<unknown, StoreProducersDetailProductsSchemaType>,
  res: MedusaResponse
) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: productIds } = await query.graph({
    entity: ProductProducerLink.entryPoint,
    filters: {
      producer_id: req.params.id ?? "-1",
    },
    fields: ["product_id"],
  })

  const { data: products } = await query.graph({
    entity: "product",
    filters: {
      id: {
        $in: productIds.map((i) => i.product_id),
      },
    },
    ...req.queryConfig,
  })

  res.json({ products })
}

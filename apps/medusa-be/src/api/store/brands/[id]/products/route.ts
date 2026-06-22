import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { z } from "@medusajs/framework/zod"
import { createFindParams } from "@medusajs/medusa/api/utils/validators"
import { ProductBrandLink } from "../../../../../links/product-brand"

export const StoreBrandsDetailProductsSchema = createFindParams()

export type StoreBrandsDetailProductsSchemaType = z.infer<
  typeof StoreBrandsDetailProductsSchema
>

export async function GET(
  req: MedusaRequest<unknown, StoreBrandsDetailProductsSchemaType>,
  res: MedusaResponse
) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: productIds } = await query.graph({
    entity: ProductBrandLink.entryPoint,
    filters: {
      brand_id: req.params.id ?? "-1",
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

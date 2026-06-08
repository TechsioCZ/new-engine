import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { createCustomerProductListWorkflow } from "../../../../workflows/product-list/workflows/create-customer-product-list"
import { toProductListResponse } from "../utils"
import type { StoreCreateFavoriteProductListSchemaType } from "../validators"

export async function POST(
  req: AuthenticatedMedusaRequest<StoreCreateFavoriteProductListSchemaType>,
  res: MedusaResponse
) {
  const { result } = await createCustomerProductListWorkflow(req.scope).run({
    input: {
      customer_id: req.auth_context.actor_id,
      data: req.validatedBody,
      type: "favorite",
    },
  })

  res.status(200).json({
    created: result.created,
    product_list: toProductListResponse(result.product_list),
  })
}

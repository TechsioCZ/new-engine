import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { omitUndefined } from "@techsio/std/object"

import { createCustomerProductListWorkflow } from "../../../../workflows/product-list/workflows/create-customer-product-list"
import { toProductListResponse } from "../utils"
import type { StoreCreateFavoriteProductListSchemaType } from "../validators"

const post = async (
  req: AuthenticatedMedusaRequest<StoreCreateFavoriteProductListSchemaType>,
  res: MedusaResponse,
) => {
  const { result } = await createCustomerProductListWorkflow(req.scope).run({
    input: {
      customer_id: req.auth_context.actor_id,
      data: omitUndefined(req.validatedBody),
      type: "favorite",
    },
  })

  res.status(200).json({
    created: result.created,
    product_list: toProductListResponse(result.product_list),
  })
}

export { post as POST }

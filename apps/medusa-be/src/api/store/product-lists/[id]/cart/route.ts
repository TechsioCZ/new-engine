import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import type {
  ICartModuleService,
  MedusaContainer,
} from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { createCartFromProductListWorkflow } from "../../../../../workflows/product-list/workflows/create-cart-from-product-list"
import {
  type StoreCreateProductListCartSchemaType,
  StoreProductListParamsSchema,
} from "../../validators"

const refetchCart = async (id: string, scope: MedusaContainer) => {
  const cartService = scope.resolve<ICartModuleService>(Modules.CART)
  const cart = await cartService.retrieveCart(id, {
    relations: ["items"],
  })

  return cart
}

export async function POST(
  req: AuthenticatedMedusaRequest<StoreCreateProductListCartSchemaType>,
  res: MedusaResponse
) {
  const { id: listId } = StoreProductListParamsSchema.parse(req.params)
  const { result } = await createCartFromProductListWorkflow(req.scope).run({
    input: {
      country_code: req.validatedBody.country_code,
      customer_id: req.auth_context.actor_id,
      email: req.validatedBody.email,
      list_id: listId,
      region_id: req.validatedBody.region_id,
      sales_channel_id: req.validatedBody.sales_channel_id,
    },
  })

  const cart = await refetchCart(result.id, req.scope)

  res.status(200).json({ cart })
}

import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import type {
  ICartModuleService,
  MedusaContainer,
} from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { omitUndefined } from "@techsio/std/object"

import { createCartFromProductListWorkflow } from "../../../../../workflows/product-list/workflows/create-cart-from-product-list"
import { StoreProductListParamsSchema } from "../../validators"
import type { StoreCreateProductListCartSchemaType } from "../../validators"

const refetchCart = async (id: string, scope: MedusaContainer) => {
  const cartService = scope.resolve<ICartModuleService>(Modules.CART)
  const cart = await cartService.retrieveCart(id, {
    relations: ["items"],
  })

  return cart
}

const post = async (
  req: AuthenticatedMedusaRequest<StoreCreateProductListCartSchemaType>,
  res: MedusaResponse,
) => {
  const { id: listId } = StoreProductListParamsSchema.parse(req.params)
  const { result } = await createCartFromProductListWorkflow(req.scope).run({
    input: omitUndefined({
      ...req.validatedBody,
      customer_id: req.auth_context.actor_id,
      list_id: listId,
    }),
  })

  const cart = await refetchCart(result.id, req.scope)

  res.status(200).json({ cart })
}

export { post as POST }

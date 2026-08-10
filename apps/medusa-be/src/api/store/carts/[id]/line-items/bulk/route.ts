import type { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { addToCartWorkflow } from "@medusajs/medusa/core-flows"

import { requirePathParam } from "../../../../../../utils/path-params"
import type { StoreAddLineItemsBulkType } from "../../../validators"

const post = async (
  req: MedusaRequest<StoreAddLineItemsBulkType>,
  res: MedusaResponse,
) => {
  const id = requirePathParam(req.params["id"], "Cart id")
  const { line_items } = req.validatedBody
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: cartData } = await query.graph(
    {
      entity: "cart",
      fields: req.queryConfig.fields,
      filters: { id },
    },
    { throwIfKeyNotFound: true },
  )
  const cart = z
    .array(z.object({ id: z.string() }).loose())
    .parse(cartData)
    .at(0)

  if (cart === undefined) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Cart ${id} was not found`,
    )
  }

  const workflowInput = {
    cart_id: cart.id,
    items: line_items,
  }

  await addToCartWorkflow(req.scope).run({
    input: workflowInput,
  })

  const { data: updatedCartData } = await query.graph(
    {
      entity: "cart",
      fields: req.queryConfig.fields,
      filters: { id },
    },
    { throwIfKeyNotFound: true },
  )
  const updatedCart = z
    .array(z.object({ id: z.string() }).loose())
    .parse(updatedCartData)
    .at(0)

  res.json({ cart: updatedCart })
}

export { post as POST }

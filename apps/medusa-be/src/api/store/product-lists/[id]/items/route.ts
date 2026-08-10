import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { omitUndefined } from "@techsio/std/object"

import { createProductListItemWorkflow } from "../../../../../workflows/product-list/workflows/create-product-list-item"
import {
  toProductListItemResponse,
  withProductListItemSelections,
} from "../../utils"
import { StoreProductListParamsSchema } from "../../validators"
import type { StoreCreateProductListItemSchemaType } from "../../validators"

const postHandler = async (
  req: AuthenticatedMedusaRequest<StoreCreateProductListItemSchemaType>,
  res: MedusaResponse,
) => {
  const { id: listId } = StoreProductListParamsSchema.parse(req.params)
  const { result: item } = await createProductListItemWorkflow(req.scope).run({
    input: omitUndefined({
      ...req.validatedBody,
      customer_id: req.auth_context.actor_id,
      list_id: listId,
    }),
  })
  const [itemWithSelection] = await withProductListItemSelections(req.scope, [
    item,
  ])

  res.status(200).json({
    item: toProductListItemResponse(itemWithSelection ?? item),
  })
}

export { postHandler as POST }

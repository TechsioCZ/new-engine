import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { updateOrderBusinessStatusesWorkflow } from "../../../../../workflows/order-business-status/update-order-business-statuses"
import {
  fetchOrderBusinessStatusOrder,
  toOrderBusinessStatusSummary,
} from "../../../order-business-statuses/utils"
import type { PostAdminOrderBusinessStatusSchemaType } from "./validators"

export async function POST(
  req: MedusaRequest<PostAdminOrderBusinessStatusSchemaType>,
  res: MedusaResponse
) {
  const { id } = req.params
  const { status } = req.validatedBody

  if (!id) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Order id is missing")
  }

  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const order = await fetchOrderBusinessStatusOrder(query, id)

  if (!order) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Order was not found")
  }

  await updateOrderBusinessStatusesWorkflow(req.scope).run({
    input: { order_ids: [id], status },
  })

  const updatedOrder = await fetchOrderBusinessStatusOrder(query, id)

  res.json({
    order: toOrderBusinessStatusSummary(updatedOrder ?? order),
  })
}

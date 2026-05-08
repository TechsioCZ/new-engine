import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import {
  buildOrderBusinessStatusMetadata,
  fetchOrderBusinessStatusOrder,
  toOrderBusinessStatusSummary,
} from "../../../order-business-statuses/utils"
import type { PostAdminOrderBusinessStatusSchemaType } from "./validators"

type OrderService = {
  updateOrders: (
    id: string,
    data: { metadata: Record<string, unknown> }
  ) => Promise<unknown>
}

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

  const metadata = buildOrderBusinessStatusMetadata(order.metadata, status)
  const orderService = req.scope.resolve<OrderService>(Modules.ORDER)

  await orderService.updateOrders(id, { metadata })

  const updatedOrder = await fetchOrderBusinessStatusOrder(query, id)

  res.json({
    order: toOrderBusinessStatusSummary(updatedOrder ?? { ...order, metadata }),
  })
}

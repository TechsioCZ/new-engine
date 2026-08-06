import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"

import { definedProperties } from "../../../../../utils/defined-properties"
import {
  fetchOrderById,
  formatTotal,
  getOrderDisplayId,
  getPaymentUrl,
  toPaymentReminderOrderResponse,
} from "../../../../../utils/order-payment-reminders"
import { getMedusaStoreName } from "../../../../../utils/store-name"
import { sendOrderPaymentReminderWorkflow } from "../../../../../workflows/send-order-payment-reminder"

const post = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params

  if (id === undefined || id === "") {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Order id is missing")
  }

  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const order = await fetchOrderById(query, id)

  if (order === undefined || order === null) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Order was not found")
  }

  if (order.email === undefined || order.email === null || order.email === "") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Order has no customer email",
    )
  }

  await sendOrderPaymentReminderWorkflow(req.scope).run({
    input: definedProperties({
      customer_id: order.customer_id ?? undefined,
      email: order.email,
      order_display_id: getOrderDisplayId(order),
      order_id: order.id,
      payment_url: getPaymentUrl(order),
      store_name: await getMedusaStoreName(
        req.scope as Record<string, unknown>,
      ),
      total: formatTotal(order),
    }),
  })

  res.json({
    order: toPaymentReminderOrderResponse(order),
    sent: true,
  })
}

export { post as POST }

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import {
  getOrderEmailTemplate,
  isOrderEmailTemplate,
} from "../../../../../utils/order-email-templates"
import {
  fetchOrderById,
  formatTotal,
  getOrderDisplayId,
  getPaymentUrl,
  toPaymentReminderOrderResponse,
} from "../../../../../utils/order-payment-reminders"
import { sendOrderPaymentReminderWorkflow } from "../../../../../workflows/send-order-payment-reminder"

type SendOrderEmailBody = {
  template?: string
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const body = (req.body ?? {}) as SendOrderEmailBody

  if (!id) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Order id is missing")
  }

  if (!isOrderEmailTemplate(body.template)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Order email template is not supported"
    )
  }

  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const order = await fetchOrderById(query, id)

  if (!order) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Order was not found")
  }

  if (!order.email) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Order has no customer email"
    )
  }

  const template = getOrderEmailTemplate(body.template)

  if (!template) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Order email template is not supported"
    )
  }

  switch (template.template) {
    case "order-payment-reminder":
      await sendOrderPaymentReminderWorkflow(req.scope).run({
        input: {
          customer_id: order.customer_id ?? undefined,
          email: order.email,
          order_display_id: getOrderDisplayId(order),
          order_id: order.id,
          payment_url: getPaymentUrl(order),
          store_name: process.env.STORE_NAME,
          total: formatTotal(order),
        },
      })
      break
    default:
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Order email template is not supported"
      )
  }

  res.json({
    order: toPaymentReminderOrderResponse(order),
    sent: true,
    template,
  })
}

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { omitUndefined } from "@techsio/std/object"

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
import { getMedusaStoreName } from "../../../../../utils/store-name"
import { sendOrderPaymentReminderWorkflow } from "../../../../../workflows/send-order-payment-reminder"
import type { PostAdminOrderEmailSchemaType } from "./validators"

const UNSUPPORTED_TEMPLATE_MESSAGE = "Order email template is not supported"

const postOrderEmail = async (
  req: MedusaRequest<PostAdminOrderEmailSchemaType>,
  res: MedusaResponse,
) => {
  const { id } = req.params
  const { template: templateName } = req.validatedBody

  if (id === undefined || id.length === 0) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Order id is missing")
  }

  if (!isOrderEmailTemplate(templateName)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      UNSUPPORTED_TEMPLATE_MESSAGE,
    )
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

  const template = getOrderEmailTemplate(templateName)

  if (template === undefined) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      UNSUPPORTED_TEMPLATE_MESSAGE,
    )
  }

  switch (template.template) {
    case "order-payment-reminder": {
      await sendOrderPaymentReminderWorkflow(req.scope).run({
        input: omitUndefined({
          customer_id: order.customer_id ?? undefined,
          email: order.email,
          order_display_id: getOrderDisplayId(order),
          order_id: order.id,
          payment_url: getPaymentUrl(order),
          store_name: await getMedusaStoreName(req.scope),
          total: formatTotal(order),
        }),
      })
      break
    }
    default: {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        UNSUPPORTED_TEMPLATE_MESSAGE,
      )
    }
  }

  res.json({
    order: toPaymentReminderOrderResponse(order),
    sent: true,
    template,
  })
}

export { postOrderEmail as POST }

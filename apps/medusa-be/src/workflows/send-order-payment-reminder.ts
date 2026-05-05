import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { sendNotificationStep } from "./steps/send-notification"

type WorkflowInput = {
  customer_id?: string
  email: string
  order_display_id: string
  order_id: string
  payment_url: string
  store_name?: string
  total?: string
}

export const sendOrderPaymentReminderWorkflow = createWorkflow(
  "send-order-payment-reminder",
  ({
    customer_id,
    email,
    order_display_id,
    order_id,
    payment_url,
    store_name,
    total,
  }: WorkflowInput) => {
    const notification = sendNotificationStep([
      {
        to: email,
        channel: "email",
        template: "order-payment-reminder",
        trigger_type: "order.payment_reminder",
        resource_id: order_id,
        resource_type: "order",
        receiver_id: customer_id,
        data: {
          order_display_id,
          order_id,
          payment_url,
          store_name,
          total,
        },
      },
    ])

    return new WorkflowResponse({
      notification,
    })
  }
)

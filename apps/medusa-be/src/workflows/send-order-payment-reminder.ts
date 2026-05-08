import {
  createWorkflow,
  transform,
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
    const notification = sendNotificationStep(
      transform(
        {
          customer_id,
          email,
          order_display_id,
          order_id,
          payment_url,
          store_name,
          total,
        },
        (ctx) => [
          {
            to: ctx.email,
            channel: "email",
            template: "order-payment-reminder",
            trigger_type: "order.payment_reminder",
            resource_id: ctx.order_id,
            resource_type: "order",
            receiver_id: ctx.customer_id,
            data: {
              order_display_id: ctx.order_display_id,
              order_id: ctx.order_id,
              payment_url: ctx.payment_url,
              store_name: ctx.store_name,
              total: ctx.total,
            },
          },
        ]
      )
    )

    return new WorkflowResponse({
      notification,
    })
  }
)

import type {
  CreateNotificationDTO,
  Logger,
  Query,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { ORDER_RECEIPT_MODULE } from "../modules/order-receipt"
import type OrderReceiptModuleService from "../modules/order-receipt/service"
import type { OrderReceiptOrder } from "../modules/order-receipt/service"
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

type QueryOrder = OrderReceiptOrder & {
  customer_id?: string | null
}

function isQueryOrder(value: unknown): value is QueryOrder {
  if (typeof value !== "object" || value === null) {
    return false
  }

  const order = value as {
    customer_id?: unknown
    id?: unknown
    total?: unknown
  }

  return (
    typeof order.id === "string" && "total" in order && "customer_id" in order
  )
}

const ORDER_PAYMENT_REMINDER_RECEIPT_FIELDS = [
  "id",
  "display_id",
  "created_at",
  "currency_code",
  "email",
  "discount_total",
  "item_subtotal",
  "item_tax_total",
  "metadata",
  "payment_collections.payments.data",
  "payment_collections.payments.provider_id",
  "shipping_total",
  "subtotal",
  "tax_total",
  "total",
  "items.detail.raw_unit_price",
  "items.detail.quantity",
  "items.detail.raw_quantity",
  "items.detail.title",
  "items.detail.unit_price",
  "items.raw_quantity",
  "items.raw_unit_price",
  "items.subtotal",
  "items.tax_total",
  "items.title",
  "items.quantity",
  "items.unit_price",
  "items.total",
  "billing_address.*",
  "shipping_address.*",
  "customer_id",
]

const buildOrderPaymentReminderNotificationStep = createStep(
  "build-order-payment-reminder-notification",
  async (
    input: WorkflowInput,
    { container }
  ): Promise<StepResponse<CreateNotificationDTO[]>> => {
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const orderReceiptModuleService =
      container.resolve<OrderReceiptModuleService>(ORDER_RECEIPT_MODULE)

    const { data } = await query.graph({
      entity: "order",
      fields: ORDER_PAYMENT_REMINDER_RECEIPT_FIELDS,
      filters: {
        id: input.order_id,
      },
    })
    const order =
      Array.isArray(data) && data.length > 0 && isQueryOrder(data[0])
        ? data[0]
        : undefined

    if (!order) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "Order was not found")
    }

    let attachments: CreateNotificationDTO["attachments"] = []

    try {
      const attachment =
        await orderReceiptModuleService.generateOrderReceiptAttachment(order)

      attachments = [
        {
          content: attachment.content.toString("base64"),
          content_type: attachment.content_type,
          disposition: "attachment",
          filename: attachment.filename,
        },
      ]
    } catch (error) {
      logger.warn(
        `Payment reminder receipt PDF generation failed for order ${order.id}; sending reminder without attachment. ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }

    return new StepResponse([
      {
        attachments,
        channel: "email",
        data: {
          order_display_id: input.order_display_id,
          order_id: input.order_id,
          payment_url: input.payment_url,
          store_name: input.store_name,
          total: order.total,
        },
        receiver_id: input.customer_id,
        resource_id: input.order_id,
        resource_type: "order",
        template: "order-payment-reminder",
        to: input.email,
        trigger_type: "order.payment_reminder",
      },
    ])
  }
)

export const sendOrderPaymentReminderWorkflow = createWorkflow(
  "send-order-payment-reminder",
  (input: WorkflowInput) => {
    const notificationInput = buildOrderPaymentReminderNotificationStep(input)
    const notification = sendNotificationStep(notificationInput)

    return new WorkflowResponse({
      notification,
    })
  }
)

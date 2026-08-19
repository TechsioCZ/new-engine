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
import { resolveNotificationMarketContext } from "../utils/notification-market-context"
import {
  formatTotal,
  getOrderDisplayId,
  getPaymentUrl,
  type PaymentReminderOrder,
} from "../utils/order-payment-reminders"
import { sendNotificationStep } from "./steps/send-notification"

type WorkflowInput = {
  order_id: string
}

type QueryOrder = OrderReceiptOrder &
  PaymentReminderOrder & {
    sales_channel_id?: string | null
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
  "sales_channel_id",
  "payment_collections.payments.data",
  "payment_collections.payments.provider_id",
  "shipping_total",
  "shipping_tax_total",
  "shipping_methods.amount",
  "shipping_methods.is_tax_inclusive",
  "shipping_methods.name",
  "shipping_methods.raw_amount",
  "shipping_methods.subtotal",
  "shipping_methods.tax_lines.rate",
  "shipping_methods.tax_total",
  "shipping_methods.total",
  "subtotal",
  "summary.*",
  "tax_total",
  "total",
  "items.detail.raw_unit_price",
  "items.detail.quantity",
  "items.detail.raw_quantity",
  "items.detail.title",
  "items.detail.unit_price",
  "items.raw_quantity",
  "items.raw_unit_price",
  "items.is_tax_inclusive",
  "items.subtotal",
  "items.tax_lines.rate",
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

    if (!order.email) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Order has no customer email"
      )
    }

    const marketContext = await resolveNotificationMarketContext(container, {
      countryCode:
        order.shipping_address?.country_code ??
        order.billing_address?.country_code,
      salesChannelId: order.sales_channel_id,
    })
    const paymentUrl = getPaymentUrl(order)
    if (!paymentUrl) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Order does not contain a secure provider payment URL"
      )
    }
    let attachments: CreateNotificationDTO["attachments"] = []

    try {
      const attachment =
        await orderReceiptModuleService.generateOrderReceiptAttachment(order, {
          locale: marketContext.locale,
          storeName: marketContext.store_name,
        })

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
          ...marketContext,
          order_display_id: getOrderDisplayId(order),
          order_id: order.id,
          payment_url: paymentUrl,
          total: formatTotal(order, marketContext.locale),
        },
        receiver_id: order.customer_id ?? undefined,
        resource_id: order.id,
        resource_type: "order",
        template: "order-payment-reminder",
        to: order.email,
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

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
  type PaymentReminderOrder,
} from "../utils/order-payment-reminders"
import { sendNotificationStep } from "./steps/send-notification"

type WorkflowInput = {
  order_id: string
}

type QueryOrder = OrderReceiptOrder &
  PaymentReminderOrder & {
    sales_channel_id?: string | null
    customer?: {
      first_name?: string | null
      last_name?: string | null
    } | null
  }

function isQueryOrder(order: unknown): order is QueryOrder {
  return (
    typeof order === "object" &&
    order !== null &&
    typeof (order as { id?: unknown }).id === "string" &&
    (order as { id: string }).id.length > 0
  )
}

const ORDER_RECEIPT_FIELDS = [
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
  "customer.first_name",
  "customer.last_name",
]

function getCustomerName(order: QueryOrder) {
  const customerName = [order.customer?.first_name, order.customer?.last_name]
    .filter(Boolean)
    .join(" ")

  const address = order.billing_address ?? order.shipping_address
  const addressName = [address?.first_name, address?.last_name]
    .filter(Boolean)
    .join(" ")

  return customerName || address?.company || addressName || undefined
}

const buildOrderReceiptNotificationStep = createStep(
  "build-order-receipt-notification",
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
      fields: ORDER_RECEIPT_FIELDS,
      filters: {
        id: input.order_id,
      },
    })
    const orderCandidate: unknown = data.find((candidate) =>
      isQueryOrder(candidate)
    )

    if (!isQueryOrder(orderCandidate)) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "Order was not found")
    }
    const order = orderCandidate

    if (!order.email) {
      logger.warn(`Order ${order.id} has no email; receipt email skipped.`)
      return new StepResponse([])
    }

    const marketContext = await resolveNotificationMarketContext(container, {
      countryCode:
        order.shipping_address?.country_code ??
        order.billing_address?.country_code,
      salesChannelId: order.sales_channel_id,
    })
    const attachment =
      await orderReceiptModuleService.generateOrderReceiptAttachment(order, {
        locale: marketContext.locale,
        storeName: marketContext.store_name,
      })

    return new StepResponse([
      {
        attachments: [
          {
            content: attachment.content.toString("base64"),
            content_type: attachment.content_type,
            disposition: "attachment",
            filename: attachment.filename,
          },
        ],
        channel: "email",
        data: {
          ...marketContext,
          customer_name: getCustomerName(order),
          order_display_id: getOrderDisplayId(order),
          order_id: order.id,
          total: formatTotal(order, marketContext.locale),
        },
        idempotency_key: `order-receipt:${order.id}`,
        receiver_id: order.customer_id ?? undefined,
        resource_id: order.id,
        resource_type: "order",
        template: "order-placed",
        to: order.email,
        trigger_type: "order.placed",
      },
    ])
  }
)

export const sendOrderReceiptWorkflow = createWorkflow(
  "send-order-receipt",
  (input: WorkflowInput) => {
    const notificationInput = buildOrderReceiptNotificationStep(input)
    const notification = sendNotificationStep(notificationInput)

    return new WorkflowResponse({ notification })
  }
)

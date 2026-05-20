import type {
  INotificationModuleService,
  Logger,
  Query,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
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
import {
  formatTotal,
  getOrderDisplayId,
  type PaymentReminderOrder,
} from "../utils/order-payment-reminders"

type WorkflowInput = {
  order_id: string
  store_name?: string
}

type OrderReceiptWorkflowResult = {
  email?: string
  order_id: string
  sent: boolean
}

type QueryOrder = OrderReceiptOrder &
  PaymentReminderOrder & {
    customer?: {
      first_name?: string | null
      last_name?: string | null
    } | null
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
  "payment_collections.payments.data",
  "payment_collections.payments.provider_id",
  "shipping_total",
  "subtotal",
  "tax_total",
  "total",
  "items.detail.raw_unit_price",
  "items.detail.title",
  "items.detail.unit_price",
  "items.raw_unit_price",
  "items.subtotal",
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

const sendOrderReceiptStep = createStep(
  "send-order-receipt",
  async (
    input: WorkflowInput,
    { container }
  ): Promise<StepResponse<OrderReceiptWorkflowResult>> => {
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const logger = container.resolve<Logger>("logger")
    const notificationModuleService: INotificationModuleService =
      container.resolve(Modules.NOTIFICATION)
    const orderReceiptModuleService =
      container.resolve<OrderReceiptModuleService>(ORDER_RECEIPT_MODULE)

    const { data } = await query.graph({
      entity: "order",
      fields: ORDER_RECEIPT_FIELDS,
      filters: {
        id: input.order_id,
      },
    })
    const order = (data as QueryOrder[])[0]

    if (!order) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "Order was not found")
    }

    if (!order.email) {
      logger.warn(`Order ${order.id} has no email; receipt email skipped.`)
      return new StepResponse({
        order_id: order.id,
        sent: false,
      })
    }

    const attachment =
      await orderReceiptModuleService.generateOrderReceiptAttachment(order)

    await notificationModuleService.createNotifications({
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
        customer_name: getCustomerName(order),
        order_display_id: getOrderDisplayId(order),
        order_id: order.id,
        store_name: input.store_name,
        total: formatTotal(order),
      },
      resource_id: order.id,
      resource_type: "order",
      template: "order-placed",
      to: order.email,
      trigger_type: "order.placed",
    } as Parameters<INotificationModuleService["createNotifications"]>[0])

    return new StepResponse({
      email: order.email,
      order_id: order.id,
      sent: true,
    })
  }
)

export const sendOrderReceiptWorkflow = createWorkflow(
  "send-order-receipt",
  (input: WorkflowInput) => {
    const result = sendOrderReceiptStep(input)

    return new WorkflowResponse(result)
  }
)

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
} from "../utils/order-payment-reminders"
import type { PaymentReminderOrder } from "../utils/order-payment-reminders"

interface WorkflowInput {
  order_id: string
  store_name?: string
}

interface OrderReceiptWorkflowResult {
  email?: string
  order_id: string
  sent: boolean
}

interface OrderCustomerProjection {
  billing_address?: OrderReceiptOrder["billing_address"]
  customer?: {
    first_name?: string | null
    last_name?: string | null
  } | null
  shipping_address?: OrderReceiptOrder["shipping_address"]
}

type PaymentReminderProjection = Pick<
  OrderReceiptOrder,
  "currency_code" | "display_id" | "id" | "summary" | "total"
>

type OrderReceiptItem = NonNullable<OrderReceiptOrder["items"]>[number]
type OrderReceiptPaymentCollection = NonNullable<
  OrderReceiptOrder["payment_collections"]
>[number]
type OrderReceiptPayment = NonNullable<
  OrderReceiptPaymentCollection["payments"]
>[number]
type OrderReceiptPaymentCollectionProjection = Omit<
  OrderReceiptPaymentCollection,
  "payments"
> & {
  payments?: (OrderReceiptPayment | null)[] | null
}
type OrderReceiptShippingMethod = NonNullable<
  OrderReceiptOrder["shipping_methods"]
>[number]

const removeNullEntries = <T>(entries: readonly (T | null)[]): T[] =>
  entries.filter((entry) => entry !== null)

const getPaymentReminderTotal = (order: PaymentReminderProjection) => {
  const selectedTotal =
    order.summary?.current_order_total ??
    order.summary?.original_order_total ??
    order.total

  return typeof selectedTotal === "number" || typeof selectedTotal === "string"
    ? selectedTotal
    : undefined
}

const toPaymentReminderOrder = (
  order: PaymentReminderProjection,
): PaymentReminderOrder => {
  const total = getPaymentReminderTotal(order)

  return {
    display_id: order.display_id ?? null,
    id: order.id,
    ...(order.currency_code === undefined
      ? {}
      : { currency_code: order.currency_code }),
    ...(total === undefined ? {} : { total }),
  }
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

const getCustomerName = (order: OrderCustomerProjection) => {
  const customerName = [order.customer?.first_name, order.customer?.last_name]
    .filter(Boolean)
    .join(" ")

  if (customerName !== "") {
    return customerName
  }

  const address = order.billing_address ?? order.shipping_address
  if (
    address?.company !== null &&
    address?.company !== undefined &&
    address.company !== ""
  ) {
    return address.company
  }

  const addressName = [address?.first_name, address?.last_name]
    .filter(Boolean)
    .join(" ")

  return addressName === "" ? undefined : addressName
}

const sendOrderReceiptStep = createStep(
  "send-order-receipt",
  async (
    input: WorkflowInput,
    { container },
  ): Promise<StepResponse<OrderReceiptWorkflowResult>> => {
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
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
    const [order] = data

    if (!order) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "Order was not found")
    }

    const {
      items,
      payment_collections: paymentCollections,
      shipping_methods: shippingMethods,
      ...orderWithoutRelations
    } = order
    const receiptOrder: OrderReceiptOrder = {
      ...orderWithoutRelations,
      ...(items === undefined
        ? {}
        : {
            items:
              items === null
                ? null
                : removeNullEntries<OrderReceiptItem>(items),
          }),
      ...(paymentCollections === undefined
        ? {}
        : {
            payment_collections:
              paymentCollections === null
                ? null
                : removeNullEntries<OrderReceiptPaymentCollectionProjection>(
                    paymentCollections,
                  ).map(({ payments, ...collection }) => ({
                    ...collection,
                    ...(payments === undefined
                      ? {}
                      : {
                          payments:
                            payments === null
                              ? null
                              : removeNullEntries<OrderReceiptPayment>(
                                  payments,
                                ),
                        }),
                  })),
          }),
      ...(shippingMethods === undefined
        ? {}
        : {
            shipping_methods:
              shippingMethods === null
                ? null
                : removeNullEntries<OrderReceiptShippingMethod>(
                    shippingMethods,
                  ),
          }),
    }

    if (
      order.email === null ||
      order.email === undefined ||
      order.email === ""
    ) {
      logger.warn(`Order ${order.id} has no email; receipt email skipped.`)
      return new StepResponse({
        order_id: order.id,
        sent: false,
      })
    }

    const attachment =
      await orderReceiptModuleService.generateOrderReceiptAttachment(
        receiptOrder,
      )
    const paymentReminderOrder = toPaymentReminderOrder(order)

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
        order_display_id: getOrderDisplayId(paymentReminderOrder),
        order_id: order.id,
        store_name: input.store_name,
        total: formatTotal(paymentReminderOrder),
      },
      resource_id: order.id,
      resource_type: "order",
      template: "order-placed",
      to: order.email,
      trigger_type: "order.placed",
    })

    return new StepResponse({
      email: order.email,
      order_id: order.id,
      sent: true,
    })
  },
)

export const sendOrderReceiptWorkflow = createWorkflow(
  "send-order-receipt",
  (input: WorkflowInput) => {
    const result = sendOrderReceiptStep(input)

    return new WorkflowResponse(result)
  },
)

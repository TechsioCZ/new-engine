import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import type {
  IOrderModuleService,
  Logger,
  Query,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  QR_PAYMENT_MODULE,
  type QrPaymentModuleService,
} from "../modules/qr-payment"
import {
  buildOrderPaymentQrMetadata,
  type OrderPaymentQrOrder,
} from "../utils/order-payment-qr"
import { sendOrderReceiptWorkflow } from "../workflows/send-order-receipt"

type OrderPlacedEvent = {
  id: string
}

type OrderPlacedQueryOrder = OrderPaymentQrOrder & {
  metadata?: Record<string, unknown> | null
}

const ORDER_PAYMENT_QR_FIELDS = [
  "id",
  "currency_code",
  "custom_display_id",
  "display_id",
  "metadata",
  "summary.current_order_total",
  "summary.original_order_total",
  "total",
]

export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<OrderPlacedEvent>) {
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ORDER_PAYMENT_QR_FIELDS,
    filters: { id: data.id },
  })
  const order = (orders as OrderPlacedQueryOrder[])[0]

  if (order) {
    const qrPaymentService =
      container.resolve<QrPaymentModuleService>(QR_PAYMENT_MODULE)
    const metadata = buildOrderPaymentQrMetadata(
      order.metadata,
      order,
      await qrPaymentService.getIban()
    )

    if (metadata !== order.metadata) {
      const orderService = container.resolve<IOrderModuleService>(Modules.ORDER)
      await orderService.updateOrders(order.id, { metadata })
    }
  } else {
    logger.warn(`Order ${data.id} was not found; payment QR metadata skipped.`)
  }

  await sendOrderReceiptWorkflow(container).run({
    input: {
      order_id: data.id,
      store_name: process.env.STORE_NAME,
    },
  })
}

export const config: SubscriberConfig = {
  event: "order.placed",
}

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

type DatabaseConnection = {
  raw: <T = unknown>(sql: string, bindings?: unknown[]) => Promise<T>
}

type RawRows<T> = T[] | { rows?: T[] }

const ORDER_PAYMENT_QR_FIELDS = [
  "id",
  "currency_code",
  "custom_display_id",
  "display_id",
  "metadata",
  "summary.totals",
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
    const orderWithAmount = await withOrderPaymentQrAmountFallback(
      container,
      order
    )
    const metadata = buildOrderPaymentQrMetadata(
      order.metadata,
      orderWithAmount,
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

async function withOrderPaymentQrAmountFallback(
  container: SubscriberArgs<OrderPlacedEvent>["container"],
  order: OrderPlacedQueryOrder
): Promise<OrderPlacedQueryOrder> {
  if (order.total !== null && order.total !== undefined) {
    return order
  }

  if (
    order.summary?.totals?.current_order_total !== null &&
    order.summary?.totals?.current_order_total !== undefined
  ) {
    return order
  }

  const pgConnection = container.resolve<DatabaseConnection>(
    ContainerRegistrationKeys.PG_CONNECTION
  )
  const result = await pgConnection.raw<RawRows<{ total?: string | null }>>(
    `select totals->>'current_order_total' as total
      from "order_summary"
      where "order_id" = ?
        and "deleted_at" is null
      order by "version" desc
      limit 1`,
    [order.id]
  )
  const rows = Array.isArray(result) ? result : (result.rows ?? [])
  const total = rows[0]?.total

  return total ? { ...order, total } : order
}

import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import type { Logger, Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { sendOrderReceiptWorkflow } from "../workflows/send-order-receipt"

type OrderPlacedEvent = {
  id: string
}

export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<OrderPlacedEvent>) {
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id"],
    filters: { id: data.id },
  })
  const order = orders[0]

  if (!order) {
    logger.warn(`Order ${data.id} was not found before receipt email.`)
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

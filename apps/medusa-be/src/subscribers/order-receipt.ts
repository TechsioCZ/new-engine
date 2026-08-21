import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import type { Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { sendOrderReceiptWorkflow } from "../workflows/send-order-receipt"

type OrderPlacedEvent = {
  id: string
}

export default async function orderReceiptHandler({
  event: { data },
  container,
}: SubscriberArgs<OrderPlacedEvent>) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)

  try {
    await sendOrderReceiptWorkflow(container).run({
      input: {
        order_id: data.id,
      },
    })
  } catch (error) {
    logger.error(
      `Order receipt delivery failed for order ${data.id}; event-bus retry requested.`
    )
    throw error
  }
}

export const config: SubscriberConfig = {
  context: {
    subscriberId: "order-receipt-delivery",
  },
  event: "order.placed",
}

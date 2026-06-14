import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import type { Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { sendAccountSetupWorkflow } from "../workflows/send-account-setup"
import { sendOrderReceiptWorkflow } from "../workflows/send-order-receipt"

type OrderPlacedEvent = {
  id: string
}

export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<OrderPlacedEvent>) {
  await sendOrderReceiptWorkflow(container).run({
    input: {
      order_id: data.id,
      store_name: process.env.STORE_NAME,
    },
  })

  try {
    await sendAccountSetupWorkflow(container).run({
      input: {
        order_id: data.id,
      },
    })
  } catch (error) {
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    logger.error(
      `Failed to process account setup for order ${data.id}: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}

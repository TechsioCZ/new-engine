import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import type { Logger, Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { resolveOrderNote } from "../utils/order-note"
import { getMedusaStoreName } from "../utils/store-name"
import { syncOrderNoteWorkflow } from "../workflows/order-note/upsert-order-note"
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
      store_name: await getMedusaStoreName(
        container as Record<string, unknown>
      ),
    },
  })

  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const {
    data: [order],
  } = await query.graph({
    entity: "order",
    fields: ["id", "metadata", "shipping_address.metadata"],
    filters: { id: data.id },
  })
  const note = order ? resolveOrderNote(order) : undefined

  if (note) {
    try {
      await syncOrderNoteWorkflow(container).run({
        input: {
          note,
          order_id: data.id,
        },
      })
    } catch (error) {
      logger.error(
        `Failed to sync order note for order ${data.id}: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }
  }

  try {
    await sendAccountSetupWorkflow(container).run({
      input: {
        order_id: data.id,
      },
    })
  } catch (error) {
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

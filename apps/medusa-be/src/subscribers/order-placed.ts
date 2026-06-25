import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import type { Logger, Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { syncOrderNoteWorkflow } from "../workflows/order-note/upsert-order-note"
import { sendAccountSetupWorkflow } from "../workflows/send-account-setup"
import { sendOrderReceiptWorkflow } from "../workflows/send-order-receipt"

type OrderPlacedEvent = {
  id: string
}

type OrderWithMetadata = {
  id: string
  metadata?: Record<string, unknown> | null
}

function getOrderNote(order: OrderWithMetadata) {
  const note = order.metadata?.order_note

  if (typeof note !== "string") {
    return
  }

  const trimmedNote = note.trim()

  return trimmedNote.length ? trimmedNote : undefined
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

  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const {
    data: [order],
  } = await query.graph({
    entity: "order",
    fields: ["id", "metadata"],
    filters: { id: data.id },
  })
  const note = order ? getOrderNote(order as OrderWithMetadata) : undefined

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

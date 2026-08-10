import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import type { Logger, MetadataType, Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getRecordValue, isRecord } from "@techsio/std/object"

import { getMedusaStoreName } from "../utils/store-name"
import { syncOrderNoteWorkflow } from "../workflows/order-note/upsert-order-note"
import { sendAccountSetupWorkflow } from "../workflows/send-account-setup"
import { sendOrderReceiptWorkflow } from "../workflows/send-order-receipt"

interface OrderPlacedEvent {
  id: string
}

interface OrderWithMetadata {
  id: string
  metadata?: MetadataType
}

const isOrderWithMetadata = (value: unknown): value is OrderWithMetadata => {
  if (!isRecord(value) || typeof getRecordValue(value, "id") !== "string") {
    return false
  }

  const metadata = getRecordValue(value, "metadata")
  return metadata === undefined || metadata === null || isRecord(metadata)
}

const getOrderNote = (order: OrderWithMetadata): string | undefined => {
  const note = order.metadata?.["order_note"]

  if (typeof note !== "string") {
    return undefined
  }

  const trimmedNote = note.trim()

  return trimmedNote.length > 0 ? trimmedNote : undefined
}

export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<OrderPlacedEvent>) {
  await sendOrderReceiptWorkflow(container).run({
    input: {
      order_id: data.id,
      store_name: isRecord(container)
        ? await getMedusaStoreName(container)
        : "N1 Shop",
    },
  })

  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const orderGraphResult: unknown = await query.graph({
    entity: "order",
    fields: ["id", "metadata"],
    filters: { id: data.id },
  })
  const orderGraphData = isRecord(orderGraphResult)
    ? getRecordValue(orderGraphResult, "data")
    : undefined
  const order = Array.isArray(orderGraphData)
    ? orderGraphData.find(isOrderWithMetadata)
    : undefined
  const note = order === undefined ? undefined : getOrderNote(order)

  if (note !== undefined && note !== "") {
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
        }`,
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
      }`,
    )
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}

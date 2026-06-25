import type { Logger, Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { ORDER_NOTE_MODULE } from "../../modules/order-note"
import type OrderNoteModuleService from "../../modules/order-note/service"

type UpsertOrderNoteWorkflowInput = {
  note: string
  order_id: string
}

type OrderRecord = {
  id: string
  metadata?: Record<string, unknown> | null
}

const syncOrderNoteStep = createStep(
  "sync-order-note",
  async (input: UpsertOrderNoteWorkflowInput, { container }) => {
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const pgConnection = container.resolve<any>(
      ContainerRegistrationKeys.PG_CONNECTION
    )
    const orderNoteService =
      container.resolve<OrderNoteModuleService>(ORDER_NOTE_MODULE)

    const trimmedNote = input.note.trim()

    if (!trimmedNote) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Order note cannot be empty"
      )
    }

    const {
      data: [order],
    } = await query.graph({
      entity: "order",
      fields: ["id", "metadata"],
      filters: { id: input.order_id },
      pagination: { skip: 0, take: 1 },
    })

    if (!order) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Order ${input.order_id} not found`
      )
    }

    const orderRecord = order as OrderRecord
    const previousMetadata = { ...(orderRecord.metadata ?? {}) }
    const existingNoteRecord = await orderNoteService.getOrderNoteByOrderId(
      input.order_id
    )

    try {
      await orderNoteService.upsertOrderNote({
        note: trimmedNote,
        order_id: input.order_id,
      })

      await pgConnection.raw(
        `update "order"
          set "metadata" = coalesce("metadata", '{}'::jsonb) - 'order_note',
              "updated_at" = now()
          where "id" = ?`,
        [input.order_id]
      )

      return new StepResponse({ order_id: input.order_id })
    } catch (error) {
      try {
        if (existingNoteRecord) {
          await orderNoteService.upsertOrderNote({
            note: existingNoteRecord.note,
            order_id: input.order_id,
          })
        } else {
          await orderNoteService.deleteOrderNotes({ order_id: input.order_id })
        }
      } catch (rollbackError) {
        logger.error(
          `Failed to roll back order note sync for order ${input.order_id}: ${
            rollbackError instanceof Error
              ? rollbackError.message
              : String(rollbackError)
          }`
        )
      }

      try {
        await pgConnection.raw(
          `update "order"
            set "metadata" = ?::jsonb,
                "updated_at" = now()
            where "id" = ?`,
          [JSON.stringify(previousMetadata), input.order_id]
        )
      } catch (rollbackError) {
        logger.error(
          `Failed to restore order metadata for order ${input.order_id}: ${
            rollbackError instanceof Error
              ? rollbackError.message
              : String(rollbackError)
          }`
        )
      }

      throw error
    }
  }
)

export const syncOrderNoteWorkflow = createWorkflow(
  "sync-order-note",
  (input: UpsertOrderNoteWorkflowInput) => {
    const result = syncOrderNoteStep(input)

    return new WorkflowResponse(result)
  }
)

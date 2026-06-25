import type { IOrderModuleService, Query } from "@medusajs/framework/types"
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

type RestorableOrderNote = {
  note: string
  order_id: string
}

type RestoreOrderNoteCompensation = {
  order_id: string
  previousNote?: RestorableOrderNote
}

type RestoreOrderMetadataCompensation = {
  order_id: string
  previousMetadata: Record<string, unknown>
}

const upsertOrderNoteStep = createStep(
  "upsert-order-note",
  async (input: UpsertOrderNoteWorkflowInput, { container }) => {
    const orderNoteService =
      container.resolve<OrderNoteModuleService>(ORDER_NOTE_MODULE)
    const trimmedNote = input.note.trim()

    if (!trimmedNote) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Order note cannot be empty"
      )
    }

    const existingNoteRecord = await orderNoteService.getOrderNoteByOrderId(
      input.order_id
    )

    await orderNoteService.upsertOrderNote({
      note: trimmedNote,
      order_id: input.order_id,
    })

    return new StepResponse<{ order_id: string }, RestoreOrderNoteCompensation>(
      {
        order_id: input.order_id,
      },
      {
        order_id: input.order_id,
        previousNote:
          existingNoteRecord && typeof existingNoteRecord.note === "string"
            ? {
                note: existingNoteRecord.note,
                order_id: existingNoteRecord.order_id ?? input.order_id,
              }
            : undefined,
      }
    )
  },
  async (input, { container }) => {
    if (!input) {
      return
    }

    const orderNoteService =
      container.resolve<OrderNoteModuleService>(ORDER_NOTE_MODULE)

    if (input.previousNote?.note.trim()) {
      await orderNoteService.upsertOrderNote({
        note: input.previousNote.note,
        order_id: input.previousNote.order_id,
      })
      return
    }

    await orderNoteService.deleteOrderNotes({ order_id: input.order_id })
  }
)

const clearOrderNoteMetadataStep = createStep(
  "clear-order-note-metadata",
  async (input: { order_id: string }, { container }) => {
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const orderService = container.resolve<IOrderModuleService>(Modules.ORDER)

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
    const { order_note: _orderNote, ...nextMetadata } = previousMetadata

    await orderService.updateOrders(input.order_id, {
      metadata: nextMetadata,
    })

    return new StepResponse<
      { order_id: string },
      RestoreOrderMetadataCompensation
    >(
      {
        order_id: input.order_id,
      },
      {
        order_id: input.order_id,
        previousMetadata,
      }
    )
  },
  async (input, { container }) => {
    if (!input) {
      return
    }

    const orderService = container.resolve<IOrderModuleService>(Modules.ORDER)

    await orderService.updateOrders(input.order_id, {
      metadata: input.previousMetadata,
    })
  }
)

export const syncOrderNoteWorkflow = createWorkflow(
  "sync-order-note",
  (input: UpsertOrderNoteWorkflowInput) => {
    const note = upsertOrderNoteStep(input)
    const result = clearOrderNoteMetadataStep(note)

    return new WorkflowResponse(result)
  }
)

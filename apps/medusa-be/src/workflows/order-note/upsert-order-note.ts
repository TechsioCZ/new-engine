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
import { isRecord, omitKeys } from "@techsio/std/object"

import { ORDER_NOTE_MODULE } from "../../modules/order-note"
import type OrderNoteModuleService from "../../modules/order-note/service"
import { isUnknownArray } from "../../utils/guards"

interface UpsertOrderNoteWorkflowInput {
  note: string
  order_id: string
}

interface RestorableOrderNote {
  note: string
  order_id: string
}

interface RestoreOrderNoteCompensation {
  order_id: string
  previousNote?: RestorableOrderNote
}

interface RestoreOrderMetadataCompensation {
  order_id: string
  previousMetadata: Record<string, unknown>
}

const upsertOrderNoteStep = createStep(
  "upsert-order-note",
  async (input: UpsertOrderNoteWorkflowInput, { container }) => {
    const orderNoteService =
      container.resolve<OrderNoteModuleService>(ORDER_NOTE_MODULE)
    const trimmedNote = input.note.trim()

    if (trimmedNote.length === 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Order note cannot be empty",
      )
    }

    const existingNoteRecord = await orderNoteService.getOrderNoteByOrderId(
      input.order_id,
    )

    await orderNoteService.upsertOrderNote({
      note: trimmedNote,
      order_id: input.order_id,
    })

    const compensation: RestoreOrderNoteCompensation = {
      order_id: input.order_id,
    }

    if (
      existingNoteRecord !== null &&
      existingNoteRecord !== undefined &&
      typeof existingNoteRecord.note === "string"
    ) {
      compensation.previousNote = {
        note: existingNoteRecord.note,
        order_id: existingNoteRecord.order_id ?? input.order_id,
      }
    }

    return new StepResponse(
      {
        order_id: input.order_id,
      },
      compensation,
    )
  },
  async (input, { container }) => {
    if (input === undefined) {
      return
    }

    const orderNoteService =
      container.resolve<OrderNoteModuleService>(ORDER_NOTE_MODULE)

    const { previousNote } = input
    if (previousNote !== undefined && previousNote.note.trim().length > 0) {
      await orderNoteService.upsertOrderNote({
        note: previousNote.note,
        order_id: previousNote.order_id,
      })
      return
    }

    await orderNoteService.deleteOrderNotes({ order_id: input.order_id })
  },
)

const clearOrderNoteMetadataStep = createStep(
  "clear-order-note-metadata",
  async (input: { order_id: string }, { container }) => {
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const orderService = container.resolve<IOrderModuleService>(Modules.ORDER)

    const orderResult: unknown = await query.graph({
      entity: "order",
      fields: ["id", "metadata"],
      filters: { id: input.order_id },
      pagination: { skip: 0, take: 1 },
    })
    const orderData: unknown = isRecord(orderResult)
      ? orderResult["data"]
      : undefined
    if (!isUnknownArray(orderData)) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Order query returned invalid data",
      )
    }
    const [order] = orderData

    if (order === undefined) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Order ${input.order_id} not found`,
      )
    }

    if (!isRecord(order)) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Order query returned an invalid record",
      )
    }
    const { metadata } = order
    if (metadata !== undefined && metadata !== null && !isRecord(metadata)) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Order query returned invalid metadata",
      )
    }
    const previousMetadata = metadata ?? {}
    const nextMetadata = omitKeys(previousMetadata, ["order_note"])

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
      },
    )
  },
  async (input, { container }) => {
    if (input === undefined) {
      return
    }

    const orderService = container.resolve<IOrderModuleService>(Modules.ORDER)

    await orderService.updateOrders(input.order_id, {
      metadata: input.previousMetadata,
    })
  },
)

export const syncOrderNoteWorkflow = createWorkflow(
  "sync-order-note",
  (input: UpsertOrderNoteWorkflowInput) => {
    const note = upsertOrderNoteStep(input)
    const result = clearOrderNoteMetadataStep(note)

    return new WorkflowResponse(result)
  },
)

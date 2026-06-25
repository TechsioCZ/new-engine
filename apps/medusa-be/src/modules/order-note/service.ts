import type { Context } from "@medusajs/framework/types"
import { MedusaError, MedusaService } from "@medusajs/framework/utils"
import OrderNote from "./models/order-note"

type UpsertOrderNoteInput = {
  note: string
  order_id: string
}

class OrderNoteModuleService extends MedusaService({ OrderNote }) {
  async getOrderNoteByOrderId(orderId: string, sharedContext?: Context) {
    const [orderNote] = await this.listOrderNotes(
      { order_id: orderId },
      { take: 1 },
      sharedContext
    )

    return orderNote ?? null
  }

  async upsertOrderNote(input: UpsertOrderNoteInput, sharedContext?: Context) {
    const note = input.note.trim()

    if (!note) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Order note cannot be empty"
      )
    }

    const existing = await this.getOrderNoteByOrderId(
      input.order_id,
      sharedContext
    )

    if (existing) {
      return await this.updateOrderNotes(
        {
          id: existing.id,
          note,
          order_id: input.order_id,
        },
        sharedContext
      )
    }

    return await this.createOrderNotes(
      {
        note,
        order_id: input.order_id,
      },
      sharedContext
    )
  }
}

export default OrderNoteModuleService

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ORDER_NOTE_MODULE } from "../../../../../modules/order-note"
import type OrderNoteModuleService from "../../../../../modules/order-note/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id: orderId } = req.params as { id: string }
  const orderNoteService =
    req.scope.resolve<OrderNoteModuleService>(ORDER_NOTE_MODULE)
  const orderNote = await orderNoteService.getOrderNoteByOrderId(orderId)

  res.json({
    customer_note: orderNote
      ? {
          created_at:
            orderNote.created_at instanceof Date
              ? orderNote.created_at.toISOString()
              : (orderNote.created_at ?? null),
          note: orderNote.note ?? null,
          order_id: orderNote.order_id ?? orderId,
          updated_at:
            orderNote.updated_at instanceof Date
              ? orderNote.updated_at.toISOString()
              : (orderNote.updated_at ?? null),
        }
      : null,
  })
}

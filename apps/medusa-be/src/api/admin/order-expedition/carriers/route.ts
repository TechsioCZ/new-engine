import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ORDER_EXPEDITION_CARRIER_OPTIONS } from "../../../../utils/order-expedition"

export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  res.json({
    carriers: ORDER_EXPEDITION_CARRIER_OPTIONS,
  })
}

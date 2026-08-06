import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { ORDER_EXPEDITION_CARRIER_OPTIONS } from "../../../../utils/order-expedition"

const getRoute = (_req: MedusaRequest, res: MedusaResponse) => {
  res.json({
    carriers: ORDER_EXPEDITION_CARRIER_OPTIONS,
  })
}

export { getRoute as GET }

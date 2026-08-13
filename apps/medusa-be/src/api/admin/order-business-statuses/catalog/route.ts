import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ASSIGNABLE_ORDER_BUSINESS_STATUS_IDS,
  ORDER_BUSINESS_STATUSES,
} from "../../../../utils/order-business-status"

export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  res.json({
    statuses: ASSIGNABLE_ORDER_BUSINESS_STATUS_IDS.map(
      (id) => ORDER_BUSINESS_STATUSES[id]
    ),
  })
}

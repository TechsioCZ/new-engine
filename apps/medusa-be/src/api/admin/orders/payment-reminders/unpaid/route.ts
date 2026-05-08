import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  fetchUnpaidOrders,
  toPaymentReminderOrderResponse,
} from "../../../../../utils/order-payment-reminders"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const limit = Number(req.query.limit ?? 5)
  const normalizedLimit = Number.isFinite(limit) ? limit : 5
  const unpaidOrders = await fetchUnpaidOrders(query, normalizedLimit)

  res.json({
    orders: unpaidOrders.map(toPaymentReminderOrderResponse),
  })
}

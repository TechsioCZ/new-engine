import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { clearOrderExpeditionSummaryCache } from "../../../../utils/order-expedition-summary-cache"
import { updateOrderBusinessStatusesWorkflow } from "../../../../workflows/order-business-status/update-order-business-statuses"
import {
  ORDER_BUSINESS_STATUS_ORDER_FIELDS,
  parseOrderBusinessStatusOrders,
  toOrderBusinessStatusSummary,
} from "../utils"
import type { PostAdminOrderBusinessStatusesBulkSchemaType } from "../validators"

export async function POST(
  req: MedusaRequest<PostAdminOrderBusinessStatusesBulkSchemaType>,
  res: MedusaResponse
) {
  const { result } = await updateOrderBusinessStatusesWorkflow(req.scope).run({
    input: req.validatedBody,
  })

  if (result.changed_count) {
    await clearOrderExpeditionSummaryCache(req.scope)
  }

  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order",
    fields: ORDER_BUSINESS_STATUS_ORDER_FIELDS,
    filters: { id: result.order_ids },
  })
  const orders = parseOrderBusinessStatusOrders(data)

  res.json({
    ...result,
    count: result.processed_count,
    orders: orders.map(toOrderBusinessStatusSummary),
    skipped: [],
    skipped_count: 0,
  })
}

import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  assertCustomerOwnsProductList,
  getProductListService,
} from "../../../../workflows/product-list/steps/helpers"
import { getRouteParam, toProductListResponse } from "../utils"

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const customerId = req.auth_context.actor_id
  const listId = getRouteParam(req.params, "id")

  await assertCustomerOwnsProductList(req.scope, customerId, listId)

  const productList = await getProductListService(
    req.scope
  ).retrieveProductList(listId, {
    relations: ["items"],
  })

  res.json({ product_list: toProductListResponse(productList) })
}

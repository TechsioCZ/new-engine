import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  assertCustomerOwnsProductList,
  getProductListService,
} from "../../../../workflows/product-list/steps/helpers"
import {
  getRouteParam,
  toProductListResponse,
  withProductListItems,
} from "../utils"

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const customerId = req.auth_context.actor_id
  const listId = getRouteParam(req.params, "id")

  await assertCustomerOwnsProductList(req.scope, customerId, listId)

  const productList = await getProductListService(
    req.scope
  ).retrieveProductList(listId)
  const productListsWithItems = await withProductListItems(req.scope, [
    productList,
  ])
  const productListWithItems = productListsWithItems[0]

  if (!productListWithItems) {
    res.json({ product_list: toProductListResponse(productList) })
    return
  }

  res.json({ product_list: toProductListResponse(productListWithItems) })
}

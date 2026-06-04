import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { getAuthenticatedCustomerId } from "../../../../utils/auth"
import { getRouteParam } from "../../../../utils/route-params"
import {
  assertCustomerOwnsProductList,
  getProductListService,
} from "../../../../workflows/product-list/steps/helpers"
import { toProductListResponse, withProductListItems } from "../utils"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const listId = getRouteParam(req.params, "id")
  const productList = await getProductListService(
    req.scope
  ).retrieveProductList(listId)

  if (productList.access_type !== "public") {
    const customerId = getAuthenticatedCustomerId(req)

    if (!customerId) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Product list ${listId} was not found`
      )
    }

    await assertCustomerOwnsProductList(req.scope, customerId, listId)
  }
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

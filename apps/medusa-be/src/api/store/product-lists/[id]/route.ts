import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { PRODUCT_LIST_MODULE } from "../../../../modules/product-list/constants"
import type ProductListModuleService from "../../../../modules/product-list/service"
import { assertCustomerOwnsProductList } from "../../../../utils/product-list-links"
import { getRouteParam } from "../../../../utils/route-params"
import { toProductListResponse, withProductListItems } from "../utils"

type RequestWithOptionalCustomerAuth = MedusaRequest & {
  auth_context?: { actor_id?: unknown } | null
}

const getAuthenticatedCustomerId = (
  req: RequestWithOptionalCustomerAuth
): string | undefined => {
  const authContext = req.auth_context

  if (!authContext || typeof authContext !== "object") {
    return
  }

  const { actor_id: actorId } = authContext

  return typeof actorId === "string" ? actorId : undefined
}

export async function GET(
  req: RequestWithOptionalCustomerAuth,
  res: MedusaResponse
) {
  const listId = getRouteParam(req.params, "id")
  const productListService =
    req.scope.resolve<ProductListModuleService>(PRODUCT_LIST_MODULE)
  const productList = await productListService.retrieveProductList(listId)

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

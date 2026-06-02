import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  getProductListService,
  listCustomerProductListIds,
} from "../../../workflows/product-list/steps/helpers"
import { toProductListResponse, withProductListItems } from "./utils"
import type { StoreGetProductListsSchemaType } from "./validators"

export async function GET(
  req: AuthenticatedMedusaRequest<unknown, StoreGetProductListsSchemaType>,
  res: MedusaResponse
) {
  const customerId = req.auth_context.actor_id
  const productListIds = await listCustomerProductListIds(req.scope, customerId)
  const { handle, limit, offset, type } = req.validatedQuery

  if (!productListIds.length) {
    res.json({ count: 0, limit, offset, product_lists: [] })
    return
  }

  const filters: Record<string, unknown> = {
    id: { $in: productListIds },
  }

  if (handle) {
    filters.handle = handle
  }

  if (type) {
    filters.type = type
  }

  const [productLists, count] = await getProductListService(
    req.scope
  ).listAndCountProductLists(filters, {
    order: { created_at: "DESC" },
    skip: offset,
    take: limit,
  })
  const productListsWithItems = await withProductListItems(
    req.scope,
    productLists
  )

  res.json({
    count,
    limit,
    offset,
    product_lists: productListsWithItems.map(toProductListResponse),
  })
}

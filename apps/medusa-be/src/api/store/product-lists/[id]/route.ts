import type {
  AuthenticatedMedusaRequest,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { PRODUCT_LIST_MODULE } from "../../../../modules/product-list/constants"
import type ProductListModuleService from "../../../../modules/product-list/service"
import { assertCustomerOwnsProductList } from "../../../../utils/product-list-links"
import { deleteProductListWorkflow } from "../../../../workflows/product-list/workflows/delete-product-list"
import { updateProductListWorkflow } from "../../../../workflows/product-list/workflows/update-product-list"
import {
  INLINE_PRODUCT_LIST_ITEMS_LIMIT,
  toProductListResponse,
  withProductListItems,
} from "../utils"
import {
  StoreProductListParamsSchema,
  type StoreUpdateProductListSchemaType,
} from "../validators"

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
  const { id: listId } = StoreProductListParamsSchema.parse(req.params)
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
  const productListsWithItems = await withProductListItems(
    req.scope,
    [productList],
    { previewLimit: INLINE_PRODUCT_LIST_ITEMS_LIMIT }
  )
  const productListWithItems = productListsWithItems[0]

  if (!productListWithItems) {
    res.json({ product_list: toProductListResponse(productList) })
    return
  }

  res.json({ product_list: toProductListResponse(productListWithItems) })
}

export async function POST(
  req: AuthenticatedMedusaRequest<StoreUpdateProductListSchemaType>,
  res: MedusaResponse
) {
  const { id: listId } = StoreProductListParamsSchema.parse(req.params)
  const { result: productList } = await updateProductListWorkflow(
    req.scope
  ).run({
    input: {
      customer_id: req.auth_context.actor_id,
      data: req.validatedBody,
      list_id: listId,
    },
  })
  const [productListWithItems] = await withProductListItems(
    req.scope,
    [productList],
    { previewLimit: INLINE_PRODUCT_LIST_ITEMS_LIMIT }
  )

  res.json({
    product_list: toProductListResponse(productListWithItems ?? productList),
  })
}

export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id: listId } = StoreProductListParamsSchema.parse(req.params)
  await deleteProductListWorkflow(req.scope).run({
    input: {
      customer_id: req.auth_context.actor_id,
      list_id: listId,
    },
  })

  res.status(200).json({ deleted: true, id: listId })
}

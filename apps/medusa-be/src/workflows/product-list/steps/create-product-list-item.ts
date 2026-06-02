import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type {
  CreateProductListItemWorkflowInput,
  ProductListItemRecord,
} from "../types"
import {
  assertCustomerOwnsProductList,
  createProductListItemProductLinks,
  dismissProductListItemProductLinks,
  findProductListItemForSelection,
  getProductListService,
  getProductListType,
} from "./helpers"

type CompensationInput = {
  created: boolean
  item_id: string
  product_id: string
  variant_id?: string
  linked: boolean
}

export const createProductListItemStep = createStep(
  "create-product-list-item",
  async (input: CreateProductListItemWorkflowInput, { container }) => {
    await assertCustomerOwnsProductList(
      container,
      input.customer_id,
      input.list_id
    )

    const service = getProductListService(container)
    const productList = await service.retrieveProductList(input.list_id)
    const existingItem = await findProductListItemForSelection(
      container,
      input.list_id,
      input.product_id,
      input.variant_id
    )

    if (existingItem) {
      return new StepResponse<ProductListItemRecord, CompensationInput>(
        existingItem,
        {
          created: false,
          item_id: existingItem.id,
          linked: false,
          product_id: input.product_id,
          variant_id: input.variant_id,
        }
      )
    }

    const item = await service.createProductListItemForList({
      list_id: input.list_id,
      list_type: getProductListType(productList.type),
      metadata: input.metadata,
      note: input.note,
      quantity: input.quantity,
      sort_order: input.sort_order,
    })

    await createProductListItemProductLinks(
      container,
      item.id,
      input.product_id,
      input.variant_id
    )

    return new StepResponse<ProductListItemRecord, CompensationInput>(item, {
      created: true,
      item_id: item.id,
      linked: true,
      product_id: input.product_id,
      variant_id: input.variant_id,
    })
  },
  async (input, { container }) => {
    if (!(input?.created && input.item_id)) {
      return
    }

    if (input.linked) {
      await dismissProductListItemProductLinks(
        container,
        input.item_id,
        input.product_id,
        input.variant_id
      )
    }

    await getProductListService(container).deleteProductListItems(input.item_id)
  }
)

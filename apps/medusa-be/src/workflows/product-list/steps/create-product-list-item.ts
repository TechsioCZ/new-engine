import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { PRODUCT_LIST_MODULE } from "../../../modules/product-list/constants"
import type ProductListModuleService from "../../../modules/product-list/service"
import type {
  CreatedProductListItemResult,
  CreateProductListItemWorkflowInput,
} from "../types"
import {
  assertProductSelectionExists,
  findProductListItemForSelection,
  getProductListType,
} from "./helpers"

type CompensationInput = {
  created: boolean
  item_id: string
}

export const createProductListItemStep = createStep(
  "create-product-list-item",
  async (input: CreateProductListItemWorkflowInput, { container }) => {
    const service =
      container.resolve<ProductListModuleService>(PRODUCT_LIST_MODULE)
    const productList = await service.retrieveProductList(input.list_id)
    const listType = getProductListType(productList.type)

    await assertProductSelectionExists(
      container,
      input.product_id,
      input.variant_id
    )
    const existingItem = await findProductListItemForSelection(
      container,
      input.list_id,
      input.product_id,
      input.variant_id
    )

    if (existingItem) {
      return new StepResponse<CreatedProductListItemResult, CompensationInput>(
        {
          created: false,
          item: existingItem,
        },
        {
          created: false,
          item_id: existingItem.id,
        }
      )
    }

    const item = await service.createProductListItemForList({
      list_id: input.list_id,
      list_type: listType,
      metadata: input.metadata,
      note: input.note,
      quantity: input.quantity,
      sort_order: input.sort_order,
    })

    return new StepResponse<CreatedProductListItemResult, CompensationInput>(
      {
        created: true,
        item,
      },
      {
        created: true,
        item_id: item.id,
      }
    )
  },
  async (input, { container }) => {
    if (!(input?.created && input.item_id)) {
      return
    }

    await container
      .resolve<ProductListModuleService>(PRODUCT_LIST_MODULE)
      .deleteProductListItems(input.item_id)
  }
)

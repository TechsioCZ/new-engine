import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type {
  CreateCustomerProductListWorkflowInput,
  CreatedProductListResult,
} from "../types"
import {
  createCustomerProductListLink,
  dismissCustomerProductListLink,
  findCustomerFavoriteProductList,
  getProductListService,
} from "./helpers"

type CompensationInput = {
  customer_id: string
  list_id: string
  created: boolean
  linked: boolean
}

export const createCustomerProductListStep = createStep(
  "create-customer-product-list",
  async (input: CreateCustomerProductListWorkflowInput, { container }) => {
    const service = getProductListService(container)
    const existingFavorite =
      input.type === "favorite"
        ? await findCustomerFavoriteProductList(container, input.customer_id)
        : null

    if (existingFavorite) {
      return new StepResponse<CreatedProductListResult, CompensationInput>(
        {
          created: false,
          product_list: existingFavorite,
        },
        {
          created: false,
          customer_id: input.customer_id,
          linked: false,
          list_id: existingFavorite.id,
        }
      )
    }

    const productList =
      input.type === "favorite"
        ? await service.createFavoriteProductList(input.data)
        : await service.createCustomProductList(input.data)

    await createCustomerProductListLink(
      container,
      input.customer_id,
      productList.id
    )

    return new StepResponse<CreatedProductListResult, CompensationInput>(
      {
        created: true,
        product_list: productList,
      },
      {
        created: true,
        customer_id: input.customer_id,
        linked: true,
        list_id: productList.id,
      }
    )
  },
  async (input, { container }) => {
    if (!input?.created) {
      return
    }

    if (input.linked) {
      await dismissCustomerProductListLink(
        container,
        input.customer_id,
        input.list_id
      )
    }

    await getProductListService(container).deleteProductLists(input.list_id)
  }
)

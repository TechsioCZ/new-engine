import { kebabCase, MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { PRODUCT_LIST_MODULE } from "../../../modules/product-list/constants"
import type ProductListModuleService from "../../../modules/product-list/service"
import type {
  CreateCustomerProductListWorkflowInput,
  CreatedProductListResult,
} from "../types"
import {
  findCustomerCustomProductListByHandle,
  findCustomerFavoriteProductList,
} from "./helpers"

type CompensationInput = {
  list_id: string
  created: boolean
}

const normalizeCustomHandle = (title: string, handle?: string) => {
  const trimmedHandle = handle?.trim()

  return trimmedHandle == null || trimmedHandle === ""
    ? kebabCase(title.trim())
    : kebabCase(trimmedHandle)
}

export const createCustomerProductListStep = createStep(
  "create-customer-product-list",
  async (input: CreateCustomerProductListWorkflowInput, { container }) => {
    const service =
      container.resolve<ProductListModuleService>(PRODUCT_LIST_MODULE)
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
          list_id: existingFavorite.id,
        }
      )
    }

    if (input.type === "custom") {
      const handle = normalizeCustomHandle(input.data.title, input.data.handle)
      const existingCustomList = await findCustomerCustomProductListByHandle(
        container,
        input.customer_id,
        handle
      )

      if (existingCustomList) {
        throw new MedusaError(
          MedusaError.Types.DUPLICATE_ERROR,
          `Product list handle already exists: ${handle}`
        )
      }
    }

    const productList =
      input.type === "favorite"
        ? await service.createFavoriteProductList(input.data)
        : await service.createCustomProductList(input.data)

    return new StepResponse<CreatedProductListResult, CompensationInput>(
      {
        created: true,
        product_list: productList,
      },
      {
        created: true,
        list_id: productList.id,
      }
    )
  },
  async (input, { container }) => {
    if (!input?.created) {
      return
    }

    await container
      .resolve<ProductListModuleService>(PRODUCT_LIST_MODULE)
      .deleteProductLists(input.list_id)
  }
)

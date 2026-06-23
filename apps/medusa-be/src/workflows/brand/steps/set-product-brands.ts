import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { SetProductBrandsWorkflowInput } from "../types"
import {
  brandProductLink,
  getActiveBrandIds,
  getCurrentProductBrandIds,
  getProductBrandIdsToReplace,
  replaceProductBrandLinks,
} from "./helpers"

export const setProductBrandsStep = createStep(
  "set-product-brands",
  async (input: SetProductBrandsWorkflowInput, { container }) => {
    const currentIds = await getCurrentProductBrandIds(
      container,
      input.product_id
    )
    const activeBrandIds = await getActiveBrandIds(container, input.brand_ids)
    const nextActiveBrandIds = input.brand_ids.filter((brandId) =>
      activeBrandIds.has(brandId)
    )

    if (nextActiveBrandIds.length !== input.brand_ids.length) {
      const inactiveBrandIds = input.brand_ids.filter(
        (brandId) => !activeBrandIds.has(brandId)
      )

      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Brands are inactive or deleted: ${inactiveBrandIds.join(", ")}`
      )
    }

    const currentIdsToReplace = getProductBrandIdsToReplace(
      currentIds,
      activeBrandIds,
      nextActiveBrandIds
    )
    const { add, remove } = await replaceProductBrandLinks(
      container,
      currentIdsToReplace,
      nextActiveBrandIds,
      (brandId) => brandProductLink(input.product_id, brandId)
    )

    return new StepResponse(
      {
        added: add,
        removed: remove,
      },
      {
        product_id: input.product_id,
        brand_ids: currentIds,
      }
    )
  },
  async (previous, { container }) => {
    if (!previous) {
      return
    }

    const currentIds = await getCurrentProductBrandIds(
      container,
      previous.product_id
    )

    await replaceProductBrandLinks(
      container,
      currentIds,
      previous.brand_ids,
      (brandId) => brandProductLink(previous.product_id, brandId)
    )
  }
)

import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { SetProductBrandsWorkflowInput } from "../types"
import {
  getActiveBrandIds,
  getCurrentProductBrandIds,
  getProductBrandIdsToReplace,
  brandProductLink,
  replaceProductBrandLinks,
} from "./helpers"

export const setProductBrandsStep = createStep(
  "set-product-brands",
  async (input: SetProductBrandsWorkflowInput, { container }) => {
    const currentIds = await getCurrentProductBrandIds(
      container,
      input.product_id
    )
    const activeBrandIds = await getActiveBrandIds(container, currentIds)
    const currentIdsToReplace = getProductBrandIdsToReplace(
      currentIds,
      activeBrandIds,
      input.brand_ids
    )
    const { add, remove } = await replaceProductBrandLinks(
      container,
      currentIdsToReplace,
      input.brand_ids,
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

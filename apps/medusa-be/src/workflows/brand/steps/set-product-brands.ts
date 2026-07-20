import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { SetProductBrandsWorkflowInput } from "../types"
import {
  brandProductLink,
  diffIds,
  getActiveBrandIds,
  getCurrentProductBrandIds,
  getExistingProductIds,
  hasActiveBrandConflict,
} from "./helpers"

export const prepareSetProductBrandsStep = createStep(
  "prepare-set-product-brands",
  async (input: SetProductBrandsWorkflowInput, { container }) => {
    if (input.brand_ids.length > 1) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "A product can be linked to at most one brand"
      )
    }

    const existingProductIds = await getExistingProductIds(container, [
      input.product_id,
    ])

    if (!existingProductIds.has(input.product_id)) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Product "${input.product_id}" was not found`
      )
    }

    const currentIds = await getCurrentProductBrandIds(
      container,
      input.product_id
    )
    const activeCurrentIds = await getActiveBrandIds(container, currentIds)

    if (
      input.fail_on_conflict &&
      hasActiveBrandConflict(currentIds, activeCurrentIds, input.brand_ids)
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Product "${input.product_id}" is already linked to another brand`
      )
    }

    if (input.brand_ids.length) {
      const activeBrandIds = await getActiveBrandIds(container, input.brand_ids)
      const inactiveBrandIds = input.brand_ids.filter(
        (brandId) => !activeBrandIds.has(brandId)
      )

      if (inactiveBrandIds.length) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Brands are inactive or deleted: ${inactiveBrandIds.join(", ")}`
        )
      }
    }

    const { add, remove } = diffIds(currentIds, input.brand_ids)

    return new StepResponse({
      links_to_create: add.map((brandId) =>
        brandProductLink(input.product_id, brandId)
      ),
      links_to_dismiss: remove.map((brandId) =>
        brandProductLink(input.product_id, brandId)
      ),
      result: {
        added: add,
        removed: remove,
      },
    })
  }
)

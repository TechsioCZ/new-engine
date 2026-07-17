import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { SetBrandProductsWorkflowInput } from "../types"
import {
  brandProductLink,
  diffIds,
  getActiveBrandIds,
  getCurrentBrandProductIds,
  getCurrentProductBrandLinks,
  getExistingProductIds,
} from "./helpers"

export const prepareSetBrandProductsStep = createStep(
  "prepare-set-brand-products",
  async (input: SetBrandProductsWorkflowInput, { container }) => {
    const targetBrandIds = await getActiveBrandIds(container, [input.brand_id])

    if (!targetBrandIds.has(input.brand_id)) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Active brand "${input.brand_id}" was not found`
      )
    }

    const existingProductIds = await getExistingProductIds(
      container,
      input.product_ids
    )
    const missingProductIds = input.product_ids.filter(
      (productId) => !existingProductIds.has(productId)
    )

    if (missingProductIds.length) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Product ids were not found: ${missingProductIds.join(", ")}`
      )
    }

    const conflictingLinks = (
      await getCurrentProductBrandLinks(container, input.product_ids)
    ).filter((link) => link.brand_id !== input.brand_id)
    const activeBrandIds = await getActiveBrandIds(
      container,
      conflictingLinks.map((link) => link.brand_id)
    )
    const activeConflictingLinks = conflictingLinks.filter((link) =>
      activeBrandIds.has(link.brand_id)
    )
    const inactiveConflictingLinks = conflictingLinks.filter(
      (link) => !activeBrandIds.has(link.brand_id)
    )

    if (activeConflictingLinks.length) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Products are already linked to another brand: ${activeConflictingLinks
          .map((link) => link.product_id)
          .join(", ")}`
      )
    }

    const currentIds = await getCurrentBrandProductIds(
      container,
      input.brand_id
    )
    const { add: productIdsToAdd } = diffIds(currentIds, input.product_ids)
    const productIdsToAddSet = new Set(productIdsToAdd)
    const inactiveLinksToDismiss = inactiveConflictingLinks.filter((link) =>
      productIdsToAddSet.has(link.product_id)
    )
    const { add, remove } = diffIds(currentIds, input.product_ids)

    return new StepResponse({
      links_to_create: add.map((productId) =>
        brandProductLink(productId, input.brand_id)
      ),
      links_to_dismiss: [
        ...remove.map((productId) =>
          brandProductLink(productId, input.brand_id)
        ),
        ...inactiveLinksToDismiss.map((link) =>
          brandProductLink(link.product_id, link.brand_id)
        ),
      ],
      result: {
        added: add,
        removed: remove,
      },
    })
  }
)

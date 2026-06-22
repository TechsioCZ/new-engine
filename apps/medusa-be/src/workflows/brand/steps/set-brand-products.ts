import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { SetBrandProductsWorkflowInput } from "../types"
import {
  diffIds,
  dismissProductBrandLinks,
  getActiveBrandIds,
  getCurrentBrandProductIds,
  getCurrentProductBrandLinks,
  brandProductLink,
  replaceProductBrandLinks,
} from "./helpers"

export const setBrandProductsStep = createStep(
  "set-brand-products",
  async (input: SetBrandProductsWorkflowInput, { container }) => {
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

    await dismissProductBrandLinks(container, inactiveLinksToDismiss)

    const { add, remove } = await replaceProductBrandLinks(
      container,
      currentIds,
      input.product_ids,
      (productId) => brandProductLink(productId, input.brand_id)
    )

    return new StepResponse(
      {
        added: add,
        removed: remove,
      },
      {
        brand_id: input.brand_id,
        product_ids: currentIds,
      }
    )
  },
  async (previous, { container }) => {
    if (!previous) {
      return
    }

    const currentIds = await getCurrentBrandProductIds(
      container,
      previous.brand_id
    )

    await replaceProductBrandLinks(
      container,
      currentIds,
      previous.product_ids,
      (productId) => brandProductLink(productId, previous.brand_id)
    )
  }
)

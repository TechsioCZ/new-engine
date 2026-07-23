import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import type { BatchLinkProductsToBrandWorkflowInput } from "../types"
import {
  brandProductLink,
  getActiveBrandIds,
  getCurrentProductBrandLinks,
  getExistingProductIds,
  normalizeBrandProductDelta,
  partitionProductBrandConflicts,
  resolveBrandProductDelta,
} from "./helpers"

export const prepareBatchLinkProductsToBrandStep = createStep(
  "prepare-batch-link-products-to-brand",
  async (input: BatchLinkProductsToBrandWorkflowInput, { container }) => {
    const delta = normalizeBrandProductDelta(input)
    const targetBrandIds = await getActiveBrandIds(container, [input.brand_id])

    if (!targetBrandIds.has(input.brand_id)) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Active brand "${input.brand_id}" was not found`
      )
    }

    const existingProductIds = await getExistingProductIds(container, delta.add)
    const missingProductIds = delta.add.filter(
      (productId) => !existingProductIds.has(productId)
    )

    if (missingProductIds.length) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Product ids were not found: ${missingProductIds.join(", ")}`
      )
    }

    const affectedLinks = await getCurrentProductBrandLinks(container, [
      ...delta.add,
      ...delta.remove,
    ])
    const currentIds = affectedLinks
      .filter((link) => link.brand_id === input.brand_id)
      .map((link) => link.product_id)
    const resolvedDelta = resolveBrandProductDelta(currentIds, delta)
    const add = resolvedDelta.add
    const remove = resolvedDelta.remove
    const addProductIdSet = new Set(add)
    const conflictingLinks = affectedLinks.filter((link) =>
      addProductIdSet.has(link.product_id)
    )
    const activeBrandIds = await getActiveBrandIds(
      container,
      conflictingLinks.map((link) => link.brand_id)
    )
    const conflicts = partitionProductBrandConflicts(
      conflictingLinks,
      activeBrandIds,
      input.brand_id
    )

    if (conflicts.active.length) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Products are already linked to another brand: ${conflicts.active
          .map((link) => link.product_id)
          .join(", ")}`
      )
    }

    return new StepResponse({
      links_to_create: add.map((productId) =>
        brandProductLink(productId, input.brand_id)
      ),
      links_to_dismiss: [
        ...remove.map((productId) =>
          brandProductLink(productId, input.brand_id)
        ),
        ...conflicts.inactive.map((link) =>
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

import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import type { DeleteBrandsWorkflowInput } from "../types"
import { getBrandService } from "./helpers"

export const deleteBrandsStep = createStep(
  "delete-brands",
  async (input: DeleteBrandsWorkflowInput, { container }) => {
    const service = getBrandService(container)
    const brands = await service.listBrands(
      {
        id: { $in: input.ids },
      },
      {
        take: Math.max(input.ids.length, 1),
        withDeleted: true,
      },
    )
    const foundIds = new Set(brands.map((brand) => brand.id))
    const missingIds = input.ids.filter((id) => !foundIds.has(id))

    if (missingIds.length > 0) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Brand ids were not found: ${missingIds.join(", ")}`,
      )
    }

    const activeIds: string[] = []
    for (const brand of brands) {
      if (brand.deleted_at === null || brand.deleted_at === undefined) {
        activeIds.push(brand.id)
      }
    }

    if (activeIds.length > 0) {
      await service.softDeleteBrands(activeIds)
    }

    return new StepResponse(undefined, activeIds)
  },
  async (deletedIds, { container }) => {
    if (deletedIds === undefined || deletedIds.length === 0) {
      return
    }

    await getBrandService(container).restoreBrands(deletedIds)
  },
)

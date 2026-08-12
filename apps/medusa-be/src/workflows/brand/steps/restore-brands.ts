import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { RestoreBrandsWorkflowInput } from "../types"
import { getBrandService } from "./helpers"

export const restoreBrandsStep = createStep(
  "restore-brands",
  async (input: RestoreBrandsWorkflowInput, { container }) => {
    const service = getBrandService(container)
    const brands = await service.listBrands(
      {
        id: { $in: input.ids },
      },
      {
        take: Math.max(input.ids.length, 1),
        withDeleted: true,
      }
    )
    const foundIds = new Set(brands.map((brand) => brand.id))
    const missingIds = input.ids.filter((id) => !foundIds.has(id))

    if (missingIds.length) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Brand ids were not found: ${missingIds.join(", ")}`
      )
    }

    const deletedBrands = brands.filter((brand) => !!brand.deleted_at)
    const deletedIds = deletedBrands.map((brand) => brand.id)

    if (deletedBrands.length) {
      const activeCollisions = await service.listBrands(
        {
          handle: { $in: deletedBrands.map((brand) => brand.handle) },
        },
        {
          take: Math.max(deletedBrands.length * 2, 1),
          withDeleted: false,
        }
      )
      const restoringIds = new Set(deletedIds)
      const collision = activeCollisions.find(
        (brand) => !restoringIds.has(brand.id)
      )

      if (collision) {
        throw new MedusaError(
          MedusaError.Types.DUPLICATE_ERROR,
          `Cannot restore brand "${collision.handle}" because an active brand already uses that handle.`
        )
      }

      await service.restoreBrands(deletedIds)
    }

    return new StepResponse(input.ids, deletedIds)
  },
  async (restoredIds, { container }) => {
    if (restoredIds?.length) {
      await getBrandService(container).softDeleteBrands(restoredIds)
    }
  }
)

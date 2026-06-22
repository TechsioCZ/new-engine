import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { DeleteBrandsWorkflowInput } from "../types"
import { getBrandService } from "./helpers"

export const deleteBrandsStep = createStep(
  "delete-brands",
  async (input: DeleteBrandsWorkflowInput, { container }) => {
    const service = getBrandService(container)

    await service.softDeleteBrands(input.ids)
    return new StepResponse(undefined, input.ids)
  },
  async (deletedIds, { container }) => {
    if (!deletedIds?.length) {
      return
    }

    await getBrandService(container).restoreBrands(deletedIds)
  }
)

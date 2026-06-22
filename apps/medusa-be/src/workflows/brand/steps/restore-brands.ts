import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { RestoreBrandsWorkflowInput } from "../types"
import { getBrandService } from "./helpers"

export const restoreBrandsStep = createStep(
  "restore-brands",
  async (input: RestoreBrandsWorkflowInput, { container }) => {
    await getBrandService(container).restoreBrands(input.ids)

    return new StepResponse(input.ids, input.ids)
  },
  async (restoredIds, { container }) => {
    if (restoredIds?.length) {
      await getBrandService(container).softDeleteBrands(restoredIds)
    }
  }
)

import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { RestoreBrandAttributeTypesWorkflowInput } from "../types"
import { getBrandService } from "./helpers"

export const restoreBrandAttributeTypesStep = createStep(
  "restore-brand-attribute-types",
  async (input: RestoreBrandAttributeTypesWorkflowInput, { container }) => {
    await getBrandService(container).restoreBrandAttributeTypes(input.ids)

    return new StepResponse(input.ids, input.ids)
  },
  async (restoredIds, { container }) => {
    if (restoredIds?.length) {
      await getBrandService(container).softDeleteBrandAttributeTypes(
        restoredIds
      )
    }
  }
)

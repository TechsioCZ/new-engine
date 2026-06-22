import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { DeleteBrandAttributeTypesWorkflowInput } from "../types"
import { getBrandService } from "./helpers"

export const deleteBrandAttributeTypesStep = createStep(
  "delete-brand-attribute-types",
  async (input: DeleteBrandAttributeTypesWorkflowInput, { container }) => {
    await getBrandService(container).softDeleteBrandAttributeTypes(
      input.ids
    )

    return new StepResponse(input.ids, input.ids)
  },
  async (deletedIds, { container }) => {
    if (deletedIds?.length) {
      await getBrandService(container).restoreBrandAttributeTypes(
        deletedIds
      )
    }
  }
)

import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { RestoreBrandAttributeTypesWorkflowInput } from "../types"
import { getBrandService } from "./helpers"

export const restoreBrandAttributeTypesStep = createStep(
  "restore-brand-attribute-types",
  async (input: RestoreBrandAttributeTypesWorkflowInput, { container }) => {
    const restoredBrandAttributeTypes = (await getBrandService(
      container
    ).restoreBrandAttributeTypes(input.ids)) as
      | Array<{ id: string }>
      | undefined
    const restoredIds =
      restoredBrandAttributeTypes?.map(
        (brandAttributeType) => brandAttributeType.id
      ) ?? input.ids

    return new StepResponse(restoredIds, restoredIds)
  },
  async (restoredIds, { container }) => {
    if (restoredIds?.length) {
      await getBrandService(container).softDeleteBrandAttributeTypes(
        restoredIds
      )
    }
  }
)

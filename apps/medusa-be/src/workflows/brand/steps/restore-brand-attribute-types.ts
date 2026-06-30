import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { RestoreBrandAttributeTypesWorkflowInput } from "../types"
import { getBrandService } from "./helpers"

export const restoreBrandAttributeTypesStep = createStep(
  "restore-brand-attribute-types",
  async (input: RestoreBrandAttributeTypesWorkflowInput, { container }) => {
    const restoredBrandAttributeTypes = await getBrandService(
      container
    ).restoreBrandAttributeTypes(input.ids)
    const restoredIds = Array.isArray(restoredBrandAttributeTypes)
      ? restoredBrandAttributeTypes.flatMap((brandAttributeType) => {
          if (
            !(
              brandAttributeType &&
              typeof brandAttributeType === "object" &&
              "id" in brandAttributeType
            )
          ) {
            return []
          }

          const restoredId: unknown = brandAttributeType.id

          return typeof restoredId === "string" ? [restoredId] : []
        })
      : []

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

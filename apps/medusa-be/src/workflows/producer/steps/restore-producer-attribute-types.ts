import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { RestoreProducerAttributeTypesWorkflowInput } from "../types"
import { getProducerService } from "./helpers"

export const restoreProducerAttributeTypesStep = createStep(
  "restore-producer-attribute-types",
  async (input: RestoreProducerAttributeTypesWorkflowInput, { container }) => {
    await getProducerService(container).restoreProducerAttributeTypes(input.ids)

    return new StepResponse(input.ids, input.ids)
  },
  async (restoredIds, { container }) => {
    if (restoredIds?.length) {
      await getProducerService(container).softDeleteProducerAttributeTypes(
        restoredIds
      )
    }
  }
)

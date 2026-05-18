import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { DeleteProducerAttributeTypesWorkflowInput } from "../types"
import { getProducerService } from "./helpers"

export const deleteProducerAttributeTypesStep = createStep(
  "delete-producer-attribute-types",
  async (input: DeleteProducerAttributeTypesWorkflowInput, { container }) => {
    await getProducerService(container).softDeleteProducerAttributeTypes(
      input.ids
    )

    return new StepResponse(input.ids, input.ids)
  },
  async (deletedIds, { container }) => {
    if (deletedIds?.length) {
      await getProducerService(container).restoreProducerAttributeTypes(
        deletedIds
      )
    }
  }
)

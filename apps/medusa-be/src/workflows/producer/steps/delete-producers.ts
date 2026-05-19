import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { DeleteProducersWorkflowInput } from "../types"
import { getProducerService } from "./helpers"

export const deleteProducersStep = createStep(
  "delete-producers",
  async (input: DeleteProducersWorkflowInput, { container }) => {
    const service = getProducerService(container)

    await service.softDeleteProducers(input.ids)
    return new StepResponse(undefined, input.ids)
  },
  async (deletedIds, { container }) => {
    if (!deletedIds?.length) {
      return
    }

    await getProducerService(container).restoreProducers(deletedIds)
  }
)

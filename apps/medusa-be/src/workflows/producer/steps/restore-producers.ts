import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { RestoreProducersWorkflowInput } from "../types"
import { getProducerService } from "./helpers"

export const restoreProducersStep = createStep(
  "restore-producers",
  async (input: RestoreProducersWorkflowInput, { container }) => {
    await getProducerService(container).restoreProducers(input.ids)

    return new StepResponse(input.ids, input.ids)
  },
  async (restoredIds, { container }) => {
    if (restoredIds?.length) {
      await getProducerService(container).softDeleteProducers(restoredIds)
    }
  }
)

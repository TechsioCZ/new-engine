import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import {
  PPL_CLIENT_MODULE,
  type PplClientModuleService,
} from "../../modules/ppl-client"
import type { UpdatePplConfigInput } from "../../modules/ppl-client/types"

const updatePplConfigStep = createStep(
  "update-ppl-config",
  async (input: UpdatePplConfigInput, { container }) => {
    const service = container.resolve<PplClientModuleService>(PPL_CLIENT_MODULE)

    return new StepResponse(await service.updateConfig(input))
  }
)

export const updatePplConfigWorkflow = createWorkflow(
  "update-ppl-config",
  (input: UpdatePplConfigInput) =>
    new WorkflowResponse(updatePplConfigStep(input))
)

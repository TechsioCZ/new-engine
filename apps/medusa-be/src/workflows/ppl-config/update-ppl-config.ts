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
import { toPplConfigResponse } from "../../modules/ppl-client/config-response"
import type { UpdatePplConfigProfileInput } from "../../modules/ppl-client/types"

const updatePplConfigStep = createStep(
  "update-ppl-config",
  async (input: UpdatePplConfigProfileInput, { container }) => {
    const service = container.resolve<PplClientModuleService>(PPL_CLIENT_MODULE)

    const { environment, ...config } = input
    const updated = await service.updateConfig(environment, config)
    return new StepResponse(toPplConfigResponse(updated))
  }
)

export const updatePplConfigWorkflow = createWorkflow(
  "update-ppl-config",
  (input: UpdatePplConfigProfileInput) =>
    new WorkflowResponse(updatePplConfigStep(input))
)

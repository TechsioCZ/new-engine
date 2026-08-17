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
import type { ActivatePplProfileInput } from "../../modules/ppl-client/types"

const activatePplProfileStep = createStep(
  "activate-ppl-profile",
  async (input: ActivatePplProfileInput, { container }) => {
    const service = container.resolve<PplClientModuleService>(PPL_CLIENT_MODULE)
    const config = await service.activateConfig(
      input.environment,
      input.confirmed
    )

    return new StepResponse({ environment: config.environment })
  }
)

export const activatePplProfileWorkflow = createWorkflow(
  "activate-ppl-profile",
  (input: ActivatePplProfileInput) =>
    new WorkflowResponse(activatePplProfileStep(input))
)

import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  PACKETA_CLIENT_MODULE,
  type PacketaClientModuleService,
} from "../../modules/packeta-client"
import type { ActivatePacketaProfileInput } from "../../modules/packeta-client/types"

const activatePacketaProfileStep = createStep(
  "activate-packeta-profile",
  async (input: ActivatePacketaProfileInput, { container }) => {
    const service = container.resolve<PacketaClientModuleService>(
      PACKETA_CLIENT_MODULE
    )
    const config = await service.activateConfig(
      input.environment,
      input.confirmed
    )
    return new StepResponse({ environment: config.environment })
  }
)

export const activatePacketaProfileWorkflow = createWorkflow(
  "activate-packeta-profile",
  (input: ActivatePacketaProfileInput) =>
    new WorkflowResponse(activatePacketaProfileStep(input))
)

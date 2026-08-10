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
import type { UpdatePacketaProfileInput } from "../../modules/packeta-client/types"

const updatePacketaConfigStep = createStep(
  "update-packeta-config",
  async (input: UpdatePacketaProfileInput, { container }) => {
    const service = container.resolve<PacketaClientModuleService>(
      PACKETA_CLIENT_MODULE
    )

    const { environment, ...config } = input
    return new StepResponse(await service.updateConfig(environment, config))
  }
)

export const updatePacketaConfigWorkflow = createWorkflow(
  "update-packeta-config",
  (input: UpdatePacketaProfileInput) =>
    new WorkflowResponse(updatePacketaConfigStep(input))
)

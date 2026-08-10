import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import { PACKETA_CLIENT_MODULE } from "../../modules/packeta-client"
import type { PacketaClientModuleService } from "../../modules/packeta-client"
import type { UpdatePacketaConfigInput } from "../../modules/packeta-client/types"

const updatePacketaConfigStep = createStep(
  "update-packeta-config",
  async (input: UpdatePacketaConfigInput, { container }) => {
    const service = container.resolve<PacketaClientModuleService>(
      PACKETA_CLIENT_MODULE,
    )

    return new StepResponse(await service.updateConfig(input))
  },
)

export const updatePacketaConfigWorkflow = createWorkflow(
  "update-packeta-config",
  (input: UpdatePacketaConfigInput) =>
    new WorkflowResponse(updatePacketaConfigStep(input)),
)

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
import type {
  PacketaConfigReference,
  PacketaPacketAttributes,
} from "../../modules/packeta-client/types"

type CreatePacketaPacketInput = {
  attributes: PacketaPacketAttributes
  reference?: PacketaConfigReference
}

const createPacketaPacketStep = createStep(
  "create-packeta-packet",
  async (input: CreatePacketaPacketInput, { container }) => {
    const service = container.resolve<PacketaClientModuleService>(
      PACKETA_CLIENT_MODULE
    )
    const packet = await service.createPacket(input.attributes, input.reference)

    return new StepResponse(packet)
  }
)

export const createPacketaPacketWorkflow = createWorkflow(
  "create-packeta-packet",
  (input: CreatePacketaPacketInput) =>
    new WorkflowResponse(createPacketaPacketStep(input))
)

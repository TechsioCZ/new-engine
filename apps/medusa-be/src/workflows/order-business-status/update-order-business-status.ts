import type {
  MetadataType,
  IOrderModuleService,
} from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

interface UpdateOrderBusinessStatusInput {
  id: string
  metadata: MetadataType
}

const updateOrderBusinessStatusStep = createStep(
  "update-order-business-status",
  async (input: UpdateOrderBusinessStatusInput, { container }) => {
    const orderService = container.resolve<IOrderModuleService>(Modules.ORDER)
    const order = await orderService.updateOrders(input.id, {
      metadata: input.metadata,
    })

    return new StepResponse(order)
  },
)

export const updateOrderBusinessStatusWorkflow = createWorkflow(
  "update-order-business-status",
  (input: UpdateOrderBusinessStatusInput) =>
    new WorkflowResponse(updateOrderBusinessStatusStep(input)),
)

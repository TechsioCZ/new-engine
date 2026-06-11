import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { useRemoteQueryStep } from "@medusajs/medusa/core-flows"
import {
  type UpdateOrderStepInput,
  updateOrderStep,
} from "../steps/update-order"

/*
  A workflow to update the order. We use this in the quote workflows to convert a draft order
  to an active order.
*/
export const updateOrderWorkflow = createWorkflow(
  "b2b-update-order-workflow",
  (input: UpdateOrderStepInput) => {
    useRemoteQueryStep({
      entry_point: "order",
      fields: ["id"],
      variables: { id: input.id },
      list: false,
      throw_if_key_not_found: true,
    })

    updateOrderStep(input)

    return new WorkflowResponse(undefined)
  }
)

import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { acquireLockStep, releaseLockStep } from "@medusajs/medusa/core-flows"
import { getProductProducerLockKeys, setProductProducersStep } from "../steps"
import type { SetProductProducersWorkflowInput } from "../types"

export const setProductProducersWorkflow = createWorkflow(
  {
    name: "set-product-producers-workflow",
    idempotent: false,
  },
  (input: SetProductProducersWorkflowInput) => {
    const lockKey = transform({ input }, ({ input: workflowInput }) =>
      getProductProducerLockKeys([workflowInput.product_id])
    )

    acquireLockStep({
      executeOnSubWorkflow: true,
      key: lockKey,
      timeout: 2,
      ttl: 10,
    })

    const result = setProductProducersStep(input)

    releaseLockStep({
      executeOnSubWorkflow: true,
      key: lockKey,
    })

    return new WorkflowResponse(result)
  }
)

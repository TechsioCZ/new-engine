import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { acquireLockStep, releaseLockStep } from "@medusajs/medusa/core-flows"
import { setProducerProductsStep } from "../steps"
import type { SetProducerProductsWorkflowInput } from "../types"

export const setProducerProductsWorkflow = createWorkflow(
  {
    name: "set-producer-products-workflow",
    idempotent: false,
  },
  (input: SetProducerProductsWorkflowInput) => {
    const lockKey = transform(
      { input },
      ({ input: workflowInput }) =>
        `producer-products:${workflowInput.producer_id}`
    )

    acquireLockStep({
      executeOnSubWorkflow: true,
      key: lockKey,
      timeout: 2,
      ttl: 10,
    })

    const result = setProducerProductsStep(input)

    releaseLockStep({
      executeOnSubWorkflow: true,
      key: lockKey,
    })

    return new WorkflowResponse(result)
  }
)

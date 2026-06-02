import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { acquireLockStep, releaseLockStep } from "@medusajs/medusa/core-flows"
import { createCustomerProductListStep } from "../steps/create-customer-product-list"
import type { CreateCustomerProductListWorkflowInput } from "../types"

export const createCustomerProductListWorkflow = createWorkflow(
  "create-customer-product-list-workflow",
  (input: CreateCustomerProductListWorkflowInput) => {
    const lockKey = transform({ input }, ({ input: workflowInput }) => [
      `product-list-customer:${workflowInput.customer_id}`,
    ])

    acquireLockStep({
      executeOnSubWorkflow: true,
      key: lockKey,
      timeout: 2,
      ttl: 10,
    })

    const result = createCustomerProductListStep(input)

    releaseLockStep({
      executeOnSubWorkflow: true,
      key: lockKey,
    })

    return new WorkflowResponse(result)
  }
)

import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { acquireLockStep, releaseLockStep } from "@medusajs/medusa/core-flows"
import { getBrandProductsLockKeys, setBrandProductsStep } from "../steps"
import type { SetBrandProductsWorkflowInput } from "../types"

export const setBrandProductsWorkflow = createWorkflow(
  {
    name: "set-brand-products-workflow",
    idempotent: false,
  },
  (input: SetBrandProductsWorkflowInput) => {
    const lockKey = transform({ input }, ({ input: workflowInput }) =>
      getBrandProductsLockKeys(
        workflowInput.brand_id,
        workflowInput.product_ids
      )
    )

    acquireLockStep({
      executeOnSubWorkflow: true,
      key: lockKey,
      timeout: 2,
      ttl: 10,
    })

    const result = setBrandProductsStep(input)

    releaseLockStep({
      executeOnSubWorkflow: true,
      key: lockKey,
    })

    return new WorkflowResponse(result)
  }
)

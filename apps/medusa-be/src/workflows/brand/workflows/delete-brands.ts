import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { acquireLockStep, releaseLockStep } from "@medusajs/medusa/core-flows"
import { deleteBrandsStep, getBrandLifecycleLockKeys } from "../steps"
import type { DeleteBrandsWorkflowInput } from "../types"

export const deleteBrandsWorkflow = createWorkflow(
  "delete-brands-workflow",
  (input: DeleteBrandsWorkflowInput) => {
    const lockKey = transform({ input }, ({ input: workflowInput }) =>
      getBrandLifecycleLockKeys(workflowInput.ids)
    )

    acquireLockStep({
      executeOnSubWorkflow: true,
      key: lockKey,
      timeout: 2,
      ttl: 10,
    })

    const result = deleteBrandsStep(input)

    releaseLockStep({
      executeOnSubWorkflow: true,
      key: lockKey,
    })

    return new WorkflowResponse(result)
  }
)

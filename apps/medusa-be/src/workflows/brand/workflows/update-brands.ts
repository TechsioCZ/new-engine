import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { acquireLockStep, releaseLockStep } from "@medusajs/medusa/core-flows"
import {
  getBrandAttributeTypeLockKeys,
  getBrandMutationLockKeys,
  updateBrandsStep,
} from "../steps"
import type { UpdateBrandsWorkflowInput } from "../types"

export const updateBrandsWorkflow = createWorkflow(
  "update-brands-workflow",
  (input: UpdateBrandsWorkflowInput) => {
    const lockKey = transform({ input }, ({ input: workflowInput }) => {
      const attributeNames = (workflowInput.update.attributes ?? []).map(
        ({ name }) => name.trim()
      )

      return [
        ...getBrandMutationLockKeys([workflowInput.selector.id]),
        ...(attributeNames.length
          ? getBrandAttributeTypeLockKeys(attributeNames)
          : []),
      ]
    })

    acquireLockStep({
      executeOnSubWorkflow: true,
      key: lockKey,
      timeout: 2,
      ttl: 10,
    })

    const result = updateBrandsStep(input)

    releaseLockStep({
      executeOnSubWorkflow: true,
      key: lockKey,
    })

    return new WorkflowResponse(result)
  }
)

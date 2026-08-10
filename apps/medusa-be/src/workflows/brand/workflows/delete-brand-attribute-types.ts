import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { acquireLockStep, releaseLockStep } from "@medusajs/medusa/core-flows"

import { deleteBrandAttributeTypesStep } from "../steps/delete-brand-attribute-types"
import { getBrandAttributeTypeLockKeys } from "../steps/helpers"
import type { DeleteBrandAttributeTypesWorkflowInput } from "../types"

export const deleteBrandAttributeTypesWorkflow = createWorkflow(
  "delete-brand-attribute-types",
  (input: DeleteBrandAttributeTypesWorkflowInput) => {
    const lockKey = transform({ input }, ({ input: workflowInput }) =>
      getBrandAttributeTypeLockKeys(workflowInput.ids),
    )

    acquireLockStep({
      executeOnSubWorkflow: true,
      key: lockKey,
      timeout: 2,
      ttl: 10,
    })

    const result = deleteBrandAttributeTypesStep(input)

    releaseLockStep({
      executeOnSubWorkflow: true,
      key: lockKey,
    })

    return new WorkflowResponse(result)
  },
)

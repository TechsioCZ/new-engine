import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { acquireLockStep, releaseLockStep } from "@medusajs/medusa/core-flows"

import {
  getBrandAttributeTypeLockKeys,
  restoreBrandAttributeTypesStep,
} from "../steps"
import type { RestoreBrandAttributeTypesWorkflowInput } from "../types"

export const restoreBrandAttributeTypesWorkflow = createWorkflow(
  "restore-brand-attribute-types-workflow",
  (input: RestoreBrandAttributeTypesWorkflowInput) => {
    const lockKey = transform({ input }, ({ input: workflowInput }) =>
      getBrandAttributeTypeLockKeys(workflowInput.ids)
    )

    acquireLockStep({
      executeOnSubWorkflow: true,
      key: lockKey,
      timeout: 2,
      ttl: 10,
    })

    const result = restoreBrandAttributeTypesStep(input)

    releaseLockStep({
      executeOnSubWorkflow: true,
      key: lockKey,
    })

    return new WorkflowResponse(result)
  }
)

import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { acquireLockStep, releaseLockStep } from "@medusajs/medusa/core-flows"

import { createBrandAttributeTypesStep } from "../steps/create-brand-attribute-types"
import { getBrandAttributeTypeLockKeys } from "../steps/helpers"
import type { CreateBrandAttributeTypesWorkflowInput } from "../types"

export const createBrandAttributeTypesWorkflow = createWorkflow(
  "create-brand-attribute-types",
  (input: CreateBrandAttributeTypesWorkflowInput) => {
    const lockKey = transform({ input }, ({ input: workflowInput }) =>
      getBrandAttributeTypeLockKeys(
        workflowInput.attribute_types.map(({ name }) => name.trim()),
      ),
    )

    acquireLockStep({
      executeOnSubWorkflow: true,
      key: lockKey,
      timeout: 2,
      ttl: 10,
    })

    const result = createBrandAttributeTypesStep(input)

    releaseLockStep({
      executeOnSubWorkflow: true,
      key: lockKey,
    })

    return new WorkflowResponse(result)
  },
)

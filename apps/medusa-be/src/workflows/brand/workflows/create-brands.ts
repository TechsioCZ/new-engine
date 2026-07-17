import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { acquireLockStep, releaseLockStep } from "@medusajs/medusa/core-flows"
import { createBrandsStep, getBrandAttributeTypeLockKeys } from "../steps"
import type { CreateBrandsWorkflowInput } from "../types"

export const createBrandsWorkflow = createWorkflow(
  "create-brands-workflow",
  (input: CreateBrandsWorkflowInput) => {
    const lockKey = transform({ input }, ({ input: workflowInput }) =>
      getBrandAttributeTypeLockKeys(
        workflowInput.brands.flatMap((brand) =>
          (brand.attributes ?? []).map(({ name }) => name.trim())
        )
      )
    )

    acquireLockStep({
      executeOnSubWorkflow: true,
      key: lockKey,
      timeout: 2,
      ttl: 10,
    })

    const result = createBrandsStep(input)

    releaseLockStep({
      executeOnSubWorkflow: true,
      key: lockKey,
    })

    return new WorkflowResponse(result)
  }
)

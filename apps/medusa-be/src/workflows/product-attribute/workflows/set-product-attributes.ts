import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { acquireLockStep, releaseLockStep } from "@medusajs/medusa/core-flows"

import { getProductAttributeProductLockKey } from "../../../utils/product-attributes"
import { setProductAttributesStep } from "../steps/assignment-mutations"
import type { SetProductAttributesInput } from "../types"

export const setProductAttributesWorkflow = createWorkflow(
  "set-product-attributes",
  (input: SetProductAttributesInput) => {
    const lockKey = transform({ input }, ({ input: current }) => [
      getProductAttributeProductLockKey(current.product_id),
    ])
    acquireLockStep({ key: lockKey, timeout: 5, ttl: 30 })
    const result = setProductAttributesStep(input)
    releaseLockStep({ key: lockKey })
    return new WorkflowResponse(result)
  },
)

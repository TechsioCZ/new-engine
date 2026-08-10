import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import type { DeleteApiStoreConfigStepInput } from "./steps/delete-api-store-config"
import { deleteApiStoreConfigStep } from "./steps/delete-api-store-config"

export const deleteApiStoreConfigWorkflow = createWorkflow(
  "delete-api-store-config",
  (input: DeleteApiStoreConfigStepInput) => {
    const result = deleteApiStoreConfigStep(input)

    return new WorkflowResponse(result)
  },
)

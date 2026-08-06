import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import type { UpdateApiStoreConfigStepInput } from "./steps/update-api-store-config"
import { updateApiStoreConfigStep } from "./steps/update-api-store-config"

export const updateApiStoreConfigWorkflow = createWorkflow(
  "update-api-store-config",
  (input: UpdateApiStoreConfigStepInput) => {
    const apiStoreConfig = updateApiStoreConfigStep(input)

    return new WorkflowResponse({ api_store: apiStoreConfig })
  }
)

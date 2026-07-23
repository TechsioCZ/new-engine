import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import type { ApiStoreCreateInput } from "../modules/api-store"
import { createApiStoreConfigStep } from "./steps/create-api-store-config"

export const createApiStoreConfigWorkflow = createWorkflow(
  "create-api-store-config",
  (input: ApiStoreCreateInput) => {
    const apiStoreConfig = createApiStoreConfigStep(input)

    return new WorkflowResponse({ api_store: apiStoreConfig })
  }
)

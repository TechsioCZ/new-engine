import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import { syncMeilisearchProducersStep } from "../steps/sync-producers"

export type SyncMeilisearchProducersWorkflowInput = {
  filters?: Record<string, unknown>
  limit?: number
  offset?: number
}

export const syncMeilisearchProducersWorkflow = createWorkflow(
  "sync-meilisearch-producers-workflow",
  (input: SyncMeilisearchProducersWorkflowInput) => {
    const result = syncMeilisearchProducersStep(input)
    return new WorkflowResponse(result)
  }
)

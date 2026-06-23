import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { syncMeilisearchBrandsStep } from "../steps/sync-brands"

export type SyncMeilisearchBrandsWorkflowInput = {
  filters?: Record<string, unknown>
}

export const syncMeilisearchBrandsWorkflow = createWorkflow(
  "sync-meilisearch-brands-workflow",
  (input: SyncMeilisearchBrandsWorkflowInput) => {
    const result = syncMeilisearchBrandsStep(input)
    return new WorkflowResponse(result)
  }
)

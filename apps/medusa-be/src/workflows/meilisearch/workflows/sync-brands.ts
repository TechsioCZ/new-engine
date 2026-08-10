import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { acquireLockStep, releaseLockStep } from "@medusajs/medusa/core-flows"

import { BRAND_SEARCH_PROJECTION_LOCK_KEY } from "../events"
import type { SyncMeilisearchBrandsStepInput } from "../steps/sync-brands"
import { syncMeilisearchBrandsStep } from "../steps/sync-brands"

export type SyncMeilisearchBrandsWorkflowInput = SyncMeilisearchBrandsStepInput

export const syncMeilisearchBrandsWorkflow = createWorkflow(
  "sync-meilisearch-brands",
  (input: SyncMeilisearchBrandsWorkflowInput) => {
    acquireLockStep({
      key: BRAND_SEARCH_PROJECTION_LOCK_KEY,
      timeout: 30,
      ttl: 120,
    })

    const result = syncMeilisearchBrandsStep(input)

    releaseLockStep({
      key: BRAND_SEARCH_PROJECTION_LOCK_KEY,
    })

    return new WorkflowResponse(result)
  },
)

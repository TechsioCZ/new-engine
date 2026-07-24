import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { acquireLockStep, releaseLockStep } from "@medusajs/medusa/core-flows"

import type { BrandSearchProjectionChangedEventData } from "../events"
import { reconcileBrandSearchProjectionStep } from "../steps/reconcile-brand-search-projection"
import { resolveBrandSearchProjectionTargetsStep } from "../steps/resolve-brand-search-projection-targets"

export const reconcileBrandSearchProjectionWorkflow = createWorkflow(
  "reconcile-brand-search-projection-workflow",
  (input: BrandSearchProjectionChangedEventData) => {
    const targets = resolveBrandSearchProjectionTargetsStep(input)

    acquireLockStep({
      key: targets.lock_keys,
      timeout: 30,
      ttl: 120,
    })

    const result = reconcileBrandSearchProjectionStep(targets)

    releaseLockStep({
      key: targets.lock_keys,
    })

    return new WorkflowResponse(result)
  }
)

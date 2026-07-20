import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  acquireLockStep,
  emitEventStep,
  releaseLockStep,
} from "@medusajs/medusa/core-flows"
import {
  BRAND_SEARCH_PROJECTION_CHANGED,
  BRAND_SEARCH_PROJECTION_EVENT_OPTIONS,
  buildBrandSearchProjectionEventData,
} from "../../meilisearch/events"
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
    const eventData = transform({ result }, ({ result: createdBrands }) =>
      buildBrandSearchProjectionEventData({
        brandIds: createdBrands.map((brand) => brand.id),
      })
    )

    releaseLockStep({
      executeOnSubWorkflow: true,
      key: lockKey,
    })

    emitEventStep({
      data: eventData,
      eventName: BRAND_SEARCH_PROJECTION_CHANGED,
      options: BRAND_SEARCH_PROJECTION_EVENT_OPTIONS,
    })

    return new WorkflowResponse(result)
  }
)

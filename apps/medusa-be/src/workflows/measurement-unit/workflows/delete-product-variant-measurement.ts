import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { acquireLockStep, releaseLockStep } from "@medusajs/medusa/core-flows"
import { dismissProductVariantMeasurementLinksStep } from "../steps/measurement-link-mutations"
import { softDeleteProductVariantMeasurementsStep } from "../steps/measurement-record-mutations"
import {
  findActiveProductVariantMeasurementLinksStep,
  prepareDeleteProductVariantMeasurementStep,
} from "../steps/prepare-measurement-transitions"
import type { DeleteProductVariantMeasurementWorkflowInput } from "../types"

export const deleteProductVariantMeasurementWorkflow = createWorkflow(
  "delete-product-variant-measurement-workflow",
  (input: DeleteProductVariantMeasurementWorkflowInput) => {
    const lockInput = transform({ input }, ({ input: current }) => ({
      key: `measurement-product:${current.product_id}`,
      timeout: 5,
      ttl: 30,
    }))
    const releaseInput = transform({ input }, ({ input: current }) => ({
      key: `measurement-product:${current.product_id}`,
    }))

    acquireLockStep(lockInput)

    const plan = prepareDeleteProductVariantMeasurementStep(input)
    const currentRecords = transform({ plan }, ({ plan: current }) =>
      current.current ? [current.current] : []
    )
    const links = findActiveProductVariantMeasurementLinksStep(currentRecords)

    dismissProductVariantMeasurementLinksStep(links)
    softDeleteProductVariantMeasurementsStep(currentRecords)

    releaseLockStep(releaseInput)

    return new WorkflowResponse(plan.current)
  }
)

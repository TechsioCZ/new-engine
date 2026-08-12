import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { acquireLockStep, releaseLockStep } from "@medusajs/medusa/core-flows"
import {
  dismissProductMeasurementLinksStep,
  dismissProductVariantMeasurementLinksStep,
} from "../steps/measurement-link-mutations"
import {
  softDeleteProductMeasurementsStep,
  softDeleteProductVariantMeasurementsStep,
} from "../steps/measurement-record-mutations"
import {
  findActiveProductMeasurementLinksStep,
  findActiveProductVariantMeasurementLinksStep,
  prepareDeleteProductMeasurementStep,
} from "../steps/prepare-measurement-transitions"
import type { DeleteProductMeasurementWorkflowInput } from "../types"

export const deleteProductMeasurementWorkflow = createWorkflow(
  "delete-product-measurement",
  (input: DeleteProductMeasurementWorkflowInput) => {
    const lockInput = transform({ input }, ({ input: current }) => ({
      key: `measurement-product:${current.product_id}`,
      timeout: 5,
      ttl: 30,
    }))
    const releaseInput = transform({ input }, ({ input: current }) => ({
      key: `measurement-product:${current.product_id}`,
    }))

    acquireLockStep(lockInput)

    const plan = prepareDeleteProductMeasurementStep(input)
    const currentRecords = transform({ plan }, ({ plan: current }) =>
      current.current ? [current.current] : []
    )
    const productLinks = findActiveProductMeasurementLinksStep(currentRecords)
    const variantLinks = findActiveProductVariantMeasurementLinksStep(
      plan.variant_measurements
    )

    dismissProductVariantMeasurementLinksStep(variantLinks)
    softDeleteProductVariantMeasurementsStep(plan.variant_measurements)
    dismissProductMeasurementLinksStep(productLinks)
    softDeleteProductMeasurementsStep(currentRecords)

    releaseLockStep(releaseInput)

    return new WorkflowResponse(plan.current)
  }
)

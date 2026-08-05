import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  acquireLockStep,
  createRemoteLinkStep,
  releaseLockStep,
} from "@medusajs/medusa/core-flows"

import { productVariantMeasurementLink } from "../steps/helpers"
import {
  dismissProductVariantMeasurementLinksStep,
  restoreProductVariantMeasurementLinksStep,
} from "../steps/measurement-link-mutations"
import {
  createProductVariantMeasurementsStep,
  restoreProductVariantMeasurementsStep,
  updateProductVariantMeasurementsStep,
} from "../steps/measurement-record-mutations"
import {
  prepareProductVariantMeasurementLinkPlanStep,
  prepareSetProductVariantMeasurementStep,
} from "../steps/prepare-measurement-transitions"
import type { SetProductVariantMeasurementWorkflowInput } from "../types"

export const setProductVariantMeasurementWorkflow = createWorkflow(
  "set-product-variant-measurement",
  (input: SetProductVariantMeasurementWorkflowInput) => {
    const lockInput = transform({ input }, ({ input: current }) => ({
      key: `measurement-product:${current.product_id}`,
      timeout: 5,
      ttl: 30,
    }))
    const releaseInput = transform({ input }, ({ input: current }) => ({
      key: `measurement-product:${current.product_id}`,
    }))

    acquireLockStep(lockInput)

    const plan = prepareSetProductVariantMeasurementStep(input)
    restoreProductVariantMeasurementsStep(plan.restore)
    const previous = transform({ plan }, ({ plan: current }) =>
      current.existing ? [current.existing] : [],
    )
    const updated = updateProductVariantMeasurementsStep({
      previous,
      updates: plan.update,
    })
    const createInput = transform({ plan }, ({ plan: current }) =>
      current.create ? [current.create] : [],
    )
    const created = createProductVariantMeasurementsStep(createInput)
    const targetRecords = transform({ created, updated }, (data) => [
      ...data.updated,
      ...data.created,
    ])
    const linkPlan = prepareProductVariantMeasurementLinkPlanStep(targetRecords)

    dismissProductVariantMeasurementLinksStep(linkPlan.links_to_dismiss)
    restoreProductVariantMeasurementLinksStep(linkPlan.links_to_restore)
    const linksToCreate = transform(linkPlan.links_to_create, (links) =>
      links.map((link) =>
        productVariantMeasurementLink(
          link.product_variant_id,
          link.product_variant_measurement_id,
        ),
      ),
    )
    createRemoteLinkStep(linksToCreate).config({
      name: "create-set-product-variant-measurement-link",
    })

    releaseLockStep(releaseInput)

    const result = transform(targetRecords, (records) => records[0] ?? null)
    return new WorkflowResponse(result)
  },
)

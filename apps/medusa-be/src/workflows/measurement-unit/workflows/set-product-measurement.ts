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

import {
  productMeasurementLink,
  productVariantMeasurementLink,
} from "../steps/helpers"
import {
  dismissProductMeasurementLinksStep,
  dismissProductVariantMeasurementLinksStep,
  restoreProductMeasurementLinksStep,
  restoreProductVariantMeasurementLinksStep,
} from "../steps/measurement-link-mutations"
import {
  activateProductMeasurementStep,
  createProductVariantMeasurementsStep,
  restoreProductVariantMeasurementsStep,
  softDeleteProductMeasurementsStep,
  softDeleteProductVariantMeasurementsStep,
  updateProductVariantMeasurementsStep,
} from "../steps/measurement-record-mutations"
import {
  prepareProductMeasurementLinkPlanStep,
  prepareProductMeasurementTransitionStep,
  prepareProductVariantMeasurementLinkPlanStep,
  prepareVariantMeasurementMigrationStep,
} from "../steps/prepare-measurement-transitions"
import type { SetProductMeasurementWorkflowInput } from "../types"

export const setProductMeasurementWorkflow = createWorkflow(
  "set-product-measurement",
  (input: SetProductMeasurementWorkflowInput) => {
    const lockInput = transform({ input }, ({ input: current }) => ({
      key: [
        `measurement-product:${current.product_id}`,
        `measurement-unit:${current.measurement_unit_id}`,
      ].sort(),
      timeout: 5,
      ttl: 30,
    }))
    const releaseInput = transform({ input }, ({ input: current }) => ({
      key: [
        `measurement-product:${current.product_id}`,
        `measurement-unit:${current.measurement_unit_id}`,
      ].sort(),
    }))

    acquireLockStep(lockInput)

    const transition = prepareProductMeasurementTransitionStep(input)
    const previousMeasurements = transform(
      { transition },
      ({ transition: current }) =>
        current.previous && !current.source_target_same
          ? [current.previous]
          : []
    )
    const previousVariantMeasurements = transform(
      { transition },
      ({ transition: current }) =>
        current.source_target_same ? [] : current.previous_variant_measurements
    )

    softDeleteProductVariantMeasurementsStep(previousVariantMeasurements)
    softDeleteProductMeasurementsStep(previousMeasurements)

    const target = activateProductMeasurementStep({
      existing: transition.existing_target,
      measurement_unit_id: input.measurement_unit_id,
      product_id: input.product_id,
    })
    const variantMigration = prepareVariantMeasurementMigrationStep({
      previous_variant_measurements: transition.previous_variant_measurements,
      source_target_same: transition.source_target_same,
      target_product_measurement_id: target.id,
    })

    restoreProductVariantMeasurementsStep(variantMigration.records_to_restore)
    const updatedVariants = updateProductVariantMeasurementsStep({
      previous: variantMigration.previous_for_update,
      updates: variantMigration.updates,
    })
    const createdVariants = createProductVariantMeasurementsStep(
      variantMigration.creates
    )
    const targetVariants = transform(
      {
        createdVariants,
        unchangedRecords: variantMigration.unchanged_records,
        updatedVariants,
      },
      (data) => [
        ...data.unchangedRecords,
        ...data.updatedVariants,
        ...data.createdVariants,
      ]
    )

    const productLinkPlan = prepareProductMeasurementLinkPlanStep({
      product_id: input.product_id,
      product_measurement_id: target.id,
    })
    dismissProductMeasurementLinksStep(productLinkPlan.links_to_dismiss)
    restoreProductMeasurementLinksStep(productLinkPlan.links_to_restore)
    const productLinksToCreate = transform(
      productLinkPlan.links_to_create,
      (links) =>
        links.map((link) =>
          productMeasurementLink(link.product_id, link.product_measurement_id)
        )
    )
    createRemoteLinkStep(productLinksToCreate).config({
      name: "create-product-measurement-link",
    })

    const variantLinkPlan =
      prepareProductVariantMeasurementLinkPlanStep(targetVariants)
    dismissProductVariantMeasurementLinksStep(variantLinkPlan.links_to_dismiss)
    restoreProductVariantMeasurementLinksStep(variantLinkPlan.links_to_restore)
    const variantLinksToCreate = transform(
      variantLinkPlan.links_to_create,
      (links) =>
        links.map((link) =>
          productVariantMeasurementLink(
            link.product_variant_id,
            link.product_variant_measurement_id
          )
        )
    )
    createRemoteLinkStep(variantLinksToCreate).config({
      name: "create-product-variant-measurement-links",
    })

    releaseLockStep(releaseInput)

    return new WorkflowResponse(target)
  }
)

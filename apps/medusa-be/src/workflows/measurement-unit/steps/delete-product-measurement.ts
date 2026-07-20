import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import {
  getMeasurementUnitService,
  type ProductMeasurementRecord,
} from "../../../utils/measurement-units"
import type { DeleteProductMeasurementWorkflowInput } from "../types"
import {
  dismissProductMeasurementLink,
  dismissProductVariantMeasurementLinks,
  getCurrentProductMeasurement,
  restoreOrCreateProductMeasurementLink,
  restoreOrCreateProductVariantMeasurementLinks,
} from "./helpers"

export const deleteProductMeasurementStep = createStep(
  "delete-product-measurement",
  async (input: DeleteProductMeasurementWorkflowInput, { container }) => {
    const current = await getCurrentProductMeasurement(
      container,
      input.product_id
    )

    if (!current?.id) {
      return new StepResponse(null, null)
    }

    const variantMeasurements = current.variant_measurements ?? []

    await dismissProductVariantMeasurementLinks(container, variantMeasurements)
    await dismissProductMeasurementLink(container, input.product_id, current.id)
    if (variantMeasurements.length) {
      await getMeasurementUnitService(
        container
      ).softDeleteProductVariantMeasurements(
        variantMeasurements.map((measurement) => measurement.id)
      )
    }
    await getMeasurementUnitService(container).softDeleteProductMeasurements([
      current.id,
    ])

    return new StepResponse(current, current)
  },
  async (
    previous: ProductMeasurementRecord | null | undefined,
    { container }
  ) => {
    if (!previous?.id) {
      return
    }

    const variantMeasurements = previous.variant_measurements ?? []

    await getMeasurementUnitService(container).restoreProductMeasurements([
      previous.id,
    ])
    if (variantMeasurements.length) {
      await getMeasurementUnitService(
        container
      ).restoreProductVariantMeasurements(
        variantMeasurements.map((measurement) => measurement.id)
      )
    }
    await restoreOrCreateProductMeasurementLink(
      container,
      previous.product_id,
      previous.id
    )
    await restoreOrCreateProductVariantMeasurementLinks(
      container,
      variantMeasurements
    )
  }
)

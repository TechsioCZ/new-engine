import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import {
  getMeasurementUnitService,
  type ProductVariantMeasurementRecord,
} from "../../../utils/measurement-units"
import type { DeleteProductVariantMeasurementWorkflowInput } from "../types"
import {
  dismissProductVariantMeasurementLinks,
  ensureProductVariantBelongsToProduct,
  getCurrentProductMeasurement,
  restoreOrCreateProductVariantMeasurementLinks,
} from "./helpers"

export const deleteProductVariantMeasurementStep = createStep(
  "delete-product-variant-measurement",
  async (
    input: DeleteProductVariantMeasurementWorkflowInput,
    { container }
  ) => {
    await ensureProductVariantBelongsToProduct(
      container,
      input.product_id,
      input.product_variant_id
    )

    const productMeasurement = await getCurrentProductMeasurement(
      container,
      input.product_id
    )
    const current = productMeasurement?.variant_measurements?.find(
      (measurement) =>
        measurement.product_variant_id === input.product_variant_id
    )

    if (!current?.id) {
      return new StepResponse(null, null)
    }

    await dismissProductVariantMeasurementLinks(container, [current])
    await getMeasurementUnitService(
      container
    ).softDeleteProductVariantMeasurements([current.id])

    return new StepResponse(current, current)
  },
  async (
    previous: ProductVariantMeasurementRecord | null | undefined,
    { container }
  ) => {
    if (!previous?.id) {
      return
    }

    await getMeasurementUnitService(
      container
    ).restoreProductVariantMeasurements([previous.id])
    await restoreOrCreateProductVariantMeasurementLinks(container, [previous])
  }
)

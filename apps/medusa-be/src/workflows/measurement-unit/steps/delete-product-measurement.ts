import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { ProductMeasurementRecord } from "../../../utils/measurement-units"
import type { DeleteProductMeasurementWorkflowInput } from "../types"
import {
  createProductMeasurementLink,
  dismissProductMeasurementLink,
  getCurrentProductMeasurement,
  getMeasurementUnitService,
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

    await dismissProductMeasurementLink(container, input.product_id, current.id)
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

    await getMeasurementUnitService(container).restoreProductMeasurements([
      previous.id,
    ])
    await createProductMeasurementLink(
      container,
      previous.product_id,
      previous.id
    )
  }
)

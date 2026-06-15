import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { ProductMeasurementRecord } from "../../../utils/measurement-units"
import type { SetProductMeasurementWorkflowInput } from "../types"
import {
  createProductMeasurementLink,
  dismissProductMeasurementLink,
  ensureProductExists,
  getCurrentProductMeasurement,
  getMeasurementUnitService,
  retrieveActiveUnitOrThrow,
} from "./helpers"

type CompensationData = {
  created?: ProductMeasurementRecord
  previous: ProductMeasurementRecord | null
  product_id: string
}

export const setProductMeasurementStep = createStep(
  "set-product-measurement",
  async (input: SetProductMeasurementWorkflowInput, { container }) => {
    if (
      !(
        Number.isFinite(input.product_unit_quantity) &&
        input.product_unit_quantity > 0
      )
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Product unit quantity must be greater than zero"
      )
    }

    await ensureProductExists(container, input.product_id)
    await retrieveActiveUnitOrThrow(container, input.measurement_unit_id)

    const service = getMeasurementUnitService(container)
    const previous = await getCurrentProductMeasurement(
      container,
      input.product_id
    )

    if (previous?.id) {
      const updated = (await service.updateProductMeasurements({
        id: previous.id,
        measurement_unit_id: input.measurement_unit_id,
        product_unit_quantity: input.product_unit_quantity,
      })) as ProductMeasurementRecord

      return new StepResponse(updated, {
        previous,
        product_id: input.product_id,
      })
    }

    const created = (await service.createProductMeasurements({
      measurement_unit_id: input.measurement_unit_id,
      product_id: input.product_id,
      product_unit_quantity: input.product_unit_quantity,
    })) as ProductMeasurementRecord

    await createProductMeasurementLink(container, input.product_id, created.id)

    return new StepResponse(created, {
      created,
      previous: null,
      product_id: input.product_id,
    })
  },
  async (data: CompensationData | undefined, { container }) => {
    if (!data) {
      return
    }

    const service = getMeasurementUnitService(container)

    if (data.created?.id) {
      await dismissProductMeasurementLink(
        container,
        data.product_id,
        data.created.id
      )
      await service.softDeleteProductMeasurements([data.created.id])
      return
    }

    if (data.previous?.id) {
      await service.updateProductMeasurements({
        id: data.previous.id,
        measurement_unit_id: data.previous.measurement_unit_id,
        product_unit_quantity: data.previous.product_unit_quantity,
      })
    }
  }
)

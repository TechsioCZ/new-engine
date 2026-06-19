import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import {
  getMeasurementUnitService,
  type ProductVariantMeasurementRecord,
} from "../../../utils/measurement-units"
import type { SetProductVariantMeasurementWorkflowInput } from "../types"
import {
  dismissProductVariantMeasurementLinks,
  ensureProductVariantBelongsToProduct,
  getCanonicalProductVariantMeasurement,
  getCurrentProductMeasurement,
  restoreOrCreateProductVariantMeasurementLinks,
} from "./helpers"

type CompensationData = {
  created?: ProductVariantMeasurementRecord
  previous?: ProductVariantMeasurementRecord
  restored?: ProductVariantMeasurementRecord
}

export const setProductVariantMeasurementStep = createStep(
  "set-product-variant-measurement",
  async (input: SetProductVariantMeasurementWorkflowInput, { container }) => {
    if (
      !(
        Number.isFinite(input.product_unit_quantity) &&
        input.product_unit_quantity > 0
      )
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Product unit quantity must be greater than zero."
      )
    }

    await ensureProductVariantBelongsToProduct(
      container,
      input.product_id,
      input.product_variant_id
    )

    const productMeasurement = await getCurrentProductMeasurement(
      container,
      input.product_id
    )

    if (!productMeasurement?.id) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Product must have a measurement unit before variant quantity can be set."
      )
    }

    const service = getMeasurementUnitService(container)
    const activePrevious = productMeasurement.variant_measurements?.find(
      (measurement) =>
        measurement.product_variant_id === input.product_variant_id
    )
    const previous =
      activePrevious ??
      (await getCanonicalProductVariantMeasurement({
        container,
        productMeasurementId: productMeasurement.id,
        productVariantId: input.product_variant_id,
        withDeleted: true,
      }))

    if (previous?.id && !previous.deleted_at) {
      const updated = (await service.updateProductVariantMeasurements({
        id: previous.id,
        product_unit_quantity: input.product_unit_quantity,
      })) as ProductVariantMeasurementRecord
      await restoreOrCreateProductVariantMeasurementLinks(container, [updated])

      return new StepResponse(updated, { previous })
    }

    if (previous?.id) {
      await service.restoreProductVariantMeasurements([previous.id])

      const restored = (await service.updateProductVariantMeasurements({
        id: previous.id,
        product_measurement_id: productMeasurement.id,
        product_unit_quantity: input.product_unit_quantity,
        product_variant_id: input.product_variant_id,
      })) as ProductVariantMeasurementRecord
      await restoreOrCreateProductVariantMeasurementLinks(container, [restored])

      return new StepResponse(restored, { restored: previous })
    }

    const created = (await service.createProductVariantMeasurements({
      product_measurement_id: productMeasurement.id,
      product_unit_quantity: input.product_unit_quantity,
      product_variant_id: input.product_variant_id,
    })) as ProductVariantMeasurementRecord

    await restoreOrCreateProductVariantMeasurementLinks(container, [created])

    return new StepResponse(created, { created })
  },
  async (data: CompensationData | undefined, { container }) => {
    if (!data) {
      return
    }

    const service = getMeasurementUnitService(container)

    if (data.created?.id) {
      await dismissProductVariantMeasurementLinks(container, [data.created])
      await service.softDeleteProductVariantMeasurements([data.created.id])
      return
    }

    if (data.restored?.id) {
      await dismissProductVariantMeasurementLinks(container, [data.restored])
      await service.softDeleteProductVariantMeasurements([data.restored.id])
      return
    }

    if (data.previous?.id) {
      await service.updateProductVariantMeasurements({
        id: data.previous.id,
        product_measurement_id: data.previous.product_measurement_id,
        product_unit_quantity: data.previous.product_unit_quantity,
        product_variant_id: data.previous.product_variant_id,
      })
      await restoreOrCreateProductVariantMeasurementLinks(container, [
        data.previous,
      ])
    }
  }
)

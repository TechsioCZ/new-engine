import type { MedusaContainer } from "@medusajs/framework/types"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import {
  getMeasurementUnitService,
  type ProductMeasurementRecord,
  type ProductVariantMeasurementRecord,
} from "../../../utils/measurement-units"
import type { SetProductMeasurementWorkflowInput } from "../types"
import {
  dismissProductMeasurementLink,
  dismissProductVariantMeasurementLinks,
  ensureProductExists,
  getCanonicalProductMeasurement,
  getCanonicalProductVariantMeasurement,
  listProductMeasurementsForProduct,
  pickCanonicalRecord,
  restoreOrCreateProductMeasurementLink,
  restoreOrCreateProductVariantMeasurementLinks,
  retrieveActiveUnitOrThrow,
} from "./helpers"

type CompensationData = {
  created?: ProductMeasurementRecord
  restored?: ProductMeasurementRecord
  createdVariantMeasurements: ProductVariantMeasurementRecord[]
  restoredVariantMeasurements: ProductVariantMeasurementRecord[]
  updatedVariantMeasurements: ProductVariantMeasurementRecord[]
  previous: ProductMeasurementRecord | null
  previousVariantMeasurements: ProductVariantMeasurementRecord[]
  product_id: string
}

type MeasurementUnitService = ReturnType<typeof getMeasurementUnitService>

type TargetProductMeasurementResult = {
  created?: ProductMeasurementRecord
  productMeasurement: ProductMeasurementRecord
  restored?: ProductMeasurementRecord
}

type MoveVariantMeasurementsInput = {
  container: MedusaContainer
  previousVariantMeasurements: ProductVariantMeasurementRecord[]
  productMeasurementId: string
  service: MeasurementUnitService
}

const getActiveProductMeasurement = async (
  container: MedusaContainer,
  productId: string
) => {
  const productMeasurements = await listProductMeasurementsForProduct(
    container,
    productId,
    { withDeleted: true }
  )

  return (
    pickCanonicalRecord(
      productMeasurements.filter((measurement) => !measurement.deleted_at)
    ) ?? null
  )
}

const deactivateProductMeasurement = async (
  container: MedusaContainer,
  service: MeasurementUnitService,
  productMeasurement: ProductMeasurementRecord
) => {
  const variantMeasurements = productMeasurement.variant_measurements ?? []

  await dismissProductMeasurementLink(
    container,
    productMeasurement.product_id,
    productMeasurement.id
  )

  if (variantMeasurements.length) {
    await dismissProductVariantMeasurementLinks(container, variantMeasurements)
    await service.softDeleteProductVariantMeasurements(
      variantMeasurements.map((measurement) => measurement.id)
    )
  }

  await service.softDeleteProductMeasurements([productMeasurement.id])
}

const restoreOrCreateTargetProductMeasurement = async ({
  container,
  productId,
  service,
  unitId,
}: {
  container: MedusaContainer
  productId: string
  service: MeasurementUnitService
  unitId: string
}): Promise<TargetProductMeasurementResult> => {
  const existingTarget = await getCanonicalProductMeasurement({
    container,
    productId,
    unitId,
    withDeleted: true,
  })

  if (existingTarget?.id) {
    let restored: ProductMeasurementRecord | undefined

    if (existingTarget.deleted_at) {
      await service.restoreProductMeasurements([existingTarget.id])
      restored = existingTarget
    }

    return {
      productMeasurement: existingTarget,
      restored,
    }
  }

  const created = (await service.createProductMeasurements({
    measurement_unit_id: unitId,
    product_id: productId,
  })) as ProductMeasurementRecord

  return {
    created,
    productMeasurement: created,
  }
}

const moveVariantMeasurements = async ({
  container,
  previousVariantMeasurements,
  productMeasurementId,
  service,
}: MoveVariantMeasurementsInput) => {
  const createdVariantMeasurements: ProductVariantMeasurementRecord[] = []
  const restoredVariantMeasurements: ProductVariantMeasurementRecord[] = []
  const updatedVariantMeasurements: ProductVariantMeasurementRecord[] = []
  const nextVariantMeasurements: ProductVariantMeasurementRecord[] = []

  for (const previousVariantMeasurement of previousVariantMeasurements) {
    const existingVariantMeasurement =
      await getCanonicalProductVariantMeasurement({
        container,
        productMeasurementId,
        productVariantId: previousVariantMeasurement.product_variant_id,
        withDeleted: true,
      })

    if (existingVariantMeasurement?.id) {
      if (existingVariantMeasurement.deleted_at) {
        await service.restoreProductVariantMeasurements([
          existingVariantMeasurement.id,
        ])
        restoredVariantMeasurements.push(existingVariantMeasurement)
      } else {
        updatedVariantMeasurements.push(existingVariantMeasurement)
      }

      const updated = (await service.updateProductVariantMeasurements({
        id: existingVariantMeasurement.id,
        product_measurement_id: productMeasurementId,
        product_unit_quantity: previousVariantMeasurement.product_unit_quantity,
        product_variant_id: previousVariantMeasurement.product_variant_id,
      })) as ProductVariantMeasurementRecord
      nextVariantMeasurements.push(updated)
      continue
    }

    const createdVariant = (await service.createProductVariantMeasurements({
      product_measurement_id: productMeasurementId,
      product_unit_quantity: previousVariantMeasurement.product_unit_quantity,
      product_variant_id: previousVariantMeasurement.product_variant_id,
    })) as ProductVariantMeasurementRecord

    createdVariantMeasurements.push(createdVariant)
    nextVariantMeasurements.push(createdVariant)
  }

  return {
    createdVariantMeasurements,
    nextVariantMeasurements,
    restoredVariantMeasurements,
    updatedVariantMeasurements,
  }
}

export const setProductMeasurementStep = createStep(
  "set-product-measurement",
  async (input: SetProductMeasurementWorkflowInput, { container }) => {
    await retrieveActiveUnitOrThrow(container, input.measurement_unit_id)
    await ensureProductExists(container, input.product_id)

    const service = getMeasurementUnitService(container)
    const previous = await getActiveProductMeasurement(
      container,
      input.product_id
    )
    const previousVariantMeasurements = previous?.variant_measurements ?? []

    if (
      previous?.id &&
      previous.measurement_unit_id === input.measurement_unit_id
    ) {
      await restoreOrCreateProductMeasurementLink(
        container,
        input.product_id,
        previous.id
      )

      return new StepResponse(previous, {
        createdVariantMeasurements: [],
        restoredVariantMeasurements: [],
        updatedVariantMeasurements: [],
        previous,
        previousVariantMeasurements: [],
        product_id: input.product_id,
      })
    }

    if (previous?.id) {
      await deactivateProductMeasurement(container, service, previous)
    }

    const { created, productMeasurement, restored } =
      await restoreOrCreateTargetProductMeasurement({
        container,
        productId: input.product_id,
        service,
        unitId: input.measurement_unit_id,
      })

    await restoreOrCreateProductMeasurementLink(
      container,
      input.product_id,
      productMeasurement.id
    )

    const {
      createdVariantMeasurements,
      nextVariantMeasurements,
      restoredVariantMeasurements,
      updatedVariantMeasurements,
    } = await moveVariantMeasurements({
      container,
      previousVariantMeasurements,
      productMeasurementId: productMeasurement.id,
      service,
    })

    await restoreOrCreateProductVariantMeasurementLinks(
      container,
      nextVariantMeasurements
    )

    return new StepResponse(productMeasurement, {
      created,
      createdVariantMeasurements,
      previous,
      previousVariantMeasurements,
      product_id: input.product_id,
      restored,
      restoredVariantMeasurements,
      updatedVariantMeasurements,
    })
  },
  async (data: CompensationData | undefined, { container }) => {
    if (!data) {
      return
    }

    const service = getMeasurementUnitService(container)

    if (data.createdVariantMeasurements.length) {
      await dismissProductVariantMeasurementLinks(
        container,
        data.createdVariantMeasurements
      )
      await service.softDeleteProductVariantMeasurements(
        data.createdVariantMeasurements.map((measurement) => measurement.id)
      )
    }

    if (data.restoredVariantMeasurements.length) {
      await dismissProductVariantMeasurementLinks(
        container,
        data.restoredVariantMeasurements
      )
      await service.softDeleteProductVariantMeasurements(
        data.restoredVariantMeasurements.map((measurement) => measurement.id)
      )
    }

    if (data.updatedVariantMeasurements.length) {
      await service.updateProductVariantMeasurements(
        data.updatedVariantMeasurements.map((measurement) => ({
          id: measurement.id,
          product_measurement_id: measurement.product_measurement_id,
          product_unit_quantity: measurement.product_unit_quantity,
          product_variant_id: measurement.product_variant_id,
        }))
      )
    }

    if (data.created?.id) {
      await dismissProductMeasurementLink(
        container,
        data.product_id,
        data.created.id
      )
      await service.softDeleteProductMeasurements([data.created.id])
    }

    if (data.restored?.id) {
      await dismissProductMeasurementLink(
        container,
        data.product_id,
        data.restored.id
      )
      await service.softDeleteProductMeasurements([data.restored.id])
    }

    if (data.previous?.id) {
      await service.restoreProductMeasurements([data.previous.id])
      await restoreOrCreateProductMeasurementLink(
        container,
        data.product_id,
        data.previous.id
      )
    }

    if (data.previousVariantMeasurements.length) {
      await service.restoreProductVariantMeasurements(
        data.previousVariantMeasurements.map((measurement) => measurement.id)
      )
      await restoreOrCreateProductVariantMeasurementLinks(
        container,
        data.previousVariantMeasurements
      )
    }
  }
)

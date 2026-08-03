import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import {
  getMeasurementUnitService,
  type ProductMeasurementRecord,
  type ProductVariantMeasurementRecord,
} from "../../../utils/measurement-units"

type ActivateProductMeasurementInput = {
  existing?: ProductMeasurementRecord
  measurement_unit_id: string
  product_id: string
}

type ActivateProductMeasurementCompensation = {
  action: "created" | "none" | "restored"
  id: string
}

type CreateVariantMeasurementInput = {
  product_measurement_id: string
  product_unit_quantity: number
  product_variant_id: string
}

type UpdateVariantMeasurementsInput = {
  previous: ProductVariantMeasurementRecord[]
  updates: Array<{
    id: string
    product_measurement_id: string
    product_unit_quantity: number
    product_variant_id: string
  }>
}

export const activateProductMeasurementStep = createStep(
  "activate-product-measurement",
  async (input: ActivateProductMeasurementInput, { container }) => {
    const service = getMeasurementUnitService(container)

    if (input.existing?.id) {
      if (!input.existing.deleted_at) {
        return new StepResponse(input.existing, {
          action: "none",
          id: input.existing.id,
        } satisfies ActivateProductMeasurementCompensation)
      }

      await service.restoreProductMeasurements([input.existing.id])

      return new StepResponse(
        {
          ...input.existing,
          deleted_at: null,
        },
        {
          action: "restored",
          id: input.existing.id,
        } satisfies ActivateProductMeasurementCompensation
      )
    }

    const created = await service.createProductMeasurements({
      measurement_unit_id: input.measurement_unit_id,
      product_id: input.product_id,
    })

    return new StepResponse(created, {
      action: "created",
      id: created.id,
    } satisfies ActivateProductMeasurementCompensation)
  },
  async (
    compensation: ActivateProductMeasurementCompensation | undefined,
    { container }
  ) => {
    if (!compensation || compensation.action === "none") {
      return
    }

    const service = getMeasurementUnitService(container)

    if (compensation.action === "created") {
      await service.softDeleteProductMeasurements([compensation.id])
      return
    }

    await service.softDeleteProductMeasurements([compensation.id])
  }
)

export const softDeleteProductMeasurementsStep = createStep(
  "soft-delete-product-measurements",
  async (records: ProductMeasurementRecord[], { container }) => {
    if (records.length) {
      await getMeasurementUnitService(container).softDeleteProductMeasurements(
        records.map((record) => record.id)
      )
    }

    return new StepResponse(records, records)
  },
  async (records: ProductMeasurementRecord[] | undefined, { container }) => {
    if (records?.length) {
      await getMeasurementUnitService(container).restoreProductMeasurements(
        records.map((record) => record.id)
      )
    }
  }
)

export const softDeleteProductVariantMeasurementsStep = createStep(
  "soft-delete-product-variant-measurements",
  async (records: ProductVariantMeasurementRecord[], { container }) => {
    if (records.length) {
      await getMeasurementUnitService(
        container
      ).softDeleteProductVariantMeasurements(records.map((record) => record.id))
    }

    return new StepResponse(records, records)
  },
  async (
    records: ProductVariantMeasurementRecord[] | undefined,
    { container }
  ) => {
    if (records?.length) {
      await getMeasurementUnitService(
        container
      ).restoreProductVariantMeasurements(records.map((record) => record.id))
    }
  }
)

export const restoreProductVariantMeasurementsStep = createStep(
  "restore-product-variant-measurements",
  async (records: ProductVariantMeasurementRecord[], { container }) => {
    if (records.length) {
      await getMeasurementUnitService(
        container
      ).restoreProductVariantMeasurements(records.map((record) => record.id))
    }

    return new StepResponse(
      records.map((record) => ({ ...record, deleted_at: null })),
      records
    )
  },
  async (
    records: ProductVariantMeasurementRecord[] | undefined,
    { container }
  ) => {
    if (records?.length) {
      await getMeasurementUnitService(
        container
      ).softDeleteProductVariantMeasurements(records.map((record) => record.id))
    }
  }
)

export const updateProductVariantMeasurementsStep = createStep(
  "update-product-variant-measurements",
  async (input: UpdateVariantMeasurementsInput, { container }) => {
    if (!input.updates.length) {
      return new StepResponse([], input.previous)
    }

    const updated = await getMeasurementUnitService(
      container
    ).updateProductVariantMeasurements(input.updates)

    return new StepResponse(updated, input.previous)
  },
  async (
    previous: ProductVariantMeasurementRecord[] | undefined,
    { container }
  ) => {
    if (!previous?.length) {
      return
    }

    await getMeasurementUnitService(container).updateProductVariantMeasurements(
      previous.map((record) => ({
        id: record.id,
        product_measurement_id: record.product_measurement_id,
        product_unit_quantity: record.product_unit_quantity,
        product_variant_id: record.product_variant_id,
      }))
    )
  }
)

export const createProductVariantMeasurementsStep = createStep(
  "create-product-variant-measurements",
  async (input: CreateVariantMeasurementInput[], { container }) => {
    if (!input.length) {
      return new StepResponse([], [])
    }

    const created =
      await getMeasurementUnitService(
        container
      ).createProductVariantMeasurements(input)

    return new StepResponse(
      created,
      created.map((record) => record.id)
    )
  },
  async (createdIds: string[] | undefined, { container }) => {
    if (createdIds?.length) {
      await getMeasurementUnitService(
        container
      ).softDeleteProductVariantMeasurements(createdIds)
    }
  }
)

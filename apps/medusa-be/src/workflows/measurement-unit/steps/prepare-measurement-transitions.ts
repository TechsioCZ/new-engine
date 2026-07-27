import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ProductMeasurementLink } from "../../../links/product-measurement"
import { ProductVariantMeasurementLink } from "../../../links/product-variant-measurement"
import {
  getMeasurementUnitService,
  type ProductMeasurementRecord,
  type ProductVariantMeasurementRecord,
  toNumber,
} from "../../../utils/measurement-units"
import type {
  DeleteProductMeasurementWorkflowInput,
  DeleteProductVariantMeasurementWorkflowInput,
  SetProductMeasurementWorkflowInput,
  SetProductVariantMeasurementWorkflowInput,
} from "../types"
import {
  ensureProductExists,
  ensureProductVariantBelongsToProduct,
  getCanonicalProductMeasurement,
  getCanonicalProductVariantMeasurement,
  getCurrentProductMeasurement,
  listProductMeasurementsForProduct,
  pickCanonicalRecord,
  retrieveActiveUnitOrThrow,
} from "./helpers"
import type {
  ProductMeasurementLinkIds,
  ProductVariantMeasurementLinkIds,
} from "./measurement-link-mutations"

type ProductMeasurementLinkRecord = ProductMeasurementLinkIds & {
  deleted_at?: Date | string | null
}

type ProductVariantMeasurementLinkRecord = ProductVariantMeasurementLinkIds & {
  deleted_at?: Date | string | null
}

export type ProductMeasurementTransitionPlan = {
  existing_target?: ProductMeasurementRecord
  previous?: ProductMeasurementRecord
  previous_variant_measurements: ProductVariantMeasurementRecord[]
  source_target_same: boolean
}

export type VariantMeasurementMigrationPlan = {
  creates: Array<{
    product_measurement_id: string
    product_unit_quantity: number
    product_variant_id: string
  }>
  previous_for_update: ProductVariantMeasurementRecord[]
  records_to_restore: ProductVariantMeasurementRecord[]
  unchanged_records: ProductVariantMeasurementRecord[]
  updates: Array<{
    id: string
    product_measurement_id: string
    product_unit_quantity: number
    product_variant_id: string
  }>
}

export type ProductMeasurementLinkPlan = {
  links_to_create: ProductMeasurementLinkIds[]
  links_to_dismiss: ProductMeasurementLinkIds[]
  links_to_restore: ProductMeasurementLinkIds[]
}

export type ProductVariantMeasurementLinkPlan = {
  links_to_create: ProductVariantMeasurementLinkIds[]
  links_to_dismiss: ProductVariantMeasurementLinkIds[]
  links_to_restore: ProductVariantMeasurementLinkIds[]
}

export type SetVariantMeasurementPlan = {
  create?: {
    product_measurement_id: string
    product_unit_quantity: number
    product_variant_id: string
  }
  existing?: ProductVariantMeasurementRecord
  product_measurement: ProductMeasurementRecord
  restore: ProductVariantMeasurementRecord[]
  update: Array<{
    id: string
    product_measurement_id: string
    product_unit_quantity: number
    product_variant_id: string
  }>
}

export type DeleteProductMeasurementPlan = {
  current?: ProductMeasurementRecord
  variant_measurements: ProductVariantMeasurementRecord[]
}

export type DeleteProductVariantMeasurementPlan = {
  current?: ProductVariantMeasurementRecord
}

const emptyVariantMeasurementMigrationPlan = (
  unchangedRecords: ProductVariantMeasurementRecord[] = []
): VariantMeasurementMigrationPlan => ({
  creates: [],
  previous_for_update: [],
  records_to_restore: [],
  unchanged_records: unchangedRecords,
  updates: [],
})

const indexCanonicalVariantMeasurements = (
  records: ProductVariantMeasurementRecord[]
) => {
  const recordsByVariantId = new Map<
    string,
    ProductVariantMeasurementRecord[]
  >()

  for (const record of records) {
    const grouped = recordsByVariantId.get(record.product_variant_id) ?? []
    grouped.push(record)
    recordsByVariantId.set(record.product_variant_id, grouped)
  }

  return new Map(
    [...recordsByVariantId.entries()].flatMap(([variantId, grouped]) => {
      const canonical = pickCanonicalRecord(grouped)
      return canonical ? [[variantId, canonical] as const] : []
    })
  )
}

const buildVariantMeasurementMigrationPlan = ({
  existingRecords,
  previousRecords,
  targetProductMeasurementId,
}: {
  existingRecords: ProductVariantMeasurementRecord[]
  previousRecords: ProductVariantMeasurementRecord[]
  targetProductMeasurementId: string
}): VariantMeasurementMigrationPlan => {
  const existingByVariantId = indexCanonicalVariantMeasurements(existingRecords)
  const plan = emptyVariantMeasurementMigrationPlan()

  for (const previous of previousRecords) {
    const quantity = toNumber(previous.product_unit_quantity)

    if (!(Number.isFinite(quantity) && quantity > 0)) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Product variant measurement "${previous.id}" has an invalid quantity.`
      )
    }

    const existing = existingByVariantId.get(previous.product_variant_id)

    if (!existing) {
      plan.creates.push({
        product_measurement_id: targetProductMeasurementId,
        product_unit_quantity: quantity,
        product_variant_id: previous.product_variant_id,
      })
      continue
    }

    const existingQuantity = toNumber(existing.product_unit_quantity)
    if (!existing.deleted_at && existingQuantity === quantity) {
      plan.unchanged_records.push(existing)
      continue
    }

    if (existing.deleted_at) {
      plan.records_to_restore.push(existing)
    }
    plan.previous_for_update.push(existing)
    plan.updates.push({
      id: existing.id,
      product_measurement_id: targetProductMeasurementId,
      product_unit_quantity: quantity,
      product_variant_id: previous.product_variant_id,
    })
  }

  return plan
}

export const prepareProductMeasurementTransitionStep = createStep(
  "prepare-product-measurement-transition",
  async (input: SetProductMeasurementWorkflowInput, { container }) => {
    await retrieveActiveUnitOrThrow(container, input.measurement_unit_id)
    await ensureProductExists(container, input.product_id)

    const productMeasurements = await listProductMeasurementsForProduct(
      container,
      input.product_id,
      { withDeleted: true }
    )
    const previous = pickCanonicalRecord(
      productMeasurements.filter((measurement) => !measurement.deleted_at)
    )
    const existingTarget = pickCanonicalRecord(
      productMeasurements.filter(
        (measurement) =>
          measurement.measurement_unit_id === input.measurement_unit_id
      )
    )
    const sourceTargetSame =
      !!previous?.id && previous.id === existingTarget?.id

    return new StepResponse({
      existing_target: existingTarget,
      previous,
      previous_variant_measurements:
        previous?.variant_measurements?.filter(
          (measurement) => !measurement.deleted_at
        ) ?? [],
      source_target_same: sourceTargetSame,
    } satisfies ProductMeasurementTransitionPlan)
  }
)

export const prepareVariantMeasurementMigrationStep = createStep(
  "prepare-variant-measurement-migration",
  async (
    input: {
      previous_variant_measurements: ProductVariantMeasurementRecord[]
      source_target_same: boolean
      target_product_measurement_id: string
    },
    { container }
  ) => {
    if (!input.previous_variant_measurements.length) {
      return new StepResponse(emptyVariantMeasurementMigrationPlan())
    }

    if (input.source_target_same) {
      return new StepResponse(
        emptyVariantMeasurementMigrationPlan(
          input.previous_variant_measurements
        )
      )
    }

    const variantIds = input.previous_variant_measurements.map(
      (measurement) => measurement.product_variant_id
    )
    const existingRecords = await getMeasurementUnitService(
      container
    ).listProductVariantMeasurements(
      {
        product_measurement_id: input.target_product_measurement_id,
        product_variant_id: { $in: variantIds },
      },
      {
        withDeleted: true,
      }
    )
    return new StepResponse(
      buildVariantMeasurementMigrationPlan({
        existingRecords,
        previousRecords: input.previous_variant_measurements,
        targetProductMeasurementId: input.target_product_measurement_id,
      })
    )
  }
)

export const prepareProductMeasurementLinkPlanStep = createStep(
  "prepare-product-measurement-link-plan",
  async (
    input: { product_id: string; product_measurement_id: string },
    { container }
  ) => {
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: ProductMeasurementLink.entryPoint,
      fields: ["deleted_at", "product_id", "product_measurement_id"],
      filters: {
        product_id: input.product_id,
      },
      withDeleted: true,
    })
    const links = data as ProductMeasurementLinkRecord[]
    const target = links.find(
      (link) =>
        link.product_measurement_id === input.product_measurement_id &&
        link.product_id === input.product_id
    )
    const plan: ProductMeasurementLinkPlan = {
      links_to_create: target
        ? []
        : [
            {
              product_id: input.product_id,
              product_measurement_id: input.product_measurement_id,
            },
          ],
      links_to_dismiss: links
        .filter(
          (link) =>
            !link.deleted_at &&
            link.product_measurement_id !== input.product_measurement_id
        )
        .map((link) => ({
          product_id: link.product_id,
          product_measurement_id: link.product_measurement_id,
        })),
      links_to_restore:
        target?.deleted_at && target.product_measurement_id
          ? [
              {
                product_id: input.product_id,
                product_measurement_id: target.product_measurement_id,
              },
            ]
          : [],
    }

    return new StepResponse(plan)
  }
)

export const prepareProductVariantMeasurementLinkPlanStep = createStep(
  "prepare-product-variant-measurement-link-plan",
  async (targetRecords: ProductVariantMeasurementRecord[], { container }) => {
    if (!targetRecords.length) {
      return new StepResponse({
        links_to_create: [],
        links_to_dismiss: [],
        links_to_restore: [],
      } satisfies ProductVariantMeasurementLinkPlan)
    }

    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const variantIds = targetRecords.map((record) => record.product_variant_id)
    const targetRecordIds = new Set(targetRecords.map((record) => record.id))
    const { data } = await query.graph({
      entity: ProductVariantMeasurementLink.entryPoint,
      fields: [
        "deleted_at",
        "product_variant_id",
        "product_variant_measurement_id",
      ],
      filters: {
        product_variant_id: { $in: variantIds },
      },
      withDeleted: true,
    })
    const links = data as ProductVariantMeasurementLinkRecord[]
    const targetLinkByRecordId = new Map(
      links
        .filter((link) =>
          targetRecordIds.has(link.product_variant_measurement_id)
        )
        .map((link) => [link.product_variant_measurement_id, link])
    )
    const plan: ProductVariantMeasurementLinkPlan = {
      links_to_create: [],
      links_to_dismiss: links
        .filter(
          (link) =>
            !(
              link.deleted_at ||
              targetRecordIds.has(link.product_variant_measurement_id)
            )
        )
        .map((link) => ({
          product_variant_id: link.product_variant_id,
          product_variant_measurement_id: link.product_variant_measurement_id,
        })),
      links_to_restore: [],
    }

    for (const record of targetRecords) {
      const targetLink = targetLinkByRecordId.get(record.id)
      const ids = {
        product_variant_id: record.product_variant_id,
        product_variant_measurement_id: record.id,
      }

      if (!targetLink) {
        plan.links_to_create.push(ids)
      } else if (targetLink.deleted_at) {
        plan.links_to_restore.push(ids)
      }
    }

    return new StepResponse(plan)
  }
)

export const prepareSetProductVariantMeasurementStep = createStep(
  "prepare-set-product-variant-measurement",
  async (input: SetProductVariantMeasurementWorkflowInput, { container }) => {
    if (
      !Number.isFinite(input.product_unit_quantity) ||
      input.product_unit_quantity <= 0
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Product unit quantity must be a positive finite number."
      )
    }

    await ensureProductVariantBelongsToProduct(
      container,
      input.product_id,
      input.product_variant_id
    )

    const productMeasurement = await getCanonicalProductMeasurement({
      container,
      productId: input.product_id,
    })

    if (!productMeasurement?.id) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Product must have a measurement unit before variant quantity can be set."
      )
    }

    const existing = await getCanonicalProductVariantMeasurement({
      container,
      productMeasurementId: productMeasurement.id,
      productVariantId: input.product_variant_id,
      withDeleted: true,
    })
    const update = existing
      ? [
          {
            id: existing.id,
            product_measurement_id: productMeasurement.id,
            product_unit_quantity: input.product_unit_quantity,
            product_variant_id: input.product_variant_id,
          },
        ]
      : []

    return new StepResponse({
      create: existing
        ? undefined
        : {
            product_measurement_id: productMeasurement.id,
            product_unit_quantity: input.product_unit_quantity,
            product_variant_id: input.product_variant_id,
          },
      existing,
      product_measurement: productMeasurement,
      restore: existing?.deleted_at ? [existing] : [],
      update,
    } satisfies SetVariantMeasurementPlan)
  }
)

export const prepareDeleteProductMeasurementStep = createStep(
  "prepare-delete-product-measurement",
  async (input: DeleteProductMeasurementWorkflowInput, { container }) => {
    await ensureProductExists(container, input.product_id)
    const current = await getCurrentProductMeasurement(
      container,
      input.product_id
    )

    return new StepResponse({
      current,
      variant_measurements:
        current?.variant_measurements?.filter(
          (measurement) => !measurement.deleted_at
        ) ?? [],
    } satisfies DeleteProductMeasurementPlan)
  }
)

export const prepareDeleteProductVariantMeasurementStep = createStep(
  "prepare-delete-product-variant-measurement",
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
        measurement.product_variant_id === input.product_variant_id &&
        !measurement.deleted_at
    )

    return new StepResponse({
      current,
    } satisfies DeleteProductVariantMeasurementPlan)
  }
)

export const findActiveProductMeasurementLinksStep = createStep(
  "find-active-product-measurement-links",
  async (records: ProductMeasurementRecord[], { container }) => {
    if (!records.length) {
      return new StepResponse([] as ProductMeasurementLinkIds[])
    }

    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const recordIds = records.map((record) => record.id)
    const { data } = await query.graph({
      entity: ProductMeasurementLink.entryPoint,
      fields: ["product_id", "product_measurement_id"],
      filters: {
        product_measurement_id: { $in: recordIds },
      },
    })

    return new StepResponse(
      (data as ProductMeasurementLinkRecord[]).map((link) => ({
        product_id: link.product_id,
        product_measurement_id: link.product_measurement_id,
      }))
    )
  }
)

export const findActiveProductVariantMeasurementLinksStep = createStep(
  "find-active-product-variant-measurement-links",
  async (records: ProductVariantMeasurementRecord[], { container }) => {
    if (!records.length) {
      return new StepResponse([] as ProductVariantMeasurementLinkIds[])
    }

    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const recordIds = records.map((record) => record.id)
    const { data } = await query.graph({
      entity: ProductVariantMeasurementLink.entryPoint,
      fields: ["product_variant_id", "product_variant_measurement_id"],
      filters: {
        product_variant_measurement_id: { $in: recordIds },
      },
    })

    return new StepResponse(
      (data as ProductVariantMeasurementLinkRecord[]).map((link) => ({
        product_variant_id: link.product_variant_id,
        product_variant_measurement_id: link.product_variant_measurement_id,
      }))
    )
  }
)

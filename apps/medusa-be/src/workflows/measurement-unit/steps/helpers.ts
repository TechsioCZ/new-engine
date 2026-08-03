import type { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"

import { MEASUREMENT_UNIT_MODULE } from "../../../modules/measurement-unit"
import { getMeasurementUnitService } from "../../../utils/measurement-units"

type TimestampedRecord = {
  created_at?: Date | string
  deleted_at?: Date | string | null
  id: string
  updated_at?: Date | string
}

const getTime = (value?: Date | string) => {
  if (!value) {
    return 0
  }

  const time = new Date(value).getTime()

  return Number.isFinite(time) ? time : 0
}

const isDeleted = (record: { deleted_at?: Date | string | null }) =>
  !!record.deleted_at

export const pickCanonicalRecord = <TRecord extends TimestampedRecord>(
  records: TRecord[]
) => {
  const [record] = [...records].sort((left, right) => {
    const activeCompare = Number(isDeleted(left)) - Number(isDeleted(right))

    if (activeCompare !== 0) {
      return activeCompare
    }

    const leftTime = Math.max(
      getTime(left.updated_at),
      getTime(left.created_at)
    )
    const rightTime = Math.max(
      getTime(right.updated_at),
      getTime(right.created_at)
    )
    const timeCompare = rightTime - leftTime

    if (timeCompare !== 0) {
      return timeCompare
    }

    return left.id.localeCompare(right.id)
  })

  return record
}

export const normalizeUnitCode = (code: string) =>
  code.trim().toLowerCase().replace(/\s+/g, "_")

export const normalizeDescription = (description?: null | string) =>
  description?.trim() || null

export const productMeasurementLink = (
  productId: string,
  productMeasurementId: string
) => ({
  [Modules.PRODUCT]: {
    product_id: productId,
  },
  [MEASUREMENT_UNIT_MODULE]: {
    product_measurement_id: productMeasurementId,
  },
})

export const productVariantMeasurementLink = (
  productVariantId: string,
  productVariantMeasurementId: string
) => ({
  [Modules.PRODUCT]: {
    product_variant_id: productVariantId,
  },
  [MEASUREMENT_UNIT_MODULE]: {
    product_variant_measurement_id: productVariantMeasurementId,
  },
})

export const ensureProductExists = async (
  container: MedusaContainer,
  productId: string
) => {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product",
    fields: ["id"],
    filters: {
      id: productId,
    },
  })
  const product = data[0]

  if (!product?.id) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product with id "${productId}" was not found`
    )
  }

  return product
}

export const ensureProductVariantBelongsToProduct = async (
  container: MedusaContainer,
  productId: string,
  productVariantId: string
) => {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product_variant",
    fields: ["id", "product_id"],
    filters: {
      id: productVariantId,
    },
  })
  const variant = data[0]

  if (!variant?.id) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product variant with id "${productVariantId}" was not found`
    )
  }

  if (variant.product_id !== productId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Product variant "${productVariantId}" does not belong to product "${productId}".`
    )
  }

  return variant
}

export const retrieveActiveUnitOrThrow = async (
  container: MedusaContainer,
  unitId: string
) => {
  const [unit] = await getMeasurementUnitService(
    container
  ).listMeasurementUnits(
    {
      id: unitId,
    },
    {
      take: 1,
    }
  )

  if (!unit) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Measurement unit with id "${unitId}" was not found`
    )
  }

  return unit
}

export const ensureUnitCodeAvailable = async ({
  code,
  container,
  excludeId,
}: {
  code: string
  container: MedusaContainer
  excludeId?: string
}) => {
  const normalizedCode = normalizeUnitCode(code)
  const [existing] = await getMeasurementUnitService(
    container
  ).listMeasurementUnits(
    {
      code: normalizedCode,
    },
    {
      take: 1,
      withDeleted: true,
    }
  )

  if (existing && existing.id !== excludeId) {
    throw new MedusaError(
      MedusaError.Types.DUPLICATE_ERROR,
      `Measurement unit with code "${normalizedCode}" already exists.`
    )
  }

  return normalizedCode
}

export const getCurrentProductMeasurement = async (
  container: MedusaContainer,
  productId: string,
  options: { withDeleted?: boolean } = {}
) => {
  const [measurement] = await getMeasurementUnitService(
    container
  ).listProductMeasurements(
    {
      product_id: productId,
    },
    {
      relations: ["measurement_unit", "variant_measurements"],
      take: 1,
      ...(options.withDeleted === undefined
        ? {}
        : { withDeleted: options.withDeleted }),
    }
  )

  return measurement
}

export const listProductMeasurementsForProduct = async (
  container: MedusaContainer,
  productId: string,
  options: { withDeleted?: boolean } = {}
) =>
  await getMeasurementUnitService(container).listProductMeasurements(
    {
      product_id: productId,
    },
    {
      relations: ["measurement_unit", "variant_measurements"],
      ...(options.withDeleted === undefined
        ? {}
        : { withDeleted: options.withDeleted }),
    }
  )

export const getCanonicalProductMeasurement = async ({
  container,
  productId,
  unitId,
  withDeleted = false,
}: {
  container: MedusaContainer
  productId: string
  unitId?: string
  withDeleted?: boolean
}) => {
  const measurements = await listProductMeasurementsForProduct(
    container,
    productId,
    {
      withDeleted,
    }
  )
  const filtered = unitId
    ? measurements.filter(
        (measurement) => measurement.measurement_unit_id === unitId
      )
    : measurements

  return pickCanonicalRecord(filtered)
}

export const getCanonicalProductVariantMeasurement = async ({
  container,
  productMeasurementId,
  productVariantId,
  withDeleted = false,
}: {
  container: MedusaContainer
  productMeasurementId: string
  productVariantId: string
  withDeleted?: boolean
}) => {
  const measurements = await getMeasurementUnitService(
    container
  ).listProductVariantMeasurements(
    {
      product_measurement_id: productMeasurementId,
      product_variant_id: productVariantId,
    },
    {
      withDeleted,
    }
  )

  return pickCanonicalRecord(measurements)
}

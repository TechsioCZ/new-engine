import type { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import {
  getMeasurementUnitActiveProductCounts,
  getMeasurementUnitService,
  type MeasurementUnitRecord,
  type ProductMeasurementRecord,
  toMeasurementUnitResponse,
  toProductMeasurementResponse,
} from "../../../utils/measurement-units"

type RetrieveMeasurementUnitOptions = {
  withDeleted?: boolean
}

const LIKE_WILDCARD_REGEX = /[\\%_]/g

export const escapeLikePattern = (value: string) =>
  value.replace(LIKE_WILDCARD_REGEX, (match) => `\\${match}`)

export const uniqueIds = (ids: string[]) => [...new Set(ids)]

export const retrieveMeasurementUnitOrThrow = async (
  scope: MedusaContainer,
  unitId: string,
  options: RetrieveMeasurementUnitOptions = {}
) => {
  const [unit] = await getMeasurementUnitService(scope).listMeasurementUnits(
    {
      id: unitId,
    },
    {
      take: 1,
      withDeleted: options.withDeleted ?? false,
    }
  )

  if (!unit) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Measurement unit with id "${unitId}" was not found`
    )
  }

  return unit as MeasurementUnitRecord
}

export const retrieveProductMeasurement = async (
  scope: MedusaContainer,
  productId: string
) => {
  const [measurement] = await getMeasurementUnitService(
    scope
  ).listProductMeasurements(
    {
      product_id: productId,
    },
    {
      relations: ["measurementUnit"],
      take: 1,
    }
  )

  return (measurement as ProductMeasurementRecord | undefined) ?? null
}

export const retrieveProductOrThrow = async (
  scope: MedusaContainer,
  productId: string
) => {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product",
    fields: ["id"],
    filters: {
      id: productId,
    },
  })

  if (!data[0]) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product with id "${productId}" was not found`
    )
  }

  return data[0]
}

export const toMeasurementUnitDetailResponse = async (
  scope: MedusaContainer,
  unit: MeasurementUnitRecord
) => {
  const counts = await getMeasurementUnitActiveProductCounts(scope, [unit.id])

  return toMeasurementUnitResponse(unit, counts.get(unit.id) ?? 0)
}

export const toProductMeasurementDetailResponse = (
  measurement: ProductMeasurementRecord | null
) => ({
  measurement: measurement ? toProductMeasurementResponse(measurement) : null,
})

import type { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  ProductStatus,
} from "@medusajs/framework/utils"
import { MEASUREMENT_UNIT_MODULE } from "../modules/measurement-unit"
import type MeasurementUnitModuleService from "../modules/measurement-unit/service"

export type MeasurementUnitRecord = {
  code: string
  created_at?: Date | string
  deleted_at?: Date | string | null
  description?: null | string
  id: string
  name: string
  symbol: string
  updated_at?: Date | string
}

export type ProductMeasurementRecord = {
  created_at?: Date | string
  deleted_at?: Date | string | null
  id: string
  measurementUnit?: MeasurementUnitRecord
  measurement_unit_id?: string
  product_id: string
  product_unit_quantity: number | string
  updated_at?: Date | string
}

export type MeasurementUnitResponse = {
  active_product_count?: number
  code: string
  created_at?: Date | string
  deleted_at?: Date | string | null
  description?: null | string
  id: string
  name: string
  symbol: string
  updated_at?: Date | string
}

export type ProductMeasurementResponse = {
  created_at?: Date | string
  id: string
  product_id: string
  product_unit_quantity: number
  unit: MeasurementUnitResponse
  updated_at?: Date | string
}

type ProductLike = {
  id?: unknown
  measurement?: ProductMeasurementResponse | null
  variants?: Array<{
    calculated_price?: Record<string, unknown> | null
  }>
}

type MeasurementUnitService = MeasurementUnitModuleService & {
  createMeasurementUnits: (
    data: Partial<MeasurementUnitRecord> | Partial<MeasurementUnitRecord>[]
  ) => Promise<MeasurementUnitRecord[]>
  createProductMeasurements: (
    data:
      | Partial<ProductMeasurementRecord>
      | Partial<ProductMeasurementRecord>[]
  ) => Promise<ProductMeasurementRecord[] | ProductMeasurementRecord>
  deleteMeasurementUnits: (ids: string[]) => Promise<void>
  listAndCountMeasurementUnits: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<[MeasurementUnitRecord[], number]>
  listMeasurementUnits: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<MeasurementUnitRecord[]>
  listProductMeasurements: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<ProductMeasurementRecord[]>
  restoreMeasurementUnits: (ids: string[]) => Promise<void>
  restoreProductMeasurements: (ids: string[]) => Promise<void>
  retrieveMeasurementUnit: (
    id: string,
    config?: Record<string, unknown>
  ) => Promise<MeasurementUnitRecord>
  softDeleteMeasurementUnits: (ids: string[]) => Promise<void>
  softDeleteProductMeasurements: (ids: string[]) => Promise<void>
  updateMeasurementUnits: (
    data:
      | (Partial<MeasurementUnitRecord> & { id: string })
      | Array<Partial<MeasurementUnitRecord> & { id: string }>
  ) => Promise<MeasurementUnitRecord[] | MeasurementUnitRecord>
  updateProductMeasurements: (
    data:
      | (Partial<ProductMeasurementRecord> & { id: string })
      | Array<Partial<ProductMeasurementRecord> & { id: string }>
  ) => Promise<ProductMeasurementRecord[] | ProductMeasurementRecord>
}

const PRICE_AMOUNT_FIELDS = [
  "calculated_amount",
  "calculated_amount_with_tax",
  "calculated_amount_without_tax",
  "original_amount",
  "original_amount_with_tax",
  "original_amount_without_tax",
]

export const getMeasurementUnitService = (scope: MedusaContainer) =>
  scope.resolve<MeasurementUnitService>(MEASUREMENT_UNIT_MODULE)

export const toNumber = (value: number | string | unknown) => {
  if (typeof value === "number") {
    return value
  }

  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : Number.NaN
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "value" in value &&
    (typeof value.value === "string" || typeof value.value === "number")
  ) {
    return Number(value.value)
  }

  return Number.NaN
}

export const toMeasurementUnitResponse = (
  unit: MeasurementUnitRecord,
  activeProductCount?: number
): MeasurementUnitResponse => ({
  active_product_count: activeProductCount,
  code: unit.code,
  created_at: unit.created_at,
  deleted_at: unit.deleted_at ?? null,
  description: unit.description ?? null,
  id: unit.id,
  name: unit.name,
  symbol: unit.symbol,
  updated_at: unit.updated_at,
})

export const toProductMeasurementResponse = (
  measurement: ProductMeasurementRecord
): ProductMeasurementResponse | null => {
  if (!measurement.measurementUnit) {
    return null
  }

  const quantity = toNumber(measurement.product_unit_quantity)

  if (!Number.isFinite(quantity) || quantity <= 0) {
    return null
  }

  return {
    created_at: measurement.created_at,
    id: measurement.id,
    product_id: measurement.product_id,
    product_unit_quantity: quantity,
    unit: toMeasurementUnitResponse(measurement.measurementUnit),
    updated_at: measurement.updated_at,
  }
}

export const listProductMeasurementsByProductIds = async (
  scope: MedusaContainer,
  productIds: string[]
) => {
  const ids = [...new Set(productIds)].filter(Boolean)

  if (!ids.length) {
    return []
  }

  return (await getMeasurementUnitService(scope).listProductMeasurements(
    {
      product_id: { $in: ids },
    },
    {
      relations: ["measurementUnit"],
    }
  )) as ProductMeasurementRecord[]
}

export const getMeasurementUnitActiveProductCounts = async (
  scope: MedusaContainer,
  unitIds: string[]
) => {
  const ids = [...new Set(unitIds)].filter(Boolean)

  if (!ids.length) {
    return new Map<string, number>()
  }

  const measurements = (await getMeasurementUnitService(
    scope
  ).listProductMeasurements({
    measurement_unit_id: { $in: ids },
  })) as ProductMeasurementRecord[]
  const productIds = [
    ...new Set(measurements.map((measurement) => measurement.product_id)),
  ]

  if (!productIds.length) {
    return new Map<string, number>()
  }

  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id"],
    filters: {
      id: { $in: productIds },
      status: ProductStatus.PUBLISHED,
    },
  })
  const activeProductIds = new Set(
    (products as Array<{ id?: string }>).flatMap((product) =>
      product.id ? [product.id] : []
    )
  )
  const counts = new Map<string, Set<string>>()

  for (const measurement of measurements) {
    if (!activeProductIds.has(measurement.product_id)) {
      continue
    }

    const unitId = measurement.measurement_unit_id

    if (!unitId) {
      continue
    }

    const productIdsForUnit = counts.get(unitId) ?? new Set<string>()
    productIdsForUnit.add(measurement.product_id)
    counts.set(unitId, productIdsForUnit)
  }

  return new Map(
    [...counts.entries()].map(([unitId, productIdSet]) => [
      unitId,
      productIdSet.size,
    ])
  )
}

const addPricePerUnit = (
  calculatedPrice: Record<string, unknown>,
  measurement: ProductMeasurementResponse
) => {
  const quantity = measurement.product_unit_quantity

  if (!(Number.isFinite(quantity) && quantity > 0)) {
    return
  }

  const amounts: Record<string, number> = {}

  for (const field of PRICE_AMOUNT_FIELDS) {
    const value = calculatedPrice[field]
    const amount = toNumber(value)

    if (Number.isFinite(amount)) {
      amounts[field] = amount / quantity
    }
  }

  if (!Object.keys(amounts).length) {
    return
  }

  calculatedPrice.price_per_unit = {
    ...amounts,
    currency_code:
      typeof calculatedPrice.currency_code === "string"
        ? calculatedPrice.currency_code
        : null,
    product_unit_quantity: quantity,
    unit_code: measurement.unit.code,
    unit_id: measurement.unit.id,
    unit_name: measurement.unit.name,
    unit_symbol: measurement.unit.symbol,
  }
}

export const decorateProductsWithMeasurements = async (
  scope: MedusaContainer,
  products: ProductLike[]
) => {
  const productIds = products.flatMap((product) =>
    typeof product.id === "string" ? [product.id] : []
  )
  const measurements = await listProductMeasurementsByProductIds(
    scope,
    productIds
  )
  const measurementByProductId = new Map(
    measurements.flatMap((measurement) => {
      const response = toProductMeasurementResponse(measurement)
      return response ? [[measurement.product_id, response] as const] : []
    })
  )

  for (const product of products) {
    if (typeof product.id !== "string") {
      continue
    }

    const measurement = measurementByProductId.get(product.id) ?? null
    product.measurement = measurement

    if (!measurement) {
      continue
    }

    for (const variant of product.variants ?? []) {
      if (variant.calculated_price) {
        addPricePerUnit(variant.calculated_price, measurement)
      }
    }
  }

  return products
}

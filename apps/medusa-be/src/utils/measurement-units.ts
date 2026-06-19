import type { MedusaContainer } from "@medusajs/framework/types"
import { MEASUREMENT_UNIT_MODULE } from "../modules/measurement-unit"
import type MeasurementUnitModuleService from "../modules/measurement-unit/service"

export type MeasurementUnitRecord = {
  base_quantity: number | string
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
  measurement_unit?: MeasurementUnitRecord
  measurement_unit_id?: string
  product_id: string
  updated_at?: Date | string
  variant_measurements?: ProductVariantMeasurementRecord[]
}

export type ProductVariantMeasurementRecord = {
  created_at?: Date | string
  deleted_at?: Date | string | null
  id: string
  product_measurement_id?: string
  product_measurement?: ProductMeasurementRecord
  product_unit_quantity: number | string
  product_variant_id: string
  updated_at?: Date | string
}

export type MeasurementUnitResponse = {
  active_product_count?: number
  base_quantity: number
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
  unit: MeasurementUnitResponse
  updated_at?: Date | string
  variant_measurements: ProductVariantMeasurementResponse[]
}

export type ProductVariantMeasurementResponse = {
  created_at?: Date | string
  id: string
  product_unit_quantity: number
  product_variant_id: string
  updated_at?: Date | string
}

type ProductLike = {
  id?: unknown
  measurement?: ProductMeasurementResponse | null
  variants?: Array<{
    calculated_price?: Record<string, unknown> | null
    id?: unknown
    measurement?: ProductVariantMeasurementResponse | null
  }>
}

export type MeasurementDecorationOptions = {
  includePricePerUnit: boolean
  includeProductMeasurement: boolean
  includeVariantMeasurement: boolean
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
  createProductVariantMeasurements: (
    data:
      | Partial<ProductVariantMeasurementRecord>
      | Partial<ProductVariantMeasurementRecord>[]
  ) => Promise<
    ProductVariantMeasurementRecord[] | ProductVariantMeasurementRecord
  >
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
  listProductVariantMeasurements: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<ProductVariantMeasurementRecord[]>
  restoreMeasurementUnits: (ids: string[]) => Promise<void>
  restoreProductMeasurements: (ids: string[]) => Promise<void>
  restoreProductVariantMeasurements: (ids: string[]) => Promise<void>
  retrieveMeasurementUnit: (
    id: string,
    config?: Record<string, unknown>
  ) => Promise<MeasurementUnitRecord>
  softDeleteMeasurementUnits: (ids: string[]) => Promise<void>
  softDeleteProductMeasurements: (ids: string[]) => Promise<void>
  softDeleteProductVariantMeasurements: (ids: string[]) => Promise<void>
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
  updateProductVariantMeasurements: (
    data:
      | (Partial<ProductVariantMeasurementRecord> & { id: string })
      | Array<Partial<ProductVariantMeasurementRecord> & { id: string }>
  ) => Promise<
    ProductVariantMeasurementRecord[] | ProductVariantMeasurementRecord
  >
}

const PRICE_AMOUNT_FIELDS = [
  "calculated_amount",
  "calculated_amount_with_tax",
  "calculated_amount_without_tax",
  "original_amount",
  "original_amount_with_tax",
  "original_amount_without_tax",
]

const PRODUCT_MEASUREMENT_FIELDS = ["measurement"]
const VARIANT_MEASUREMENT_FIELDS = ["variants.measurement"]
const PRICE_PER_UNIT_FIELDS = ["variants.calculated_price.price_per_unit"]
const PRICE_PER_UNIT_QUERY_FIELDS = [
  "variants.id",
  "variants.calculated_price.calculated_amount",
  "variants.calculated_price.original_amount",
  "variants.calculated_price.currency_code",
  "variants.calculated_price.is_calculated_price_tax_inclusive",
  "variants.calculated_price.is_original_price_tax_inclusive",
]
const LEADING_PLUS_PATTERN = /^\+/

const normalizeRequestedField = (field: string) =>
  field.trim().replace(LEADING_PLUS_PATTERN, "")

const hasRequestedField = (fields: string[], targets: string[]) =>
  fields.some((field) => {
    const normalizedField = normalizeRequestedField(field)

    return targets.some(
      (target) =>
        normalizedField === target || normalizedField.startsWith(`${target}.`)
    )
  })

export const getMeasurementDecorationOptions = (
  fields: string[] = []
): MeasurementDecorationOptions => ({
  includePricePerUnit: hasRequestedField(fields, PRICE_PER_UNIT_FIELDS),
  includeProductMeasurement: hasRequestedField(
    fields,
    PRODUCT_MEASUREMENT_FIELDS
  ),
  includeVariantMeasurement: hasRequestedField(
    fields,
    VARIANT_MEASUREMENT_FIELDS
  ),
})

export const getMeasurementDecorationQueryFields = (
  fields: string[],
  options: MeasurementDecorationOptions
) => {
  const decorationFields = [
    ...PRODUCT_MEASUREMENT_FIELDS,
    ...VARIANT_MEASUREMENT_FIELDS,
    ...PRICE_PER_UNIT_FIELDS,
  ]
  const queryFields = fields.filter(
    (field) => !hasRequestedField([field], decorationFields)
  )

  if (options.includeVariantMeasurement) {
    queryFields.push("variants.id")
  }

  if (options.includePricePerUnit) {
    queryFields.push(...PRICE_PER_UNIT_QUERY_FIELDS)
  }

  return Array.from(new Set(queryFields))
}

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
): MeasurementUnitResponse => {
  const baseQuantity = toNumber(unit.base_quantity)

  return {
    active_product_count: activeProductCount,
    base_quantity:
      Number.isFinite(baseQuantity) && baseQuantity > 0 ? baseQuantity : 1,
    code: unit.code,
    created_at: unit.created_at,
    deleted_at: unit.deleted_at ?? null,
    description: unit.description ?? null,
    id: unit.id,
    name: unit.name,
    symbol: unit.symbol,
    updated_at: unit.updated_at,
  }
}

export const toProductVariantMeasurementResponse = (
  measurement: ProductVariantMeasurementRecord
): ProductVariantMeasurementResponse | null => {
  if (measurement.deleted_at) {
    return null
  }

  const quantity = toNumber(measurement.product_unit_quantity)

  if (!Number.isFinite(quantity) || quantity <= 0) {
    return null
  }

  return {
    created_at: measurement.created_at,
    id: measurement.id,
    product_unit_quantity: quantity,
    product_variant_id: measurement.product_variant_id,
    updated_at: measurement.updated_at,
  }
}

export const toProductMeasurementResponse = (
  measurement: ProductMeasurementRecord
): ProductMeasurementResponse | null => {
  if (!measurement.measurement_unit) {
    return null
  }

  const variantMeasurements = (measurement.variant_measurements ?? []).flatMap(
    (variantMeasurement) => {
      const response = toProductVariantMeasurementResponse(variantMeasurement)
      return response ? [response] : []
    }
  )

  return {
    created_at: measurement.created_at,
    id: measurement.id,
    product_id: measurement.product_id,
    unit: toMeasurementUnitResponse(measurement.measurement_unit),
    updated_at: measurement.updated_at,
    variant_measurements: variantMeasurements,
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
      relations: ["measurement_unit", "variant_measurements"],
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
  const counts = new Map<string, Set<string>>()

  for (const measurement of measurements) {
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
  measurement: ProductMeasurementResponse,
  variantMeasurement: ProductVariantMeasurementResponse
) => {
  const quantity = variantMeasurement.product_unit_quantity
  const baseQuantity = measurement.unit.base_quantity

  if (
    !(
      Number.isFinite(quantity) &&
      quantity > 0 &&
      Number.isFinite(baseQuantity) &&
      baseQuantity > 0
    )
  ) {
    return
  }

  const amounts: Record<string, number> = {}

  for (const field of PRICE_AMOUNT_FIELDS) {
    const value = calculatedPrice[field]
    const amount = toNumber(value)

    if (Number.isFinite(amount)) {
      amounts[field] = (amount * baseQuantity) / quantity
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
    unit_base_quantity: baseQuantity,
    unit_code: measurement.unit.code,
    unit_id: measurement.unit.id,
    unit_name: measurement.unit.name,
    unit_symbol: measurement.unit.symbol,
  }
}

const decorateVariantWithMeasurement = (
  variant: NonNullable<ProductLike["variants"]>[number],
  measurement: ProductMeasurementResponse,
  variantMeasurement: ProductVariantMeasurementResponse | undefined,
  options: MeasurementDecorationOptions
) => {
  if (options.includeVariantMeasurement) {
    variant.measurement = variantMeasurement ?? null
  }

  if (
    options.includePricePerUnit &&
    variant.calculated_price &&
    variantMeasurement
  ) {
    addPricePerUnit(variant.calculated_price, measurement, variantMeasurement)
  }
}

const decorateProductVariantsWithMeasurement = (
  product: ProductLike,
  measurement: ProductMeasurementResponse | null,
  options: MeasurementDecorationOptions
) => {
  if (!measurement) {
    if (options.includeVariantMeasurement) {
      for (const variant of product.variants ?? []) {
        variant.measurement = null
      }
    }
    return
  }

  const variantMeasurementByVariantId = new Map(
    measurement.variant_measurements.map((variantMeasurement) => [
      variantMeasurement.product_variant_id,
      variantMeasurement,
    ])
  )

  for (const variant of product.variants ?? []) {
    const variantMeasurement =
      typeof variant.id === "string"
        ? variantMeasurementByVariantId.get(variant.id)
        : undefined

    decorateVariantWithMeasurement(
      variant,
      measurement,
      variantMeasurement,
      options
    )
  }
}

export const decorateProductsWithMeasurements = async (
  scope: MedusaContainer,
  products: ProductLike[],
  options: MeasurementDecorationOptions
) => {
  if (
    !(
      options.includePricePerUnit ||
      options.includeProductMeasurement ||
      options.includeVariantMeasurement
    )
  ) {
    return products
  }

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

    if (options.includeProductMeasurement) {
      product.measurement = measurement
    }

    decorateProductVariantsWithMeasurement(product, measurement, options)
  }

  return products
}

import type {
  HttpTypes,
  InferEntityType,
  MedusaContainer,
} from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import { isRecord } from "@techsio/std/object"

import { MEASUREMENT_UNIT_MODULE } from "../modules/measurement-unit"
import type MeasurementUnit from "../modules/measurement-unit/models/measurement-unit"
import type ProductMeasurement from "../modules/measurement-unit/models/product-measurement"
import type ProductVariantMeasurement from "../modules/measurement-unit/models/product-variant-measurement"
import type MeasurementUnitModuleService from "../modules/measurement-unit/service"

export type MeasurementUnitRecord = InferEntityType<typeof MeasurementUnit>
export type ProductMeasurementRecord = InferEntityType<
  typeof ProductMeasurement
>
export type ProductVariantMeasurementRecord = InferEntityType<
  typeof ProductVariantMeasurement
>

type MeasurementTimestamp = Date | string

export interface MeasurementUnitResponse {
  active_product_count?: number | undefined
  base_quantity: number
  code: string
  created_at?: MeasurementTimestamp | undefined
  deleted_at?: MeasurementTimestamp | null | undefined
  description?: null | string | undefined
  id: string
  name: string
  symbol: string
  updated_at?: Date | string | undefined
}

export interface ProductMeasurementResponse {
  created_at?: Date | string
  id: string
  product_id: string
  unit: MeasurementUnitResponse
  updated_at?: Date | string
  variant_measurements: ProductVariantMeasurementResponse[]
}

export interface ProductVariantMeasurementResponse {
  created_at?: Date | string
  id: string
  product_unit_quantity: number
  product_variant_id: string
  updated_at?: Date | string
}

type CalculatedPriceLike = NonNullable<
  HttpTypes.StoreProductVariant["calculated_price"]
> & {
  price_per_unit?: Record<string, unknown>
}

interface ProductLike {
  id?: unknown
  measurement?: ProductMeasurementResponse | null
  variants?:
    | {
        calculated_price?: CalculatedPriceLike | null
        id?: unknown
        measurement?: ProductVariantMeasurementResponse | null
      }[]
    | null
}

export interface MeasurementDecorationOptions {
  includePricePerUnit: boolean
  includeProductMeasurement: boolean
  includeVariantMeasurement: boolean
}

const PRICE_AMOUNT_FIELDS = [
  "calculated_amount",
  "calculated_amount_with_tax",
  "calculated_amount_without_tax",
  "original_amount",
  "original_amount_with_tax",
  "original_amount_without_tax",
] as const

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
const LEADING_PLUS_PATTERN = /^\+/u
const PRODUCT_MEASUREMENT_QUERY_CHUNK_SIZE = 500

const normalizeRequestedField = (field: string) =>
  field.trim().replace(LEADING_PLUS_PATTERN, "")

const hasRequestedField = (fields: string[], targets: string[]) =>
  fields.some((field) => {
    const normalizedField = normalizeRequestedField(field)

    return targets.some(
      (target) =>
        normalizedField === target || normalizedField.startsWith(`${target}.`),
    )
  })

export const getMeasurementDecorationOptions = (
  fields: string[] = [],
): MeasurementDecorationOptions => ({
  includePricePerUnit: hasRequestedField(fields, PRICE_PER_UNIT_FIELDS),
  includeProductMeasurement: hasRequestedField(
    fields,
    PRODUCT_MEASUREMENT_FIELDS,
  ),
  includeVariantMeasurement: hasRequestedField(
    fields,
    VARIANT_MEASUREMENT_FIELDS,
  ),
})

export const getMeasurementDecorationQueryFields = (
  fields: string[],
  options: MeasurementDecorationOptions,
) => {
  const decorationFields = [
    ...PRODUCT_MEASUREMENT_FIELDS,
    ...VARIANT_MEASUREMENT_FIELDS,
    ...PRICE_PER_UNIT_FIELDS,
  ]
  const queryFields = fields.filter(
    (field) => !hasRequestedField([field], decorationFields),
  )

  if (options.includeVariantMeasurement) {
    queryFields.push("variants.id")
  }

  if (options.includePricePerUnit) {
    queryFields.push(...PRICE_PER_UNIT_QUERY_FIELDS)
  }

  return [...new Set(queryFields)]
}

export const getMeasurementUnitService = (scope: MedusaContainer) =>
  scope.resolve<MeasurementUnitModuleService>(MEASUREMENT_UNIT_MODULE)

export const toNumber = (value: unknown) => {
  if (typeof value === "number") {
    return value
  }

  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : Number.NaN
  }

  if (isRecord(value)) {
    const nestedValue = value["value"]
    if (typeof nestedValue === "string" || typeof nestedValue === "number") {
      return Number(nestedValue)
    }
  }

  return Number.NaN
}

export const toMeasurementUnitResponse = (
  unit: MeasurementUnitRecord,
  activeProductCount?: number,
): MeasurementUnitResponse => {
  const baseQuantity = toNumber(unit.base_quantity)

  if (!(Number.isFinite(baseQuantity) && baseQuantity > 0)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Measurement unit "${unit.id}" has an invalid base quantity.`,
    )
  }

  return {
    active_product_count: activeProductCount,
    base_quantity: baseQuantity,
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
  measurement: ProductVariantMeasurementRecord,
): ProductVariantMeasurementResponse | null => {
  if (measurement.deleted_at) {
    return null
  }

  const quantity = toNumber(measurement.product_unit_quantity)

  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Product variant measurement "${measurement.id}" has an invalid quantity.`,
    )
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
  measurement: ProductMeasurementRecord,
): ProductMeasurementResponse | null => {
  if (
    measurement.measurement_unit === null ||
    measurement.measurement_unit === undefined
  ) {
    return null
  }

  const variantMeasurements = (measurement.variant_measurements ?? []).flatMap(
    (variantMeasurement) => {
      const response = toProductVariantMeasurementResponse(variantMeasurement)
      return response === null ? [] : [response]
    },
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

const listProductMeasurementChunk = async (
  service: MeasurementUnitModuleService,
  ids: string[],
  startIndex: number,
): Promise<ProductMeasurementRecord[]> => {
  if (startIndex >= ids.length) {
    return []
  }

  const chunk = ids.slice(
    startIndex,
    startIndex + PRODUCT_MEASUREMENT_QUERY_CHUNK_SIZE,
  )
  const chunkMeasurements = await service.listProductMeasurements(
    { product_id: { $in: chunk } },
    {
      relations: ["measurement_unit", "variant_measurements"],
      take: chunk.length,
    },
  )
  const completedChunk = {
    measurements: chunkMeasurements,
    nextIndex: startIndex + PRODUCT_MEASUREMENT_QUERY_CHUNK_SIZE,
  }
  const remainingMeasurements = await listProductMeasurementChunk(
    service,
    ids,
    completedChunk.nextIndex,
  )

  return [...completedChunk.measurements, ...remainingMeasurements]
}

export const listProductMeasurementsByProductIds = async (
  scope: MedusaContainer,
  productIds: string[],
) => {
  const ids = [...new Set(productIds)].filter((id) => id.length > 0)

  if (ids.length === 0) {
    return []
  }

  return await listProductMeasurementChunk(
    getMeasurementUnitService(scope),
    ids,
    0,
  )
}

export const getMeasurementUnitActiveProductCounts = async (
  scope: MedusaContainer,
  unitIds: string[],
) => {
  const ids = [...new Set(unitIds)].filter(Boolean)

  if (!ids.length) {
    return new Map<string, number>()
  }

  const counts =
    await getMeasurementUnitService(scope).getActiveProductCounts(ids)

  return new Map(
    counts.map((row) => [row.measurement_unit_id, Number(row.count)]),
  )
}

const addPricePerUnit = (
  calculatedPrice: CalculatedPriceLike,
  measurement: ProductMeasurementResponse,
  variantMeasurement: ProductVariantMeasurementResponse,
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
  options: MeasurementDecorationOptions,
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
  options: MeasurementDecorationOptions,
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
    ]),
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
      options,
    )
  }
}

export const decorateProductsWithMeasurements = async (
  scope: MedusaContainer,
  products: ProductLike[],
  options: MeasurementDecorationOptions,
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
    typeof product.id === "string" ? [product.id] : [],
  )
  const measurements = await listProductMeasurementsByProductIds(
    scope,
    productIds,
  )
  const measurementByProductId = new Map(
    measurements.flatMap((measurement) => {
      const response = toProductMeasurementResponse(measurement)
      return response ? [[measurement.product_id, response] as const] : []
    }),
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

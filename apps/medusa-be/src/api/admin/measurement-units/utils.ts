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
  type ProductVariantMeasurementRecord,
  toMeasurementUnitResponse,
  toProductMeasurementResponse,
  toProductVariantMeasurementResponse,
} from "../../../utils/measurement-units"

type RetrieveMeasurementUnitOptions = {
  withDeleted?: boolean
}

type MeasurementUnitProductListStatus = "active" | "all" | "deleted"

export type ProductMeasurementVariantResponse = {
  id: string
  sku?: null | string
  title?: null | string
}

export type MeasurementUnitAssignedProductResponse = {
  deleted_at?: Date | string | null
  handle?: null | string
  id: string
  product_id: string
  status?: null | string
  title?: null | string
  updated_at?: Date | string
}

const LIKE_WILDCARD_REGEX = /[\\%_]/g
const LEADING_DASH_REGEX = /^-/

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
      deleted_at: null,
      product_id: productId,
    },
    {
      relations: ["measurement_unit", "variant_measurements"],
      take: 1,
      withDeleted: true,
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

export const retrieveProductVariants = async (
  scope: MedusaContainer,
  productId: string
): Promise<ProductMeasurementVariantResponse[]> => {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product_variant",
    fields: ["id", "sku", "title"],
    filters: {
      product_id: productId,
    },
  })

  return (data as ProductMeasurementVariantResponse[]).map((variant) => ({
    id: variant.id,
    sku: variant.sku ?? null,
    title: variant.title ?? null,
  }))
}

export const retrieveProductVariantOrThrow = async (
  scope: MedusaContainer,
  productId: string,
  productVariantId: string
) => {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product_variant",
    fields: ["id", "product_id"],
    filters: {
      id: productVariantId,
    },
  })
  const variant = data[0] as
    | { id?: string; product_id?: null | string }
    | undefined

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

export const toMeasurementUnitDetailResponse = async (
  scope: MedusaContainer,
  unit: MeasurementUnitRecord
) => {
  const counts = await getMeasurementUnitActiveProductCounts(scope, [unit.id])

  return toMeasurementUnitResponse(unit, counts.get(unit.id) ?? 0)
}

const getAssignedProductOrderValue = (
  product: MeasurementUnitAssignedProductResponse,
  orderBy: string
) => {
  switch (orderBy.replace(LEADING_DASH_REGEX, "")) {
    case "handle":
      return product.handle ?? ""
    case "status":
      return product.status ?? ""
    case "updated_at":
      return String(product.updated_at ?? "")
    default:
      return product.title ?? ""
  }
}

export const listMeasurementUnitAssignedProducts = async ({
  limit,
  offset,
  orderBy = "title",
  q,
  scope,
  status,
  unitId,
}: {
  limit: number
  offset: number
  orderBy?: string
  q?: string
  scope: MedusaContainer
  status: MeasurementUnitProductListStatus
  unitId: string
}) => {
  const filters: Record<string, unknown> = {
    measurement_unit_id: unitId,
  }

  if (status === "deleted") {
    filters.deleted_at = { $ne: null }
  }

  const measurements = (await getMeasurementUnitService(
    scope
  ).listProductMeasurements(filters, {
    withDeleted: status !== "active",
  })) as ProductMeasurementRecord[]
  const productIds = uniqueIds(
    measurements.map((measurement) => measurement.product_id)
  )

  if (!productIds.length) {
    return {
      count: 0,
      products: [] as MeasurementUnitAssignedProductResponse[],
    }
  }

  const escapedQuery = q ? escapeLikePattern(q) : undefined
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product",
    fields: ["id", "title", "handle", "status", "updated_at", "deleted_at"],
    filters: {
      id: { $in: productIds },
      ...(escapedQuery
        ? {
            $or: [
              { title: { $ilike: `%${escapedQuery}%` } },
              { handle: { $ilike: `%${escapedQuery}%` } },
            ],
          }
        : {}),
    },
    withDeleted: true,
  })
  const productById = new Map(
    (data as MeasurementUnitAssignedProductResponse[]).map((product) => [
      product.id,
      product,
    ])
  )
  const products = measurements.flatMap((measurement) => {
    const product = productById.get(measurement.product_id)

    if (!product) {
      return []
    }

    return [
      {
        ...product,
        deleted_at: measurement.deleted_at ?? null,
        product_id: measurement.product_id,
      },
    ]
  })
  const direction = orderBy.startsWith("-") ? -1 : 1
  const sortedProducts = products.sort(
    (left, right) =>
      String(getAssignedProductOrderValue(left, orderBy)).localeCompare(
        String(getAssignedProductOrderValue(right, orderBy))
      ) * direction
  )

  return {
    count: sortedProducts.length,
    products: sortedProducts.slice(offset, offset + limit),
  }
}

export const toProductMeasurementDetailResponse = ({
  measurement,
  variants,
}: {
  measurement: ProductMeasurementRecord | null
  variants: ProductMeasurementVariantResponse[]
}) => ({
  measurement: measurement ? toProductMeasurementResponse(measurement) : null,
  variants,
})

export const toProductVariantMeasurementDetailResponse = ({
  measurement,
  productVariantId,
}: {
  measurement: ProductMeasurementRecord | null
  productVariantId: string
}) => {
  const variantMeasurement = measurement?.variant_measurements?.find(
    (current) => current.product_variant_id === productVariantId
  ) as ProductVariantMeasurementRecord | undefined

  return {
    measurement: measurement ? toProductMeasurementResponse(measurement) : null,
    variant_measurement: variantMeasurement
      ? toProductVariantMeasurementResponse(variantMeasurement)
      : null,
  }
}

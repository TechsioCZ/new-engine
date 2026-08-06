import type {
  IProductModuleService,
  MedusaContainer,
  Query,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"

import {
  getMeasurementUnitActiveProductCounts,
  getMeasurementUnitService,
  toMeasurementUnitResponse,
  toProductMeasurementResponse,
  toProductVariantMeasurementResponse,
} from "../../../utils/measurement-units"
import type {
  MeasurementUnitRecord,
  ProductMeasurementRecord,
} from "../../../utils/measurement-units"

interface RetrieveMeasurementUnitOptions {
  withDeleted?: boolean
}

type MeasurementUnitProductListStatus = "active" | "all" | "deleted"

export interface ProductMeasurementVariantResponse {
  id: string
  sku?: null | string
  title?: null | string
}

export interface MeasurementUnitAssignedProductResponse {
  deleted_at?: Date | string | null
  handle?: null | string
  id: string
  product_id: string
  status?: null | string
  title?: null | string
  updated_at?: Date | string
}

const ASSIGNED_PRODUCT_ORDER_FIELDS = new Set([
  "handle",
  "status",
  "title",
  "updated_at",
])
const LIKE_WILDCARD_REGEX = /[\\%_]/gu
const LEADING_DASH_REGEX = /^-/u
const ASSIGNMENT_QUERY_CHUNK_SIZE = 500
const MAX_ASSIGNMENT_QUERY_PAGES = 1000

export const escapeLikePattern = (value: string) =>
  value.replace(LIKE_WILDCARD_REGEX, (match) => `\\${match}`)

export const uniqueIds = (ids: string[]) => [...new Set(ids)]

export const retrieveMeasurementUnitOrThrow = async (
  scope: MedusaContainer,
  unitId: string,
  options: RetrieveMeasurementUnitOptions = {},
) => {
  const [unit] = await getMeasurementUnitService(scope).listMeasurementUnits(
    {
      id: unitId,
    },
    {
      take: 1,
      withDeleted: options.withDeleted ?? false,
    },
  )

  if (!unit) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Measurement unit with id "${unitId}" was not found`,
    )
  }

  return unit
}

export const retrieveProductMeasurement = async (
  scope: MedusaContainer,
  productId: string,
) => {
  const [measurement] = await getMeasurementUnitService(
    scope,
  ).listProductMeasurements(
    {
      deleted_at: null,
      product_id: productId,
    },
    {
      relations: ["measurement_unit", "variant_measurements"],
      take: 1,
      withDeleted: true,
    },
  )

  return measurement ?? null
}

export const retrieveProductOrThrow = async (
  scope: MedusaContainer,
  productId: string,
) => {
  const query = scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product",
    fields: ["id"],
    filters: {
      id: productId,
    },
  })

  const [product] = z.array(z.object({ id: z.string() })).parse(data)
  if (product === undefined) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product with id "${productId}" was not found`,
    )
  }

  return product
}

export const retrieveProductVariants = async (
  scope: MedusaContainer,
  productId: string,
): Promise<ProductMeasurementVariantResponse[]> => {
  const query = scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product_variant",
    fields: ["id", "sku", "title"],
    filters: {
      product_id: productId,
    },
  })

  return z
    .array(
      z.object({
        id: z.string(),
        sku: z.string().nullable().optional(),
        title: z.string().nullable().optional(),
      }),
    )
    .parse(data)
    .map((variant) => ({
      id: variant.id,
      sku: variant.sku ?? null,
      title: variant.title ?? null,
    }))
}

export const retrieveProductVariantOrThrow = async (
  scope: MedusaContainer,
  productId: string,
  productVariantId: string,
) => {
  const query = scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product_variant",
    fields: ["id", "product_id"],
    filters: {
      id: productVariantId,
    },
  })
  const [variant] = z
    .array(
      z.object({
        id: z.string(),
        product_id: z.string().nullable().optional(),
      }),
    )
    .parse(data)

  if (variant === undefined) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product variant with id "${productVariantId}" was not found`,
    )
  }

  if (variant.product_id !== productId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Product variant "${productVariantId}" does not belong to product "${productId}".`,
    )
  }

  return variant
}

export const toMeasurementUnitDetailResponse = async (
  scope: MedusaContainer,
  unit: MeasurementUnitRecord,
) => {
  const counts = await getMeasurementUnitActiveProductCounts(scope, [unit.id])

  return toMeasurementUnitResponse(unit, counts.get(unit.id) ?? 0)
}

const getAssignedProductOrder = (orderBy: string) => {
  const requestedField = orderBy.replace(LEADING_DASH_REGEX, "")
  const field = ASSIGNED_PRODUCT_ORDER_FIELDS.has(requestedField)
    ? requestedField
    : "title"
  const direction: "ASC" | "DESC" = orderBy.startsWith("-") ? "DESC" : "ASC"

  return {
    [field]: direction,
  }
}

const listMeasurementUnitAssignments = async ({
  scope,
  status,
  unitId,
}: {
  scope: MedusaContainer
  status: MeasurementUnitProductListStatus
  unitId: string
}) => {
  const filters: Record<string, unknown> = {
    measurement_unit_id: unitId,
  }

  if (status === "active") {
    filters["deleted_at"] = null
  } else if (status === "deleted") {
    filters["deleted_at"] = { $ne: null }
  }

  const service = getMeasurementUnitService(scope)
  const loadPage = async (
    skip: number,
    pageCount: number,
  ): Promise<ProductMeasurementRecord[]> => {
    if (pageCount >= MAX_ASSIGNMENT_QUERY_PAGES) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Measurement assignment query exceeded ${MAX_ASSIGNMENT_QUERY_PAGES} pages`,
      )
    }

    const chunk = await service.listProductMeasurements(filters, {
      order: { id: "ASC" },
      select: ["id", "product_id", "deleted_at", "updated_at"],
      skip,
      take: ASSIGNMENT_QUERY_CHUNK_SIZE,
      withDeleted: true,
    })
    if (chunk.length < ASSIGNMENT_QUERY_CHUNK_SIZE) {
      return chunk
    }

    return [
      ...chunk,
      ...(await loadPage(skip + ASSIGNMENT_QUERY_CHUNK_SIZE, pageCount + 1)),
    ]
  }

  return await loadPage(0, 0)
}

const isDeletedMeasurement = (
  measurement: ProductMeasurementRecord | undefined,
) =>
  measurement !== undefined &&
  measurement.deleted_at !== null &&
  measurement.deleted_at !== undefined

const shouldReplaceCanonicalAssignment = (
  existing: ProductMeasurementRecord | undefined,
  measurement: ProductMeasurementRecord,
) => {
  if (existing === undefined) {
    return true
  }

  const existingIsDeleted = isDeletedMeasurement(existing)
  const measurementIsDeleted = isDeletedMeasurement(measurement)
  if (existingIsDeleted !== measurementIsDeleted) {
    return existingIsDeleted
  }

  return (
    new Date(measurement.updated_at).getTime() >
    new Date(existing.updated_at).getTime()
  )
}

export const getCanonicalAssignmentByProductId = (
  measurements: ProductMeasurementRecord[],
) => {
  const byProductId = new Map<string, ProductMeasurementRecord>()

  for (const measurement of measurements) {
    const existing = byProductId.get(measurement.product_id)

    if (shouldReplaceCanonicalAssignment(existing, measurement)) {
      byProductId.set(measurement.product_id, measurement)
    }
  }

  return byProductId
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
  orderBy?: string | undefined
  q?: string | undefined
  scope: MedusaContainer
  status: MeasurementUnitProductListStatus
  unitId: string
}) => {
  const measurements = await listMeasurementUnitAssignments({
    scope,
    status,
    unitId,
  })
  const productIds = uniqueIds(
    measurements.map((measurement) => measurement.product_id),
  )

  if (!productIds.length) {
    return {
      count: 0,
      products: [] as MeasurementUnitAssignedProductResponse[],
    }
  }

  const escapedQuery =
    typeof q === "string" && q.length > 0 ? escapeLikePattern(q) : undefined
  const productService = scope.resolve<IProductModuleService>(Modules.PRODUCT)
  const [products, count] = await productService.listAndCountProducts(
    {
      id: { $in: productIds },
      ...(typeof escapedQuery === "string" && escapedQuery.length > 0
        ? {
            $or: [
              { title: { $ilike: `%${escapedQuery}%` } },
              { handle: { $ilike: `%${escapedQuery}%` } },
            ],
          }
        : {}),
    },
    {
      order: getAssignedProductOrder(orderBy),
      select: ["id", "title", "handle", "status", "updated_at"],
      skip: offset,
      take: limit,
      withDeleted: true,
    },
  )
  const measurementByProductId = getCanonicalAssignmentByProductId(measurements)
  const assignedProducts = products.flatMap((product) => {
    const measurement = measurementByProductId.get(product.id)

    if (!measurement) {
      return []
    }

    return [
      {
        deleted_at: measurement.deleted_at ?? null,
        handle: product.handle,
        id: product.id,
        product_id: measurement.product_id,
        status: product.status,
        title: product.title,
        updated_at: product.updated_at,
      },
    ]
  })

  return {
    count,
    products: assignedProducts,
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
    (current) => current.product_variant_id === productVariantId,
  )

  return {
    measurement: measurement ? toProductMeasurementResponse(measurement) : null,
    variant_measurement: variantMeasurement
      ? toProductVariantMeasurementResponse(variantMeasurement)
      : null,
  }
}

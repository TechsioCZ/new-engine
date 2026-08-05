import { sdk } from "./sdk"

export interface MeasurementUnit {
  active_product_count?: number
  base_quantity: number
  code: string
  created_at?: string
  deleted_at?: string | null
  description?: string | null
  id: string
  name: string
  symbol: string
  updated_at?: string
}

export interface MeasurementUnitInput {
  base_quantity: number
  code: string
  description?: string | null
  name: string
  symbol: string
}

export type MeasurementUnitStatus = "active" | "all" | "deleted"

export const isMeasurementUnitStatus = (
  value: string
): value is MeasurementUnitStatus =>
  value === "active" || value === "all" || value === "deleted"

export interface ProductMeasurement {
  created_at?: string
  id: string
  product_id: string
  unit: MeasurementUnit
  updated_at?: string
  variant_measurements: ProductVariantMeasurement[]
}

export interface MeasurementUnitAssignedProduct {
  deleted_at?: string | null
  handle?: null | string
  id: string
  product_id: string
  status?: null | string
  title?: null | string
  updated_at?: string
}

export interface ProductMeasurementVariant {
  id: string
  sku?: null | string
  title?: null | string
}

export interface ProductVariantMeasurement {
  created_at?: string
  id: string
  product_unit_quantity: number
  product_variant_id: string
  updated_at?: string
}

export interface MeasurementUnitsResponse {
  measurement_units: MeasurementUnit[]
  count: number
  limit: number
  offset: number
}

export interface MeasurementUnitResponse {
  measurement_unit: MeasurementUnit
}

export interface MeasurementUnitAssignedProductsResponse {
  products: MeasurementUnitAssignedProduct[]
  count: number
  limit: number
  offset: number
}

export interface ProductMeasurementResponse {
  measurement: ProductMeasurement | null
  variants: ProductMeasurementVariant[]
}

export interface ProductVariantMeasurementResponse {
  measurement: ProductMeasurement | null
  variant_measurement: ProductVariantMeasurement | null
}

const toSearch = (
  params: Record<string, boolean | number | string | undefined>
) => {
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value))
    }
  }

  return search.toString()
}

export const measurementUnitQueryKeys = {
  detail: (id: string | undefined) => ["measurement-unit", id] as const,
  details: () => ["measurement-unit"] as const,
  list: (params: Record<string, unknown>) =>
    ["measurement-units", params] as const,
  lists: () => ["measurement-units"] as const,
  productMeasurement: (productId: string | undefined) =>
    ["product-measurement", productId] as const,
  productVariantMeasurement: (
    productId: string | undefined,
    productVariantId: string | undefined
  ) => ["product-variant-measurement", productId, productVariantId] as const,
  productVariantMeasurements: (productId: string | undefined) =>
    ["product-variant-measurement", productId] as const,
  products: (id: string | undefined, params: Record<string, unknown>) =>
    ["measurement-unit-products", id, params] as const,
  productsPrefix: (id: string | undefined) =>
    ["measurement-unit-products", id] as const,
}

export const listMeasurementUnits = async (params: {
  code?: string
  include_deleted?: boolean
  limit: number
  offset: number
  order_by?: string
  q?: string
  status?: MeasurementUnitStatus
}) =>
  sdk.client.fetch<MeasurementUnitsResponse>(
    `/admin/measurement-units?${toSearch(params)}`
  )

export const retrieveMeasurementUnit = async (id: string) =>
  sdk.client.fetch<MeasurementUnitResponse>(`/admin/measurement-units/${id}`)

export const listMeasurementUnitAssignedProducts = async (
  id: string,
  params: {
    limit: number
    offset: number
    order_by?: string
    q?: string
    status?: MeasurementUnitStatus
  }
) =>
  sdk.client.fetch<MeasurementUnitAssignedProductsResponse>(
    `/admin/measurement-units/${id}/products?${toSearch(params)}`
  )

export const createMeasurementUnit = async (input: MeasurementUnitInput) =>
  sdk.client.fetch<MeasurementUnitResponse>("/admin/measurement-units", {
    body: input,
    method: "POST",
  })

export const updateMeasurementUnit = async (
  id: string,
  input: Partial<MeasurementUnitInput>
) =>
  sdk.client.fetch<MeasurementUnitResponse>(`/admin/measurement-units/${id}`, {
    body: input,
    method: "POST",
  })

export const deleteMeasurementUnit = async (id: string) =>
  sdk.client.fetch(`/admin/measurement-units/${id}`, {
    method: "DELETE",
  })

export const restoreMeasurementUnit = async (id: string) =>
  sdk.client.fetch<MeasurementUnitResponse>(
    `/admin/measurement-units/${id}/restore`,
    {
      method: "POST",
    }
  )

export const retrieveProductMeasurement = async (productId: string) =>
  sdk.client.fetch<ProductMeasurementResponse>(
    `/admin/products/${productId}/measurement`
  )

export const setProductMeasurement = async (
  productId: string,
  input: {
    measurement_unit_id: string
  }
) =>
  sdk.client.fetch<ProductMeasurementResponse>(
    `/admin/products/${productId}/measurement`,
    {
      body: input,
      method: "POST",
    }
  )

export const deleteProductMeasurement = async (productId: string) =>
  sdk.client.fetch(`/admin/products/${productId}/measurement`, {
    method: "DELETE",
  })

export const retrieveProductVariantMeasurement = async (
  productId: string,
  productVariantId: string
) =>
  sdk.client.fetch<ProductVariantMeasurementResponse>(
    `/admin/products/${productId}/variants/${productVariantId}/measurement`
  )

export const setProductVariantMeasurement = async (
  productId: string,
  productVariantId: string,
  input: {
    product_unit_quantity: number
  }
) =>
  sdk.client.fetch<ProductVariantMeasurementResponse>(
    `/admin/products/${productId}/variants/${productVariantId}/measurement`,
    {
      body: input,
      method: "POST",
    }
  )

export const deleteProductVariantMeasurement = async (
  productId: string,
  productVariantId: string
) =>
  sdk.client.fetch(
    `/admin/products/${productId}/variants/${productVariantId}/measurement`,
    {
      method: "DELETE",
    }
  )

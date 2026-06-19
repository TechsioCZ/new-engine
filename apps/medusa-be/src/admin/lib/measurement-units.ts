import { sdk } from "./sdk"

export type MeasurementUnit = {
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

export type MeasurementUnitInput = {
  base_quantity: number
  code: string
  description?: string | null
  name: string
  symbol: string
}

export type ProductMeasurement = {
  created_at?: string
  id: string
  product_id: string
  unit: MeasurementUnit
  updated_at?: string
  variant_measurements: ProductVariantMeasurement[]
}

export type MeasurementUnitAssignedProduct = {
  deleted_at?: string | null
  handle?: null | string
  id: string
  product_id: string
  status?: null | string
  title?: null | string
  updated_at?: string
}

export type ProductMeasurementVariant = {
  id: string
  sku?: null | string
  title?: null | string
}

export type ProductVariantMeasurement = {
  created_at?: string
  id: string
  product_unit_quantity: number
  product_variant_id: string
  updated_at?: string
}

export type MeasurementUnitsResponse = {
  measurement_units: MeasurementUnit[]
  count: number
  limit: number
  offset: number
}

export type MeasurementUnitResponse = {
  measurement_unit: MeasurementUnit
}

export type MeasurementUnitAssignedProductsResponse = {
  products: MeasurementUnitAssignedProduct[]
  count: number
  limit: number
  offset: number
}

export type ProductMeasurementResponse = {
  measurement: ProductMeasurement | null
  variants: ProductMeasurementVariant[]
}

export type ProductVariantMeasurementResponse = {
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
  products: (id: string | undefined, params: Record<string, unknown>) =>
    ["measurement-unit-products", id, params] as const,
  productsPrefix: (id: string | undefined) =>
    ["measurement-unit-products", id] as const,
  productMeasurement: (productId: string | undefined) =>
    ["product-measurement", productId] as const,
  productVariantMeasurements: (productId: string | undefined) =>
    ["product-variant-measurement", productId] as const,
  productVariantMeasurement: (
    productId: string | undefined,
    productVariantId: string | undefined
  ) => ["product-variant-measurement", productId, productVariantId] as const,
}

export const listMeasurementUnits = (params: {
  code?: string
  include_deleted?: boolean
  limit: number
  offset: number
  order_by?: string
  q?: string
  status?: "active" | "all" | "deleted"
}) =>
  sdk.client.fetch<MeasurementUnitsResponse>(
    `/admin/measurement-units?${toSearch(params)}`
  )

export const retrieveMeasurementUnit = (id: string) =>
  sdk.client.fetch<MeasurementUnitResponse>(`/admin/measurement-units/${id}`)

export const listMeasurementUnitAssignedProducts = (
  id: string,
  params: {
    limit: number
    offset: number
    order_by?: string
    q?: string
    status?: "active" | "all" | "deleted"
  }
) =>
  sdk.client.fetch<MeasurementUnitAssignedProductsResponse>(
    `/admin/measurement-units/${id}/products?${toSearch(params)}`
  )

export const createMeasurementUnit = (input: MeasurementUnitInput) =>
  sdk.client.fetch<MeasurementUnitResponse>("/admin/measurement-units", {
    body: input,
    method: "POST",
  })

export const updateMeasurementUnit = (
  id: string,
  input: Partial<MeasurementUnitInput>
) =>
  sdk.client.fetch<MeasurementUnitResponse>(`/admin/measurement-units/${id}`, {
    body: input,
    method: "POST",
  })

export const deleteMeasurementUnit = (id: string) =>
  sdk.client.fetch(`/admin/measurement-units/${id}`, {
    method: "DELETE",
  })

export const restoreMeasurementUnit = (id: string) =>
  sdk.client.fetch<MeasurementUnitResponse>(
    `/admin/measurement-units/${id}/restore`,
    {
      method: "POST",
    }
  )

export const retrieveProductMeasurement = (productId: string) =>
  sdk.client.fetch<ProductMeasurementResponse>(
    `/admin/products/${productId}/measurement`
  )

export const setProductMeasurement = (
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

export const deleteProductMeasurement = (productId: string) =>
  sdk.client.fetch(`/admin/products/${productId}/measurement`, {
    method: "DELETE",
  })

export const retrieveProductVariantMeasurement = (
  productId: string,
  productVariantId: string
) =>
  sdk.client.fetch<ProductVariantMeasurementResponse>(
    `/admin/products/${productId}/variants/${productVariantId}/measurement`
  )

export const setProductVariantMeasurement = (
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

export const deleteProductVariantMeasurement = (
  productId: string,
  productVariantId: string
) =>
  sdk.client.fetch(
    `/admin/products/${productId}/variants/${productVariantId}/measurement`,
    {
      method: "DELETE",
    }
  )

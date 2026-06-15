import { sdk } from "./sdk"

export type MeasurementUnit = {
  active_product_count?: number
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
  code: string
  description?: string | null
  name: string
  symbol: string
}

export type ProductMeasurement = {
  created_at?: string
  id: string
  product_id: string
  product_unit_quantity: number
  unit: MeasurementUnit
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

export type ProductMeasurementResponse = {
  measurement: ProductMeasurement | null
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
}

export const listMeasurementUnits = (params: {
  code?: string
  include_deleted?: boolean
  limit: number
  offset: number
  order_by?: string
  q?: string
}) =>
  sdk.client.fetch<MeasurementUnitsResponse>(
    `/admin/measurement-units?${toSearch(params)}`
  )

export const retrieveMeasurementUnit = (id: string) =>
  sdk.client.fetch<MeasurementUnitResponse>(`/admin/measurement-units/${id}`)

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
    product_unit_quantity: number
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

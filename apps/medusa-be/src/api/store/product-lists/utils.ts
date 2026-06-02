import { MedusaError } from "@medusajs/framework/utils"

export type ProductListRecord = {
  id: string
  title: string
  handle: string
  type: string
  description?: string | null
  metadata?: Record<string, unknown> | null
  items?: ProductListItemRecord[]
  created_at?: string | Date
  updated_at?: string | Date
}

export type ProductListItemRecord = {
  id: string
  quantity: number
  note?: string | null
  sort_order: number
  metadata?: Record<string, unknown> | null
  list_id: string
  created_at?: string | Date
  updated_at?: string | Date
}

export const getRouteParam = (
  params: Record<string, string | undefined>,
  key: string
) => {
  const value = params[key]

  if (!value) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Missing route parameter: ${key}`
    )
  }

  return value
}

export const toProductListResponse = (list: ProductListRecord) => ({
  created_at: list.created_at,
  description: list.description ?? null,
  handle: list.handle,
  id: list.id,
  items: list.items?.map(toProductListItemResponse) ?? [],
  metadata: list.metadata ?? null,
  title: list.title,
  type: list.type,
  updated_at: list.updated_at,
})

export const toProductListItemResponse = (item: ProductListItemRecord) => ({
  created_at: item.created_at,
  id: item.id,
  list_id: item.list_id,
  metadata: item.metadata ?? null,
  note: item.note ?? null,
  quantity: item.quantity,
  sort_order: item.sort_order,
  updated_at: item.updated_at,
})

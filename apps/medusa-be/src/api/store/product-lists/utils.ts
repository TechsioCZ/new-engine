import type { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { ProductListItemProductLink } from "../../../links/product-list-item-product"
import { ProductListItemVariantLink } from "../../../links/product-list-item-variant"
import { getProductListService } from "../../../workflows/product-list/steps/helpers"

export const INLINE_PRODUCT_LIST_ITEMS_LIMIT = 100

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
  product_id?: string | null
  variant_id?: string | null
  quantity: number
  note?: string | null
  sort_order: number
  metadata?: Record<string, unknown> | null
  list_id: string
  created_at?: string | Date
  updated_at?: string | Date
}

type ProductListItemProductLinkRecord = {
  product_id?: string
  product_list_item_id?: string
}

type ProductListItemVariantLinkRecord = {
  product_variant_id?: string
  product_list_item_id?: string
}

const hasRecordShape = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const isProductListItemProductLinkRecord = (
  value: unknown
): value is ProductListItemProductLinkRecord =>
  hasRecordShape(value) &&
  (value.product_id === undefined || typeof value.product_id === "string") &&
  (value.product_list_item_id === undefined ||
    typeof value.product_list_item_id === "string")

const isProductListItemVariantLinkRecord = (
  value: unknown
): value is ProductListItemVariantLinkRecord =>
  hasRecordShape(value) &&
  (value.product_variant_id === undefined ||
    typeof value.product_variant_id === "string") &&
  (value.product_list_item_id === undefined ||
    typeof value.product_list_item_id === "string")

const toProductListItemProductLinks = (value: unknown) =>
  Array.isArray(value) ? value.filter(isProductListItemProductLinkRecord) : []

const toProductListItemVariantLinks = (value: unknown) =>
  Array.isArray(value) ? value.filter(isProductListItemVariantLinkRecord) : []

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
  product_id: item.product_id ?? null,
  quantity: item.quantity,
  sort_order: item.sort_order,
  updated_at: item.updated_at,
  variant_id: item.variant_id ?? null,
})

export const withProductListItemSelections = async (
  container: MedusaContainer,
  items: ProductListItemRecord[]
) => {
  const itemIds = items.map((item) => item.id)

  if (!itemIds.length) {
    return items
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: productLinks } = await query.graph({
    entity: ProductListItemProductLink.entryPoint,
    fields: ["product_list_item_id", "product_id"],
    filters: {
      product_list_item_id: itemIds,
    },
    pagination: {
      take: itemIds.length,
    },
  })
  const { data: variantLinks } = await query.graph({
    entity: ProductListItemVariantLink.entryPoint,
    fields: ["product_list_item_id", "product_variant_id"],
    filters: {
      product_list_item_id: itemIds,
    },
    pagination: {
      take: itemIds.length,
    },
  })
  const productIdsByItemId = new Map(
    toProductListItemProductLinks(productLinks).flatMap((link) =>
      link.product_list_item_id && link.product_id
        ? [[link.product_list_item_id, link.product_id]]
        : []
    )
  )
  const variantIdsByItemId = new Map(
    toProductListItemVariantLinks(variantLinks).flatMap((link) =>
      link.product_list_item_id && link.product_variant_id
        ? [[link.product_list_item_id, link.product_variant_id]]
        : []
    )
  )

  return items.map((item) => ({
    ...item,
    product_id: productIdsByItemId.get(item.id) ?? null,
    variant_id: variantIdsByItemId.get(item.id) ?? null,
  }))
}

export const withProductListItems = async (
  container: MedusaContainer,
  lists: ProductListRecord[]
) => {
  const listIds = lists.map((list) => list.id)

  if (!listIds.length) {
    return lists
  }

  const service = getProductListService(container)
  const items = await service.listProductListItems(
    {
      list_id: { $in: listIds },
    },
    {
      order: { list_id: "ASC", sort_order: "ASC", created_at: "ASC" },
      take: listIds.length * INLINE_PRODUCT_LIST_ITEMS_LIMIT,
    }
  )
  const enrichedItems = await withProductListItemSelections(container, items)
  const itemsByListId = new Map<string, ProductListItemRecord[]>()

  for (const item of enrichedItems) {
    const listItems = itemsByListId.get(item.list_id) ?? []

    if (listItems.length < INLINE_PRODUCT_LIST_ITEMS_LIMIT) {
      listItems.push(item)
      itemsByListId.set(item.list_id, listItems)
    }
  }

  return lists.map((list) => ({
    ...list,
    items: itemsByListId.get(list.id) ?? [],
  }))
}

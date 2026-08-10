import type { MedusaContainer, Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { ProductListItemProductLink } from "../../../links/product-list-item-product"
import { ProductListItemVariantLink } from "../../../links/product-list-item-variant"
import { PRODUCT_LIST_MODULE } from "../../../modules/product-list/constants"
import { parseProductListMetadata } from "../../../modules/product-list/schemas"
import type { ProductListMetadata } from "../../../modules/product-list/schemas"
import type ProductListModuleService from "../../../modules/product-list/service"
import {
  toProductListItemProductLinks,
  toProductListItemVariantLinks,
} from "../../../utils/product-list-links"

export const INLINE_PRODUCT_LIST_ITEMS_LIMIT = 100

export interface ProductListRecord {
  id: string
  title: string
  handle: string
  type: string
  access_type?: string
  description?: string | null
  metadata?: unknown
  items?: ProductListItemRecord[]
  created_at?: string | Date
  updated_at?: string | Date
}

export interface ProductListItemRecord {
  id: string
  product_id?: string | null
  variant_id?: string | null
  quantity: number
  note?: string | null
  sort_order: number
  metadata?: unknown
  list_id: string
  created_at?: string | Date
  updated_at?: string | Date
}

type ProductListTimestamp = string | Date | undefined

export interface ProductListItemResponse {
  created_at: ProductListTimestamp
  id: string
  list_id: string
  metadata: ProductListMetadata | null
  note: string | null
  product_id: string | null
  quantity: number
  sort_order: number
  updated_at: ProductListTimestamp
  variant_id: string | null
}

export interface ProductListResponse {
  access_type: string
  created_at: ProductListTimestamp
  description: string | null
  handle: string
  id: string
  items: ProductListItemResponse[]
  metadata: ProductListMetadata | null
  title: string
  type: string
  updated_at: ProductListTimestamp
}

export const toProductListItemResponse = (
  item: ProductListItemRecord,
): ProductListItemResponse => ({
  created_at: item.created_at,
  id: item.id,
  list_id: item.list_id,
  metadata: parseProductListMetadata(item.metadata),
  note: item.note ?? null,
  product_id: item.product_id ?? null,
  quantity: item.quantity,
  sort_order: item.sort_order,
  updated_at: item.updated_at,
  variant_id: item.variant_id ?? null,
})

export const toProductListResponse = (
  list: ProductListRecord,
): ProductListResponse => ({
  access_type: list.access_type ?? "private",
  created_at: list.created_at,
  description: list.description ?? null,
  handle: list.handle,
  id: list.id,
  items: list.items?.map(toProductListItemResponse) ?? [],
  metadata: parseProductListMetadata(list.metadata),
  title: list.title,
  type: list.type,
  updated_at: list.updated_at,
})

export const withProductListItemSelections = async (
  container: MedusaContainer,
  items: ProductListItemRecord[],
) => {
  const itemIds = items.map((item) => item.id)

  if (!itemIds.length) {
    return items
  }

  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const [{ data: productLinks }, { data: variantLinks }] = await Promise.all([
    query.graph({
      entity: ProductListItemProductLink.entryPoint,
      fields: ["product_list_item_id", "product_id"],
      filters: {
        product_list_item_id: itemIds,
      },
      pagination: {
        take: itemIds.length,
      },
    }),
    query.graph({
      entity: ProductListItemVariantLink.entryPoint,
      fields: ["product_list_item_id", "product_variant_id"],
      filters: {
        product_list_item_id: itemIds,
      },
      pagination: {
        take: itemIds.length,
      },
    }),
  ])
  const productIdsByItemId = new Map(
    toProductListItemProductLinks(productLinks).flatMap((link) => {
      if (
        typeof link.product_list_item_id !== "string" ||
        link.product_list_item_id.length === 0 ||
        typeof link.product_id !== "string" ||
        link.product_id.length === 0
      ) {
        return []
      }

      return [[link.product_list_item_id, link.product_id]]
    }),
  )
  const variantIdsByItemId = new Map(
    toProductListItemVariantLinks(variantLinks).flatMap((link) => {
      if (
        typeof link.product_list_item_id !== "string" ||
        link.product_list_item_id.length === 0 ||
        typeof link.product_variant_id !== "string" ||
        link.product_variant_id.length === 0
      ) {
        return []
      }

      return [[link.product_list_item_id, link.product_variant_id]]
    }),
  )

  return items.map((item) => ({
    ...item,
    product_id: productIdsByItemId.get(item.id) ?? null,
    variant_id: variantIdsByItemId.get(item.id) ?? null,
  }))
}

export const withProductListItems = async (
  container: MedusaContainer,
  lists: ProductListRecord[],
  options: { previewLimit?: number } = {},
) => {
  const listIds = lists.map((list) => list.id)

  if (!listIds.length) {
    return lists
  }

  const service =
    container.resolve<ProductListModuleService>(PRODUCT_LIST_MODULE)
  const config = {
    order: { created_at: "ASC", list_id: "ASC", sort_order: "ASC" },
  }

  let items: ProductListItemRecord[]
  if (options.previewLimit === undefined) {
    items = await service.listProductListItems(
      { list_id: { $in: listIds } },
      config,
    )
  } else {
    const itemBatches = await Promise.all(
      listIds.map(
        async (listId) =>
          await service.listProductListItems(
            { list_id: listId },
            { ...config, take: options.previewLimit },
          ),
      ),
    )
    items = itemBatches.flat()
  }
  const enrichedItems = await withProductListItemSelections(container, items)
  const itemsByListId = new Map<string, ProductListItemRecord[]>()

  for (const item of enrichedItems) {
    const listItems = itemsByListId.get(item.list_id) ?? []

    if (
      options.previewLimit === undefined ||
      listItems.length < options.previewLimit
    ) {
      listItems.push(item)
      itemsByListId.set(item.list_id, listItems)
    }
  }

  return lists.map((list) => ({
    ...list,
    items: itemsByListId.get(list.id) ?? [],
  }))
}

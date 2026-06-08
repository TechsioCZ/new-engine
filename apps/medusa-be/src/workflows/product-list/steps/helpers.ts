import type { MedusaContainer, Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { ProductListItemProductLink } from "../../../links/product-list-item-product"
import { ProductListItemVariantLink } from "../../../links/product-list-item-variant"
import {
  PRODUCT_LIST_MODULE,
  PRODUCT_LIST_TYPES,
  type ProductListType,
} from "../../../modules/product-list/constants"
import type ProductListModuleService from "../../../modules/product-list/service"
import { isObjectRecord } from "../../../utils/guards"
import {
  listCustomerProductListIds,
  toProductListItemProductLinks,
  toProductListItemVariantLinks,
} from "../../../utils/product-list-links"

type ProductRecord = {
  id: string
  status?: string
}

type ProductVariantRecord = {
  id: string
  product?: {
    id?: string
  }
}

const PRODUCT_LIST_ITEM_LOOKUP_CHUNK_SIZE = 1000

const isProductRecord = (value: unknown): value is ProductRecord =>
  isObjectRecord(value) &&
  typeof value.id === "string" &&
  (value.status === undefined || typeof value.status === "string")

const isProductVariantRecord = (
  value: unknown
): value is ProductVariantRecord =>
  isObjectRecord(value) &&
  typeof value.id === "string" &&
  (value.product === undefined ||
    (isObjectRecord(value.product) &&
      (value.product.id === undefined || typeof value.product.id === "string")))

export const getProductListType = (type: string): ProductListType => {
  if (PRODUCT_LIST_TYPES.includes(type as ProductListType)) {
    return type as ProductListType
  }

  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    `Unsupported product list type: ${type}`
  )
}

export const findCustomerFavoriteProductList = async (
  container: MedusaContainer,
  customerId: string
) => {
  const productListIds = await listCustomerProductListIds(container, customerId)

  if (!productListIds.length) {
    return null
  }

  const service =
    container.resolve<ProductListModuleService>(PRODUCT_LIST_MODULE)
  const [favorite] = await service.listProductLists(
    {
      id: { $in: productListIds },
      type: "favorite",
    },
    {
      take: 1,
    }
  )

  return favorite ?? null
}

export const findCustomerCustomProductListByHandle = async (
  container: MedusaContainer,
  customerId: string,
  handle: string
) => {
  const productListIds = await listCustomerProductListIds(container, customerId)

  if (!productListIds.length) {
    return null
  }

  const service =
    container.resolve<ProductListModuleService>(PRODUCT_LIST_MODULE)
  const [customList] = await service.listProductLists(
    {
      handle,
      id: { $in: productListIds },
      type: "custom",
    },
    {
      take: 1,
    }
  )

  return customList ?? null
}

export const assertProductSelectionExists = async (
  container: MedusaContainer,
  productId: string,
  variantId?: string
) => {
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data: productData } = await query.graph({
    entity: "product",
    fields: ["id", "status"],
    filters: {
      id: productId,
      status: "published",
    },
    pagination: {
      take: 1,
    },
  })
  const product = Array.isArray(productData)
    ? productData.find(isProductRecord)
    : null

  if (!product) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product ${productId} was not found`
    )
  }

  if (!variantId) {
    return
  }

  const { data: variantData } = await query.graph({
    entity: "product_variant",
    fields: ["id", "product.id"],
    filters: {
      id: variantId,
    },
    pagination: {
      take: 1,
    },
  })
  const variant = Array.isArray(variantData)
    ? variantData.find(isProductVariantRecord)
    : null

  if (!variant || variant.product?.id !== productId) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product variant ${variantId} was not found`
    )
  }
}

export const findProductListItemForSelection = async (
  container: MedusaContainer,
  listId: string,
  productId: string,
  variantId?: string
) => {
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const service =
    container.resolve<ProductListModuleService>(PRODUCT_LIST_MODULE)
  let skip = 0

  while (true) {
    const listItems = await service.listProductListItems(
      {
        list_id: listId,
      },
      {
        select: ["id"],
        skip,
        take: PRODUCT_LIST_ITEM_LOOKUP_CHUNK_SIZE,
      }
    )
    const listItemIds = listItems.map((item) => item.id)

    if (!listItemIds.length) {
      return null
    }

    const { data: productLinks } = await query.graph({
      entity: ProductListItemProductLink.entryPoint,
      fields: ["product_list_item_id"],
      filters: {
        product_id: productId,
        product_list_item_id: { $in: listItemIds },
      },
      pagination: {
        take: Math.min(listItemIds.length, PRODUCT_LIST_ITEM_LOOKUP_CHUNK_SIZE),
      },
    })
    let itemIds = toProductListItemProductLinks(productLinks).flatMap((link) =>
      link.product_list_item_id ? [link.product_list_item_id] : []
    )

    if (itemIds.length) {
      const { data: variantLinks } = await query.graph({
        entity: ProductListItemVariantLink.entryPoint,
        fields: ["product_list_item_id"],
        filters: {
          product_list_item_id: { $in: itemIds },
          ...(variantId ? { product_variant_id: variantId } : {}),
        },
        pagination: {
          take: Math.min(itemIds.length, PRODUCT_LIST_ITEM_LOOKUP_CHUNK_SIZE),
        },
      })
      const variantItemIds = new Set(
        toProductListItemVariantLinks(variantLinks).flatMap((link) =>
          link.product_list_item_id ? [link.product_list_item_id] : []
        )
      )

      itemIds = itemIds.filter((itemId) =>
        variantId ? variantItemIds.has(itemId) : !variantItemIds.has(itemId)
      )
    }

    if (itemIds.length) {
      const [item] = await service.listProductListItems(
        {
          id: { $in: itemIds },
          list_id: listId,
        },
        {
          take: 1,
        }
      )

      return item ?? null
    }

    if (listItems.length < PRODUCT_LIST_ITEM_LOOKUP_CHUNK_SIZE) {
      return null
    }

    skip += PRODUCT_LIST_ITEM_LOOKUP_CHUNK_SIZE
  }
}

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
} from "../../../modules/product-list/constants"
import type { ProductListType } from "../../../modules/product-list/constants"
import type ProductListModuleService from "../../../modules/product-list/service"
import { isObjectRecord } from "../../../utils/guards"
import {
  listCustomerProductListIds,
  toProductListItemProductLinks,
  toProductListItemVariantLinks,
} from "../../../utils/product-list-links"
import type { ProductListItemRecord } from "../types"

interface ProductRecord {
  id: string
  status?: string
}

interface ProductVariantRecord {
  id: string
  product?: {
    id?: string
  }
}

const PRODUCT_LIST_ITEM_LOOKUP_CHUNK_SIZE = 1000
const PRODUCT_LIST_ITEM_LOOKUP_MAX_PAGES = 1000

const isProductRecord = (value: unknown): value is ProductRecord =>
  isObjectRecord(value) &&
  typeof value["id"] === "string" &&
  (value["status"] === undefined || typeof value["status"] === "string")

const isProductVariantRecord = (
  value: unknown,
): value is ProductVariantRecord => {
  if (!isObjectRecord(value) || typeof value["id"] !== "string") {
    return false
  }

  const { product } = value
  if (product === undefined) {
    return true
  }

  return (
    isObjectRecord(product) &&
    (product["id"] === undefined || typeof product["id"] === "string")
  )
}

const isProductListType = (type: string): type is ProductListType =>
  PRODUCT_LIST_TYPES.some((candidate) => candidate === type)

const getQueryData = (result: unknown, context: string): unknown[] => {
  if (!isObjectRecord(result) || !Array.isArray(result["data"])) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `${context} query returned invalid data`,
    )
  }

  return result["data"]
}

export const getProductListType = (type: string): ProductListType => {
  if (isProductListType(type)) {
    return type
  }

  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    `Unsupported product list type: ${type}`,
  )
}

export const findCustomerFavoriteProductList = async (
  container: MedusaContainer,
  customerId: string,
) => {
  const productListIds = await listCustomerProductListIds(container, customerId)

  if (productListIds.length === 0) {
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
    },
  )

  return favorite ?? null
}

export const findCustomerCustomProductListByHandle = async (
  container: MedusaContainer,
  customerId: string,
  handle: string,
) => {
  const productListIds = await listCustomerProductListIds(container, customerId)

  if (productListIds.length === 0) {
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
    },
  )

  return customList ?? null
}

export const assertProductSelectionExists = async (
  container: MedusaContainer,
  productId: string,
  variantId?: string,
) => {
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const productResult: unknown = await query.graph({
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
  const product = getQueryData(productResult, "Product").find(isProductRecord)

  if (product === undefined) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product ${productId} was not found`,
    )
  }

  if (variantId === undefined || variantId.length === 0) {
    return
  }

  const variantResult: unknown = await query.graph({
    entity: "product_variant",
    fields: ["id", "product.id"],
    filters: {
      id: variantId,
    },
    pagination: {
      take: 1,
    },
  })
  const variant = getQueryData(variantResult, "Product variant").find(
    isProductVariantRecord,
  )

  if (variant === undefined || variant.product?.id !== productId) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product variant ${variantId} was not found`,
    )
  }
}

const findProductListItemForSelectionPage = async ({
  listId,
  productId,
  query,
  remainingPages,
  service,
  skip,
  variantId,
}: {
  listId: string
  productId: string
  query: Query
  remainingPages: number
  service: ProductListModuleService
  skip: number
  variantId?: string
}): Promise<ProductListItemRecord | null> => {
  if (remainingPages === 0) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Product list ${listId} exceeded the bounded item lookup limit`,
    )
  }

  const listItems = await service.listProductListItems(
    {
      list_id: listId,
    },
    {
      select: ["id"],
      skip,
      take: PRODUCT_LIST_ITEM_LOOKUP_CHUNK_SIZE,
    },
  )
  const listItemIds = listItems.map((item) => item.id)
  if (listItemIds.length === 0) {
    return null
  }

  const productLinksResult: unknown = await query.graph({
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
  let itemIds = toProductListItemProductLinks(
    getQueryData(productLinksResult, "Product-list item product link"),
  ).flatMap((link) =>
    link.product_list_item_id === undefined ||
    link.product_list_item_id.length === 0
      ? []
      : [link.product_list_item_id],
  )

  if (itemIds.length > 0) {
    const variantLinksResult: unknown = await query.graph({
      entity: ProductListItemVariantLink.entryPoint,
      fields: ["product_list_item_id"],
      filters: {
        product_list_item_id: { $in: itemIds },
        ...(variantId !== undefined && variantId.length > 0
          ? { product_variant_id: variantId }
          : {}),
      },
      pagination: {
        take: Math.min(itemIds.length, PRODUCT_LIST_ITEM_LOOKUP_CHUNK_SIZE),
      },
    })
    const variantItemIds = new Set(
      toProductListItemVariantLinks(
        getQueryData(variantLinksResult, "Product-list item variant link"),
      ).flatMap((link) =>
        link.product_list_item_id === undefined ||
        link.product_list_item_id.length === 0
          ? []
          : [link.product_list_item_id],
      ),
    )

    itemIds = itemIds.filter((itemId) =>
      variantId !== undefined && variantId.length > 0
        ? variantItemIds.has(itemId)
        : !variantItemIds.has(itemId),
    )
  }

  if (itemIds.length > 0) {
    const [item] = await service.listProductListItems(
      {
        id: { $in: itemIds },
        list_id: listId,
      },
      {
        take: 1,
      },
    )

    return item ?? null
  }

  if (listItems.length < PRODUCT_LIST_ITEM_LOOKUP_CHUNK_SIZE) {
    return null
  }

  return await findProductListItemForSelectionPage({
    listId,
    productId,
    query,
    remainingPages: remainingPages - 1,
    service,
    skip: skip + PRODUCT_LIST_ITEM_LOOKUP_CHUNK_SIZE,
    ...(variantId === undefined ? {} : { variantId }),
  })
}

export const findProductListItemForSelection = async (
  container: MedusaContainer,
  listId: string,
  productId: string,
  variantId?: string,
) => {
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const service =
    container.resolve<ProductListModuleService>(PRODUCT_LIST_MODULE)

  return await findProductListItemForSelectionPage({
    listId,
    productId,
    query,
    remainingPages: PRODUCT_LIST_ITEM_LOOKUP_MAX_PAGES,
    service,
    skip: 0,
    ...(variantId === undefined ? {} : { variantId }),
  })
}

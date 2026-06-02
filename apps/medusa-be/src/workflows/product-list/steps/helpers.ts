import type { Link } from "@medusajs/framework/modules-sdk"
import type { MedusaContainer, Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { CustomerProductListLink } from "../../../links/customer-product-list"
import { ProductListItemProductLink } from "../../../links/product-list-item-product"
import { ProductListItemVariantLink } from "../../../links/product-list-item-variant"
import {
  PRODUCT_LIST_MODULE,
  PRODUCT_LIST_TYPES,
  type ProductListType,
} from "../../../modules/product-list/constants"
import type {
  CreateCustomProductListDTO,
  CreateFavoriteProductListDTO,
  CreateProductListItemDTO,
} from "../../../modules/product-list/service"
import type { ProductListItemRecord, ProductListRecord } from "../types"

type CustomerProductListLinkRecord = {
  customer_id?: string
  product_list_id?: string
}

type ProductListItemProductLinkRecord = {
  product_id?: string
  product_list_item_id?: string
}

type ProductListItemVariantLinkRecord = {
  product_variant_id?: string
  product_list_item_id?: string
}

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
const CUSTOMER_PRODUCT_LIST_LINK_LOOKUP_CHUNK_SIZE = 1000

const hasRecordShape = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const isCustomerProductListLinkRecord = (
  value: unknown
): value is CustomerProductListLinkRecord =>
  hasRecordShape(value) &&
  (value.customer_id === undefined || typeof value.customer_id === "string") &&
  (value.product_list_id === undefined ||
    typeof value.product_list_id === "string")

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

const toCustomerProductListLinks = (value: unknown) =>
  Array.isArray(value) ? value.filter(isCustomerProductListLinkRecord) : []

const toProductListItemProductLinks = (value: unknown) =>
  Array.isArray(value) ? value.filter(isProductListItemProductLinkRecord) : []

const toProductListItemVariantLinks = (value: unknown) =>
  Array.isArray(value) ? value.filter(isProductListItemVariantLinkRecord) : []

const isProductRecord = (value: unknown): value is ProductRecord =>
  hasRecordShape(value) &&
  typeof value.id === "string" &&
  (value.status === undefined || typeof value.status === "string")

const isProductVariantRecord = (
  value: unknown
): value is ProductVariantRecord =>
  hasRecordShape(value) &&
  typeof value.id === "string" &&
  (value.product === undefined ||
    (hasRecordShape(value.product) &&
      (value.product.id === undefined || typeof value.product.id === "string")))

export type ProductListService = {
  assertListSupportsQuantityIncrement: (listId: string) => Promise<unknown>
  createCustomProductList: (
    input: CreateCustomProductListDTO
  ) => Promise<ProductListRecord>
  createFavoriteProductList: (
    input?: CreateFavoriteProductListDTO
  ) => Promise<ProductListRecord>
  createProductListItemForList: (
    input: CreateProductListItemDTO
  ) => Promise<ProductListItemRecord>
  deleteProductListItems: (ids: string | string[]) => Promise<void>
  deleteProductLists: (ids: string | string[]) => Promise<void>
  incrementProductListItemQuantity: (
    itemId: string,
    quantityToAdd?: number
  ) => Promise<ProductListItemRecord>
  listAndCountProductLists: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<[ProductListRecord[], number]>
  listProductListItems: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<ProductListItemRecord[]>
  listProductLists: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<ProductListRecord[]>
  retrieveProductList: (
    id: string,
    config?: Record<string, unknown>
  ) => Promise<ProductListRecord>
  retrieveProductListItem: (
    id: string,
    config?: Record<string, unknown>
  ) => Promise<ProductListItemRecord>
  updateProductListItems: (input: {
    id: string
    quantity: number
  }) => Promise<ProductListItemRecord>
}

export const getProductListService = (container: MedusaContainer) =>
  container.resolve<ProductListService>(PRODUCT_LIST_MODULE)

export const getProductListType = (type: string): ProductListType => {
  if (PRODUCT_LIST_TYPES.includes(type as ProductListType)) {
    return type as ProductListType
  }

  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    `Unsupported product list type: ${type}`
  )
}

export const listCustomerProductListIds = async (
  container: MedusaContainer,
  customerId: string
) => {
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const productListIds: string[] = []
  let skip = 0

  while (true) {
    const { data } = await query.graph({
      entity: CustomerProductListLink.entryPoint,
      fields: ["product_list_id"],
      filters: {
        customer_id: customerId,
      },
      pagination: {
        skip,
        take: CUSTOMER_PRODUCT_LIST_LINK_LOOKUP_CHUNK_SIZE,
      },
    })

    const links = toCustomerProductListLinks(data)
    productListIds.push(
      ...links.flatMap((link) =>
        link.product_list_id ? [link.product_list_id] : []
      )
    )

    if (links.length < CUSTOMER_PRODUCT_LIST_LINK_LOOKUP_CHUNK_SIZE) {
      return productListIds
    }

    skip += CUSTOMER_PRODUCT_LIST_LINK_LOOKUP_CHUNK_SIZE
  }
}

export const findCustomerFavoriteProductList = async (
  container: MedusaContainer,
  customerId: string
) => {
  const productListIds = await listCustomerProductListIds(container, customerId)

  if (!productListIds.length) {
    return null
  }

  const [favorite] = await getProductListService(container).listProductLists(
    {
      id: { $in: productListIds },
      type: "favorite",
    },
    {
      relations: ["items"],
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

  const [customList] = await getProductListService(container).listProductLists(
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

export const assertCustomerOwnsProductList = async (
  container: MedusaContainer,
  customerId: string,
  listId: string
) => {
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: CustomerProductListLink.entryPoint,
    fields: ["product_list_id"],
    filters: {
      customer_id: customerId,
      product_list_id: listId,
    },
    pagination: {
      take: 1,
    },
  })
  const [link] = toCustomerProductListLinks(data)

  if (!link?.product_list_id) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product list ${listId} was not found`
    )
  }
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
  const service = getProductListService(container)
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

export const createCustomerProductListLink = async (
  container: MedusaContainer,
  customerId: string,
  listId: string
) => {
  const link = container.resolve<Link>(ContainerRegistrationKeys.LINK)

  await link.create({
    [Modules.CUSTOMER]: {
      customer_id: customerId,
    },
    [PRODUCT_LIST_MODULE]: {
      product_list_id: listId,
    },
  })
}

export const dismissCustomerProductListLink = async (
  container: MedusaContainer,
  customerId: string,
  listId: string
) => {
  const link = container.resolve<Link>(ContainerRegistrationKeys.LINK)

  await link.dismiss({
    [Modules.CUSTOMER]: {
      customer_id: customerId,
    },
    [PRODUCT_LIST_MODULE]: {
      product_list_id: listId,
    },
  })
}

export const createProductListItemProductLinks = async (
  container: MedusaContainer,
  itemId: string,
  productId: string,
  variantId?: string
) => {
  const link = container.resolve<Link>(ContainerRegistrationKeys.LINK)
  const links: Record<string, Record<string, string>>[] = [
    {
      [PRODUCT_LIST_MODULE]: {
        product_list_item_id: itemId,
      },
      [Modules.PRODUCT]: {
        product_id: productId,
      },
    },
  ]

  if (variantId) {
    links.push({
      [PRODUCT_LIST_MODULE]: {
        product_list_item_id: itemId,
      },
      [Modules.PRODUCT]: {
        product_variant_id: variantId,
      },
    })
  }

  await link.create(links)
}

export const dismissProductListItemProductLinks = async (
  container: MedusaContainer,
  itemId: string,
  productId: string,
  variantId?: string
) => {
  const link = container.resolve<Link>(ContainerRegistrationKeys.LINK)
  const links: Record<string, Record<string, string>>[] = [
    {
      [PRODUCT_LIST_MODULE]: {
        product_list_item_id: itemId,
      },
      [Modules.PRODUCT]: {
        product_id: productId,
      },
    },
  ]

  if (variantId) {
    links.push({
      [PRODUCT_LIST_MODULE]: {
        product_list_item_id: itemId,
      },
      [Modules.PRODUCT]: {
        product_variant_id: variantId,
      },
    })
  }

  await link.dismiss(links)
}
